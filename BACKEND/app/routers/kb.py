import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app import schemas, crud, models
from app.auth import get_current_active_user
from app.rag.utils import extract_text_from_pdf
from app.rag.service import index_kb, retrieve_context_with_sources

router = APIRouter(prefix="/kb", tags=["Knowledge Base"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _require_kb(db: Session, kb_id: int, user) -> models.KnowledgeBase:
    """Retorna a KB se ela pertencer ao usuário; senão 404."""
    kb = crud.get_kb(db, kb_id)
    if not kb or kb.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Base de conhecimento não encontrada.")
    return kb


def _require_doc(db: Session, kb_id: int, doc_id: int) -> models.KnowledgeBaseDocument:
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
    return doc


# ---------------------------------------------------------------------------
# KBs
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[schemas.KBOut])
def list_kbs(
    db: Session = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_active_user),
):
    return crud.list_kbs(db, user_id=current_user.id)


@router.post("/", response_model=schemas.KBOut)
def create_kb(
    payload: schemas.KBCreate,
    db: Session = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_active_user),
):
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="O nome da base é obrigatório.")
    return crud.create_kb(db, payload, owner_id=current_user.id)


@router.get("/{kb_id}", response_model=schemas.KBOut)
def get_kb(
    kb_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_active_user),
):
    return _require_kb(db, kb_id, current_user)


@router.delete("/{kb_id}")
def delete_kb(
    kb_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_active_user),
):
    kb = _require_kb(db, kb_id, current_user)
    crud.delete_kb(db, kb)
    return {"deleted": True}


# ---------------------------------------------------------------------------
# Documentos
# ---------------------------------------------------------------------------

@router.get("/{kb_id}/documents", response_model=list[schemas.KBDocumentOut])
def list_documents(
    kb_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_active_user),
):
    _require_kb(db, kb_id, current_user)
    return crud.list_kb_documents(db, kb_id)


@router.post("/{kb_id}/upload", response_model=schemas.KBDocumentOut)
def upload_document(
    kb_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_active_user),
):
    _require_kb(db, kb_id, current_user)

    kb_dir = UPLOAD_DIR / f"kb_{kb_id}"
    kb_dir.mkdir(parents=True, exist_ok=True)

    safe_filename = (file.filename or "arquivo.bin").replace("/", "_").replace("\\", "_")
    file_path = kb_dir / safe_filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Extrai o texto já no upload, para a indexação funcionar de forma confiável.
    content = ""
    try:
        if safe_filename.lower().endswith(".pdf"):
            content = extract_text_from_pdf(str(file_path))
        else:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
    except Exception:
        content = ""

    doc = crud.create_kb_document(
        db=db,
        kb_id=kb_id,
        filename=safe_filename,
        content=content,
        status="uploaded",
    )
    return doc


@router.delete("/{kb_id}/documents/{doc_id}")
def delete_document(
    kb_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_active_user),
):
    _require_kb(db, kb_id, current_user)
    doc = _require_doc(db, kb_id, doc_id)
    db.delete(doc)
    db.commit()
    return {"deleted": True, "doc_id": doc_id, "kb_id": kb_id}


# ---------------------------------------------------------------------------
# Indexação e busca (RAG)
# ---------------------------------------------------------------------------

@router.post("/{kb_id}/index")
def index_kb_route(
    kb_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_active_user),
):
    _require_kb(db, kb_id, current_user)

    docs = crud.list_kb_documents(db, kb_id)
    if not docs:
        raise HTTPException(status_code=400, detail="Nenhum documento para indexar.")

    try:
        return index_kb(kb_id=kb_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao indexar a base: {str(e)}")


@router.get("/{kb_id}/search")
def search_kb(
    kb_id: int,
    query: str,
    top_k: int = 4,
    db: Session = Depends(get_db),
    current_user: schemas.UserOut = Depends(get_current_active_user),
):
    _require_kb(db, kb_id, current_user)
    try:
        context, sources = retrieve_context_with_sources(
            query=query,
            agent_id=None,
            kb_ids=[kb_id],
            top_k=top_k,
        )
        return {"kb_id": kb_id, "query": query, "context": context, "sources": sources}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar contexto: {str(e)}")
