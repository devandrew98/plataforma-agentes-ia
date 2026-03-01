from typing import List
from pypdf import PdfReader


def extract_text_from_pdf(file_path: str) -> str:
    reader = PdfReader(file_path)
    texts = []
    for page in reader.pages:
        t = page.extract_text() or ""
        if t.strip():
            texts.append(t)
    return "\n".join(texts)


def chunk_text(text: str, chunk_size: int = 900, overlap: int = 200) -> List[str]:
    """
    Chunking seguro: evita loop infinito quando o texto é menor que chunk_size
    ou quando overlap >= chunk_size.
    """
    text = (text or "").strip()
    if not text:
        return []

    # segurança extra
    if overlap >= chunk_size:
        overlap = max(0, chunk_size // 4)

    chunks = []
    start = 0
    n = len(text)

    while start < n:
        end = min(start + chunk_size, n)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end >= n:
            break  # terminou o texto

        # próximo start garantindo avanço real
        next_start = end - overlap
        if next_start <= start:
            next_start = end  # força avanço
        start = next_start

    return chunks