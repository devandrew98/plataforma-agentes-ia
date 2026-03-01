import os
import uuid
from typing import Optional, List, Dict, Tuple

from .utils import extract_text_from_pdf, chunk_text
from .vectorstore import get_collection
from ..llm import embed_texts

UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def save_upload_file(file_bytes: bytes, filename: str) -> str:
    safe_name = filename.replace("/", "_").replace("\\", "_")
    path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}__{safe_name}")
    with open(path, "wb") as f:
        f.write(file_bytes)
    return path


def _collection_name_for_agent(agent_id: Optional[int]) -> str:
    if agent_id is None:
        return "kb_agent_global"
    return f"kb_agent_{agent_id}"


def ingest_file_to_kb(
    file_path: str,
    original_filename: str,
    agent_id: Optional[int] = None,
) -> dict:
    ext = (original_filename.split(".")[-1] or "").lower()

    if ext == "pdf":
        text = extract_text_from_pdf(file_path)
    else:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()

    chunks = chunk_text(text, chunk_size=900, overlap=200)
    if not chunks:
        return {"inserted": 0, "message": "Arquivo sem texto extraível."}

    vectors = embed_texts(chunks)

    col = get_collection(_collection_name_for_agent(agent_id))

    ids = []
    metadatas = []
    for i in range(len(chunks)):
        ids.append(str(uuid.uuid4()))
        metadatas.append({
            "source": original_filename,
            "chunk_index": i,
            "agent_id": agent_id if agent_id is not None else -1,
        })

    col.add(
        ids=ids,
        documents=chunks,
        embeddings=vectors,
        metadatas=metadatas,
    )

    return {"inserted": len(chunks), "source": original_filename, "agent_id": agent_id}


def retrieve_context_with_sources(
    query: str,
    agent_id: Optional[int] = None,
    top_k: int = 4,
) -> Tuple[str, List[Dict]]:
    col = get_collection(_collection_name_for_agent(agent_id))

    q_emb = embed_texts([query])[0]

    res = col.query(
        query_embeddings=[q_emb],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )

    docs = res.get("documents", [[]])[0]
    metas = res.get("metadatas", [[]])[0]
    dists = res.get("distances", [[]])[0]

    if not docs:
        return "", []

    context_parts = []
    sources: List[Dict] = []

    for d, m, dist in zip(docs, metas, dists):
        src = (m or {}).get("source", "desconhecido")
        idx = (m or {}).get("chunk_index", "?")

        context_parts.append(f"[Fonte: {src} | trecho {idx}]\n{d}")

        sources.append({
            "source": src,
            "chunk_index": idx,
            "distance": dist,
            "preview": (d[:180] + "...") if len(d) > 180 else d
        })

    context_text = "\n\n---\n\n".join(context_parts)
    return context_text, sources


def retrieve_context(
    query: str,
    agent_id: Optional[int] = None,
    top_k: int = 4,
) -> str:
    context, _sources = retrieve_context_with_sources(query, agent_id=agent_id, top_k=top_k)
    return context


def list_kb_documents(agent_id: Optional[int] = None, limit: int = 2000) -> List[Dict]:
    col = get_collection(_collection_name_for_agent(agent_id))

    data = col.get(include=["metadatas"], limit=limit)
    metas = data.get("metadatas", []) or []

    grouped: Dict[str, Dict] = {}

    for m in metas:
        src = (m or {}).get("source", "desconhecido")
        idx = (m or {}).get("chunk_index", None)

        if src not in grouped:
            grouped[src] = {"source": src, "chunks": 0, "chunk_indexes": []}

        grouped[src]["chunks"] += 1
        if idx is not None:
            grouped[src]["chunk_indexes"].append(idx)

    results = list(grouped.values())
    for r in results:
        r["chunk_indexes"] = sorted(set(r["chunk_indexes"]))

    results.sort(key=lambda x: x["source"])
    return results


def clear_kb(agent_id: Optional[int] = None) -> dict:
    col_name = _collection_name_for_agent(agent_id)
    client = get_collection(col_name)._client  # funcionou aí com você

    try:
        client.delete_collection(name=col_name)
        return {"cleared": True, "collection": col_name}
    except Exception:
        return {"cleared": True, "collection": col_name, "message": "Coleção não existia (já estava vazia)."}


def delete_kb_by_source(agent_id: Optional[int], source: str, limit: int = 20000) -> dict:
    """
    Apaga SOMENTE os chunks que pertencem a um arquivo (source) dentro da KB do agente.
    """
    source = (source or "").strip()
    if not source:
        return {"deleted": 0, "source": source, "agent_id": agent_id, "message": "Informe o parâmetro source."}

    col = get_collection(_collection_name_for_agent(agent_id))

    # pega ids dos registros onde metadata.source == source
    data = col.get(where={"source": source}, include=["metadatas"], limit=limit)
    ids = data.get("ids", []) or []

    if not ids:
        return {"deleted": 0, "source": source, "agent_id": agent_id, "message": "Nenhum registro encontrado para esse source."}

    col.delete(ids=ids)
    return {"deleted": len(ids), "source": source, "agent_id": agent_id}