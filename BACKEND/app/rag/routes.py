from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from .service import (
    save_upload_file,
    ingest_file_to_kb,
    list_kb_documents,
    clear_kb,
    delete_kb_by_source,
)

router = APIRouter(prefix="/kb", tags=["Knowledge Base (RAG)"])


@router.post("/upload")
async def upload_to_kb(
    file: UploadFile = File(...),
    agent_id: int | None = Form(default=None),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Arquivo sem nome.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")

    path = save_upload_file(content, file.filename)
    result = ingest_file_to_kb(path, file.filename, agent_id=agent_id)
    return {"ok": True, **result}


@router.get("/list")
def list_kb(
    agent_id: int | None = Query(default=None),
    limit: int = Query(default=2000, ge=1, le=20000),
):
    docs = list_kb_documents(agent_id=agent_id, limit=limit)
    return {"agent_id": agent_id, "count": len(docs), "documents": docs}


@router.delete("/clear")
def clear_kb_route(
    agent_id: int | None = Query(default=None),
):
    result = clear_kb(agent_id=agent_id)
    return {"ok": True, **result}


@router.delete("/delete")
def delete_kb_source_route(
    agent_id: int | None = Query(default=None),
    source: str = Query(..., min_length=1),
):
    result = delete_kb_by_source(agent_id=agent_id, source=source)
    return {"ok": True, **result}