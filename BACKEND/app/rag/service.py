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
    return {
        "success": True,
        "indexed_count": 0,
        "document_id": document_id,
        "kb_id": kb_id,
        "message": "Indexação fake executada com sucesso.",
    }


def retrieve_context(query: str, agent_id: int | None = None, top_k: int = 4) -> str:
    context, _ = retrieve_context_with_sources(query=query, agent_id=agent_id, top_k=top_k)
    return context


def retrieve_context_with_sources(
    query: str,
    agent_id: int | None = None,
    top_k: int = 4,
) -> Tuple[str, List[dict]]:
    return "", []


def generate_embeddings(texts: List[str]) -> List[List[float]]:
    return [[0.0] * 10 for _ in texts]