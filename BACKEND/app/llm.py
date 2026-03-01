import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")


class LLMError(Exception):
    pass


def generate_openai(messages: list[dict], model: str | None = None) -> str:
    try:
        resp = client.chat.completions.create(
            model=model or DEFAULT_MODEL,
            messages=messages,
            temperature=0.4,
        )
        return resp.choices[0].message.content or ""
    except Exception as e:
        raise LLMError(str(e))


def generate(provider: str, model: str, messages: list[dict]) -> str:
    provider = (provider or "").lower().strip()

    if provider == "openai":
        return generate_openai(messages=messages, model=model)

    raise LLMError(f"Provedor ainda não implementado: {provider}")

def embed_texts(texts: list[str]) -> list[list[float]]:
    try:
        resp = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=texts,
        )
        return [item.embedding for item in resp.data]
    except Exception as e:
        raise LLMError(f"Erro ao gerar embeddings: {str(e)}")