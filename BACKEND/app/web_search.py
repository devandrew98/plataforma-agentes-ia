"""
app/web_search.py
-----------------
Busca na web (DuckDuckGo, sem necessidade de chave de API). Usada quando o
agente está no modo de conhecimento "web": pesquisamos a mensagem do usuário,
pegamos os melhores resultados e entregamos como contexto para o LLM responder
com informação atualizada.

Falha de forma graciosa: se a busca não rolar, retorna vazio e o agente
responde só com o conhecimento do modelo.
"""

from typing import List, Tuple


def web_search(query: str, max_results: int = 4) -> Tuple[str, List[dict]]:
    if not query or not query.strip():
        return "", []

    results = []
    try:
        from ddgs import DDGS

        results = list(DDGS().text(query, max_results=max_results))
    except Exception as e:  # lib ausente, rate-limit, rede, etc.
        print(f"web_search: busca falhou ({e})")
        return "", []

    parts: List[str] = []
    sources: List[dict] = []
    for r in results:
        title = (r.get("title") or "").strip()
        body = (r.get("body") or "").strip()
        href = (r.get("href") or r.get("url") or "").strip()
        if not body:
            continue
        parts.append(f"- {title}: {body}\n  (fonte: {href})")
        sources.append({"filename": title or href or "web", "text": body[:200]})

    if not parts:
        return "", []

    context = (
        "RESULTADOS DA WEB (use estas informações atualizadas para responder, "
        "e cite a fonte quando fizer sentido):\n" + "\n".join(parts)
    )
    return context, sources
