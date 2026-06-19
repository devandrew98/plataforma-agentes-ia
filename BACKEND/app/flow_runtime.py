"""
app/flow_runtime.py
-------------------
Converte o fluxo visual do agente (nós + setas) num "roteiro de atendimento"
em texto, que é injetado no prompt do sistema. Assim o agente passa a SEGUIR a
lógica que o usuário montou no Fluxo Lógico (sem precisar de um motor de
execução determinístico completo).
"""

from typing import Optional


def _describe(node: dict) -> Optional[str]:
    data = node.get("data", {}) or {}
    kind = data.get("kind") or node.get("type")
    cfg = data.get("config", {}) or {}

    if kind == "trigger":
        return "Quando o cliente enviar uma mensagem, inicie o atendimento de forma simpática."
    if kind == "rag":
        return "Consulte a base de conhecimento e responda com base nos dados encontrados nela."
    if kind == "llm":
        return "Gere uma resposta clara, educada e útil."
    if kind == "tool":
        alvo = cfg.get("url") or "o serviço externo configurado"
        return f"Se for necessário, utilize a ferramenta/integração ({alvo})."
    if kind == "condition":
        return f"Avalie a condição: {cfg.get('expression') or 'a condição definida'}. Siga o caminho conforme o resultado."
    if kind == "delay":
        return "Dê uma breve pausa antes de responder (como se estivesse digitando)."
    if kind == "human":
        setor = cfg.get("department") or "atendimento"
        return f"Se o cliente pedir um atendente humano ou o caso for complexo, ofereça transferir para o setor '{setor}'."
    if kind == "action":
        return "Finalize enviando a resposta ao cliente."
    return data.get("title") or None


def flow_to_instructions(flow: Optional[dict]) -> str:
    """Retorna o roteiro em texto, ou "" se o fluxo estiver vazio."""
    if not flow or not isinstance(flow, dict):
        return ""
    nodes = flow.get("nodes") or []
    edges = flow.get("edges") or []
    if not nodes:
        return ""

    by_id = {n.get("id"): n for n in nodes if n.get("id")}

    # adjacência (source -> targets) para ordenar seguindo as setas
    out: dict = {}
    for e in edges:
        out.setdefault(e.get("source"), []).append(e.get("target"))

    triggers = [
        n.get("id")
        for n in nodes
        if (n.get("type") == "trigger" or (n.get("data", {}) or {}).get("kind") == "trigger")
    ]

    order = []
    seen = set()
    queue = list(triggers) or [n.get("id") for n in nodes]
    while queue:
        nid = queue.pop(0)
        if nid in seen or nid not in by_id:
            continue
        seen.add(nid)
        order.append(nid)
        for t in out.get(nid, []):
            if t not in seen:
                queue.append(t)
    # blocos soltos (sem ligação) entram no fim
    for n in nodes:
        if n.get("id") and n.get("id") not in seen:
            seen.add(n.get("id"))
            order.append(n.get("id"))

    steps = []
    for nid in order:
        d = _describe(by_id[nid])
        if d:
            steps.append(d)

    if not steps:
        return ""

    lines = "\n".join(f"{i + 1}. {s}" for i, s in enumerate(steps))
    return (
        "ROTEIRO DE ATENDIMENTO (definido no fluxo do agente — use como guia da conversa):\n"
        + lines
    )
