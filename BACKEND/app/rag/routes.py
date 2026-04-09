from pathlib import Path

from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

from .service import (
    save_upload_file,
    build_upload_path,
    index_kb,
    retrieve_context_with_sources,
)

router = APIRouter(prefix="/kb", tags=["Knowledge Base"])


@router.get("/", response_model=list[schemas.KBOut])
def list_kbs(db: Session = Depends(get_db)):
    return (
        db.query(models.KnowledgeBase)
        .order_by(models.KnowledgeBase.id.desc())
        .all()
    )


@router.post("/", response_model=schemas.KBOut)
def create_kb(payload: schemas.KBCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()

    if not name:
        raise HTTPException(status_code=400, detail="Nome da KB é obrigatório.")

    existing = (
        db.query(models.KnowledgeBase)
        .filter(models.KnowledgeBase.name == name)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Já existe uma KB com esse nome.")

    kb = models.KnowledgeBase(
        name=name,
        description=(payload.description or "").strip(),
    )

    db.add(kb)
    db.commit()
    db.refresh(kb)

    return kb


@router.delete("/{kb_id}")
def delete_kb(kb_id: int, db: Session = Depends(get_db)):
    kb = (
        db.query(models.KnowledgeBase)
        .filter(models.KnowledgeBase.id == kb_id)
        .first()
    )

    if not kb:
        raise HTTPException(status_code=404, detail="KB não encontrada.")

    db.delete(kb)
    db.commit()

    return {"deleted": True, "kb_id": kb_id}


@router.post("/{kb_id}/upload", response_model=schemas.KBDocumentOut)
def upload_document_to_kb(
    kb_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    kb = (
        db.query(models.KnowledgeBase)
        .filter(models.KnowledgeBase.id == kb_id)
        .first()
    )

    if not kb:
        raise HTTPException(status_code=404, detail="KB não encontrada.")

    try:
        destination = build_upload_path(file.filename)
        save_upload_file(file, destination)

        content = ""
        try:
            with open(destination, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception:
            # por enquanto, se não conseguir ler como texto, mantém vazio
            content = ""

        doc = models.KnowledgeBaseDocument(
            kb_id=kb.id,
            filename=file.filename,
            content=content,
            status="uploaded",
        )

        db.add(doc)
        db.commit()
        db.refresh(doc)

        return doc

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao enviar arquivo: {str(e)}")


@router.get("/{kb_id}/documents", response_model=list[schemas.KBDocumentOut])
def list_documents(kb_id: int, db: Session = Depends(get_db)):
    kb = (
        db.query(models.KnowledgeBase)
        .filter(models.KnowledgeBase.id == kb_id)
        .first()
    )

    if not kb:
        raise HTTPException(status_code=404, detail="KB não encontrada.")

    return (
        db.query(models.KnowledgeBaseDocument)
        .filter(models.KnowledgeBaseDocument.kb_id == kb_id)
        .order_by(models.KnowledgeBaseDocument.id.desc())
        .all()
    )


@router.delete("/{kb_id}/documents/{doc_id}")
def delete_document(kb_id: int, doc_id: int, db: Session = Depends(get_db)):
    doc = (
        db.query(models.KnowledgeBaseDocument)
        .filter(
            models.KnowledgeBaseDocument.id == doc_id,
            models.KnowledgeBaseDocument.kb_id == kb_id,
        )
        .first()
    )

    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")

    db.delete(doc)
    db.commit()

    return {"deleted": True, "doc_id": doc_id, "kb_id": kb_id}


@router.post("/{kb_id}/index")
def index_kb_route(kb_id: int, db: Session = Depends(get_db)):
    kb = (
        db.query(models.KnowledgeBase)
        .filter(models.KnowledgeBase.id == kb_id)
        .first()
    )

    if not kb:
        raise HTTPException(status_code=404, detail="KB não encontrada.")

    docs = (
        db.query(models.KnowledgeBaseDocument)
        .filter(models.KnowledgeBaseDocument.kb_id == kb_id)
        .all()
    )

    if not docs:
        raise HTTPException(status_code=400, detail="Nenhum documento para indexar.")

    try:
        result = index_kb(kb_id=kb_id)

        for doc in docs:
            doc.status = "indexed"

        db.commit()

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao indexar KB: {str(e)}")


@router.get("/{kb_id}/search")
def search_kb(kb_id: int, query: str, top_k: int = 4, db: Session = Depends(get_db)):
    kb = (
        db.query(models.KnowledgeBase)
        .filter(models.KnowledgeBase.id == kb_id)
        .first()
    )

    if not kb:
        raise HTTPException(status_code=404, detail="KB não encontrada.")

    try:
        context, sources = retrieve_context_with_sources(
            query=query,
            agent_id=None,
            top_k=top_k,
        )
        return {
            "kb_id": kb_id,
            "query": query,
            "context": context,
            "sources": sources,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar contexto: {str(e)}")