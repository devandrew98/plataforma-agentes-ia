import os
from uuid import uuid4

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "kb_documents")

client = QdrantClient(url=QDRANT_URL)


def ensure_collection(vector_size: int):
    if not client.collection_exists(QDRANT_COLLECTION):
        client.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )


def delete_kb_points(kb_id: int):
    client.delete(
        collection_name=QDRANT_COLLECTION,
        points_selector=Filter(
            must=[
                FieldCondition(
                    key="kb_id",
                    match=MatchValue(value=kb_id),
                )
            ]
        ),
    )


def upsert_chunks(kb_id: int, doc_id: int, title: str, chunks: list[str], embeddings: list[list[float]]):
    if not embeddings:
        return

    ensure_collection(len(embeddings[0]))

    points = []
    for idx, (chunk, emb) in enumerate(zip(chunks, embeddings)):
        points.append(
            PointStruct(
                id=str(uuid4()),
                vector=emb,
                payload={
                    "kb_id": kb_id,
                    "doc_id": doc_id,
                    "title": title,
                    "chunk_index": idx,
                    "text": chunk,
                },
            )
        )

    client.upsert(
        collection_name=QDRANT_COLLECTION,
        points=points,
    )


def search_chunks(kb_id: int, query_embedding: list[float], top_k: int = 4):
    return client.search(
        collection_name=QDRANT_COLLECTION,
        query_vector=query_embedding,
        query_filter=Filter(
            must=[
                FieldCondition(
                    key="kb_id",
                    match=MatchValue(value=kb_id),
                )
            ]
        ),
        limit=top_k,
    )