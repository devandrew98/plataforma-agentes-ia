import os
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app import schemas, crud

router = APIRouter(prefix="/kb", tags=["Knowledge Base"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/", response_model=list[schemas.KBOut])
def list_kbs(db: Session = Depends(get_db)):
    return crud.list_kbs(db)


@router.post("/", response_model=schemas.KBOut)
def create_kb(payload: schemas.KBCreate, db: Session = Depends(get_db)):
    return crud.create_kb(db, payload)


@router.get("/{kb_id}", response_model=schemas.KBOut)
def get_kb(kb_id: int, db: Session = Depends(get_db)):
    kb = crud.get_kb(db, kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="KB não encontrada.")
    return kb


@router.delete("/{kb_id}")
def delete_kb(kb_id: int, db: Session = Depends(get_db)):
    kb = crud.get_kb(db, kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="KB não encontrada.")

    crud.delete_kb(db, kb)
    return {"deleted": True}


@router.get("/{kb_id}/documents", response_model=list[schemas.KBDocumentOut])
def list_documents(kb_id: int, db: Session = Depends(get_db)):
    kb = crud.get_kb(db, kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="KB não encontrada.")

    return crud.list_kb_documents(db, kb_id)


@router.post("/{kb_id}/upload", response_model=schemas.KBDocumentOut)
def upload_document(
    kb_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    kb = crud.get_kb(db, kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="KB não encontrada.")

    kb_dir = UPLOAD_DIR / f"kb_{kb_id}"
    kb_dir.mkdir(parents=True, exist_ok=True)

    safe_filename = file.filename or "arquivo.bin"
    file_path = kb_dir / safe_filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    doc = crud.create_kb_document(
        db=db,
        kb_id=kb_id,
        filename=safe_filename,
        file_path=str(file_path),
    )
    return doc