import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

OPENAI_API_KEY = (os.getenv("OPENAI_API_KEY") or "").strip()
DEFAULT_MODEL = os.getenv("OPENAI_MODEL") or "gpt-4o-mini"
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL") or "text-embedding-3-small"

# A plataforma funciona em "modo demonstração" quando não há chave de API
# configurada. Assim, todo o fluxo (criar agente, conversar, memória) pode ser
# demonstrado sem custo e sem quebrar a interface.
DEMO_MODE = not bool(OPENAI_API_KEY)

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


class LLMError(Exception):
    pass


def _last_user_message(messages: list[dict]) -> str:
    for msg in reversed(messages):
        if msg.get("role") == "user":
            return msg.get("content", "")
    return ""


def _system_prompt(messages: list[dict]) -> str:
    for msg in messages:
        if msg.get("role") == "system":
            return msg.get("content", "")
    return ""


def _demo_answer(messages: list[dict]) -> str:
    """Resposta simulada e útil, usada quando não há chave de API."""
    user_msg = _last_user_message(messages).strip()
    persona = _system_prompt(messages).strip()
    persona_line = persona.splitlines()[0] if persona else "um assistente útil"

    return (
        "🤖 **Modo demonstração ativo**\n\n"
        f"Recebi sua mensagem: \"{user_msg}\".\n\n"
        f"Como agente configurado para ser *{persona_line}*, eu responderia aqui de "
        "forma personalizada usando a IA e a base de conhecimento.\n\n"
        "Para ativar respostas reais, adicione sua `OPENAI_API_KEY` no arquivo "
        "`BACKEND/.env` e reinicie o servidor. Todo o restante da plataforma "
        "(agentes, fluxos, memória e bases de conhecimento) já está funcionando."
    )


def _client_for(api_key: str | None):
    """Cliente OpenAI: usa a chave do usuário se houver, senão a global."""
    if api_key:
        return OpenAI(api_key=api_key)
    return client


def generate_openai(messages: list[dict], model: str | None = None, api_key: str | None = None) -> str:
    cli = _client_for(api_key)
    if cli is None:
        return _demo_answer(messages)
    try:
        resp = cli.chat.completions.create(
            model=model or DEFAULT_MODEL,
            messages=messages,
            temperature=0.4,
        )
        return resp.choices[0].message.content or ""
    except Exception as e:
        raise LLMError(str(e))


def generate(provider: str, model: str, messages: list[dict], api_key: str | None = None) -> str:
    provider = (provider or "").lower().strip()

    # Sem nenhuma chave (nem do usuário, nem global): modo demonstração.
    if DEMO_MODE and not api_key:
        return _demo_answer(messages)

    if provider == "openai":
        return generate_openai(messages=messages, model=model, api_key=api_key)

    raise LLMError(f"Provedor ainda não implementado: {provider}")


def embed_texts(texts: list[str]) -> list[list[float]]:
    if client is None:
        # Embeddings determinísticos simples para permitir indexação/busca em
        # modo demonstração (não são semânticos, mas mantêm o fluxo funcional).
        return [_demo_embedding(t) for t in texts]
    try:
        resp = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=texts,
        )
        return [item.embedding for item in resp.data]
    except Exception as e:
        raise LLMError(f"Erro ao gerar embeddings: {str(e)}")


def _demo_embedding(text: str, dim: int = 256) -> list[float]:
    """Embedding pseudo-determinístico (hashing) para o modo demonstração."""
    import hashlib

    vec = [0.0] * dim
    for token in text.lower().split():
        h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
        vec[h % dim] += 1.0
    norm = sum(v * v for v in vec) ** 0.5 or 1.0
    return [v / norm for v in vec]
