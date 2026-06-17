import os
import shutil
from pathlib import Path
from typing import List, Tuple

from fastapi import UploadFile
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    try:
        from openai import OpenAI
        return OpenAI(api_key=api_key)
    except Exception:
        return None


def save_upload_file(upload_file: UploadFile, destination: str) -> str:
    os.makedirs(os.path.dirname(destination), exist_ok=True)

    with open(destination, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)

    return destination


def build_upload_path(filename: str) -> str:
    safe_name = filename.replace("/", "_").replace("\\", "_")
    return str(UPLOAD_DIR / safe_name)


def ingest_file_to_kb(*args, **kwargs):
    """
    Compatibilidade com imports antigos.
    """
    return {
        "success": True,
        "message": "Ingest fake executado.",
    }


def index_kb(document_id: int | None = None, kb_id: int | None = None) -> dict:
    from app.database import SessionLocal
    from app.models import KnowledgeBaseDocument, DocumentChunk
    from app.rag.utils import chunk_text, extract_text_from_pdf
    from app.llm import embed_texts

    with SessionLocal() as db:
        if document_id is not None:
            docs = db.query(KnowledgeBaseDocument).filter(KnowledgeBaseDocument.id == document_id).all()
        elif kb_id is not None:
            docs = db.query(KnowledgeBaseDocument).filter(KnowledgeBaseDocument.kb_id == kb_id).all()
        else:
            return {"success": False, "message": "Nenhum ID de KB ou Documento fornecido."}

        indexed_count = 0
        for doc in docs:
            # Apagar chunks anteriores do documento para reindexar de forma limpa
            db.query(DocumentChunk).filter(DocumentChunk.doc_id == doc.id).delete()
            db.commit()

            # Extrair texto
            text_content = ""
            filename_lower = doc.filename.lower()
            
            destination = build_upload_path(doc.filename)
            
            if not os.path.exists(destination):
                text_content = doc.content or ""
            else:
                if filename_lower.endswith(".pdf"):
                    try:
                        text_content = extract_text_from_pdf(destination)
                    except Exception as e:
                        print(f"Erro ao extrair PDF {doc.filename}: {e}")
                        text_content = doc.content or ""
                else:
                    try:
                        with open(destination, "r", encoding="utf-8", errors="ignore") as f:
                            text_content = f.read()
                    except Exception as e:
                        print(f"Erro ao ler arquivo {doc.filename}: {e}")
                        text_content = doc.content or ""

            if text_content:
                doc.content = text_content

            chunks = chunk_text(text_content)
            if not chunks:
                doc.status = "failed"
                db.commit()
                continue

            try:
                embeddings = embed_texts(chunks)
            except Exception as e:
                print(f"Erro ao gerar embeddings para {doc.filename}: {e}")
                doc.status = "failed"
                db.commit()
                continue

            for chunk_text_str, emb in zip(chunks, embeddings):
                new_chunk = DocumentChunk(
                    kb_id=doc.kb_id,
                    doc_id=doc.id,
                    text=chunk_text_str,
                    embedding=emb,
                )
                db.add(new_chunk)
            
            try:
                from app.rag.vectorstore import upsert_chunks
                upsert_chunks(
                    kb_id=doc.kb_id,
                    doc_id=doc.id,
                    title=doc.filename,
                    chunks=chunks,
                    embeddings=embeddings
                )
            except Exception as q_err:
                print(f"Qdrant desativado ou fora do ar (usando fallback do banco): {q_err}")

            doc.status = "indexed"
            db.commit()
            indexed_count += 1

        return {
            "success": True,
            "indexed_count": indexed_count,
            "document_id": document_id,
            "kb_id": kb_id,
            "message": f"Indexação concluída com sucesso: {indexed_count} documentos processados.",
        }


def retrieve_context(query: str, agent_id: int | None = None, top_k: int = 4) -> str:
    context, _ = retrieve_context_with_sources(query=query, agent_id=agent_id, top_k=top_k)
    return context


def retrieve_context_with_sources(
    query: str,
    agent_id: int | None = None,
    kb_ids: List[int] | None = None,
    top_k: int = 4,
) -> Tuple[str, List[dict]]:
    from app.database import SessionLocal
    from app.models import Agent, DocumentChunk, KnowledgeBaseDocument
    from app.llm import embed_texts
    import math

    if not query or not query.strip():
        return "", []

    with SessionLocal() as db:
        actual_kb_ids = list(kb_ids) if kb_ids is not None else []
        if agent_id is not None:
            agent = db.query(Agent).filter(Agent.id == agent_id).first()
            if agent and agent.flow:
                nodes = agent.flow.get("nodes", [])
                for node in nodes:
                    if node.get("type") == "rag" or node.get("data", {}).get("kind") == "rag":
                        kb_id_val = node.get("data", {}).get("config", {}).get("kbId")
                        if kb_id_val:
                            try:
                                actual_kb_ids.append(int(kb_id_val))
                            except ValueError:
                                pass

        if not actual_kb_ids:
            return "", []

        try:
            query_embs = embed_texts([query])
            if not query_embs:
                return "", []
            query_vector = query_embs[0]
        except Exception as e:
            print(f"Erro ao gerar embedding da query: {e}")
            return "", []

        chunks_found = []
        qdrant_success = False
        try:
            from app.rag.vectorstore import search_chunks
            for kb_id in actual_kb_ids:
                hits = search_chunks(kb_id=kb_id, query_embedding=query_vector, top_k=top_k)
                for hit in hits:
                    payload = hit.payload
                    chunks_found.append({
                        "text": payload.get("text", ""),
                        "filename": payload.get("title", f"KB {kb_id}"),
                        "score": hit.score
                    })
            if chunks_found:
                qdrant_success = True
        except Exception as q_err:
            print(f"Qdrant desativado ou fora do ar (usando fallback do banco): {q_err}")

        if not qdrant_success:
            db_chunks = db.query(DocumentChunk).filter(DocumentChunk.kb_id.in_(actual_kb_ids)).all()
            
            doc_map = {}
            docs = db.query(KnowledgeBaseDocument).filter(KnowledgeBaseDocument.kb_id.in_(actual_kb_ids)).all()
            for doc in docs:
                doc_map[doc.id] = doc.filename

            scored_chunks = []
            for chunk in db_chunks:
                chunk_vector = chunk.embedding
                if not chunk_vector:
                    continue
                
                dot = sum(a*b for a, b in zip(query_vector, chunk_vector))
                mag1 = math.sqrt(sum(a*a for a in query_vector))
                mag2 = math.sqrt(sum(b*b for b in chunk_vector))
                similarity = dot / (mag1 * mag2) if mag1 and mag2 else 0.0

                scored_chunks.append({
                    "text": chunk.text,
                    "filename": doc_map.get(chunk.doc_id, f"Documento #{chunk.doc_id}"),
                    "score": similarity
                })

            scored_chunks.sort(key=lambda x: x["score"], reverse=True)
            chunks_found = scored_chunks[:top_k]

        context_parts = []
        sources = []
        for i, chunk in enumerate(chunks_found):
            filename = chunk["filename"]
            text = chunk["text"]
            context_parts.append(f"--- Trecho {i+1} de {filename} ---\n{text}\n")
            sources.append({
                "filename": filename,
                "text": text[:200] + "..." if len(text) > 200 else text
            })

        context = "\n".join(context_parts)
        return context, sources


def generate_embeddings(texts: List[str]) -> List[List[float]]:
    from app.llm import embed_texts
    return embed_texts(texts)