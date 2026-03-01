import os
from dotenv import load_dotenv
import chromadb
from chromadb.config import Settings

load_dotenv()

CHROMA_DIR = os.getenv("CHROMA_DIR", "./chroma_data")
CHROMA_PERSISTENT = os.getenv("CHROMA_PERSISTENT", "1")  # "1" ou "0"

_client = None


def get_client():
    global _client
    if _client is not None:
        return _client

    if CHROMA_PERSISTENT == "0":
        _client = chromadb.Client(Settings(anonymized_telemetry=False))
        return _client

    os.makedirs(CHROMA_DIR, exist_ok=True)
    _client = chromadb.PersistentClient(
        path=CHROMA_DIR,
        settings=Settings(anonymized_telemetry=False),
    )
    return _client


def get_collection(name: str):
    client = get_client()
    return client.get_or_create_collection(name=name)