# -*- coding: utf-8 -*-
"""Testes E2E da API — roda contra http://127.0.0.1:8000"""
import time
import requests
from dotenv import load_dotenv

# Carrega o mesmo .env do servidor para gerar um token de verificação válido
# (mesmo JWT_SECRET). Precisa rodar a partir da pasta BACKEND.
load_dotenv()
from app import auth  # noqa: E402

BASE = "http://127.0.0.1:8000"
ts = int(time.time())
passed = 0
failed = 0


def check(name, cond, extra=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  [PASS] {name}")
    else:
        failed += 1
        print(f"  [FAIL] {name}  {extra}")


def h(tok):
    return {"Authorization": f"Bearer {tok}"}


def verify_email_token(email):
    """Confirma o e-mail (simula o clique no link) com o mesmo segredo do servidor."""
    token = auth.create_email_action_token(email, "verify_email", 60)
    return requests.post(f"{BASE}/auth/verify-email", json={"token": token})


print("== AUTH ==")
ea = f"qa_a_{ts}@example.com"
eb = f"qa_b_{ts}@example.com"
r = requests.post(f"{BASE}/auth/register", json={"email": ea, "password": "1234", "name": "Ana QA"})
check("register userA 201", r.status_code == 201, r.text[:200])
tokA = r.json().get("access_token")
check("register retorna token", bool(tokA))
check("register retorna nome", r.json().get("user", {}).get("name") == "Ana QA")

r = requests.post(f"{BASE}/auth/register", json={"email": ea, "password": "1234", "name": "Ana"})
check("register duplicado -> 400", r.status_code == 400, r.text[:120])

r = requests.post(f"{BASE}/auth/login", json={"email": ea, "password": "errada"})
check("login senha errada -> 401", r.status_code == 401)

r = requests.post(f"{BASE}/auth/login", json={"email": ea, "password": "1234"})
check("login correto -> 200", r.status_code == 200)
tokA = r.json()["access_token"]

r = requests.get(f"{BASE}/auth/me", headers=h(tokA))
check("/auth/me com token -> 200", r.status_code == 200 and r.json()["email"] == ea)

r = requests.get(f"{BASE}/auth/me", headers=h("token-invalido"))
check("/auth/me token invalido -> 401", r.status_code == 401)

print("== VERIFICACAO DE E-MAIL ==")
r = requests.post(f"{BASE}/agents/", headers=h(tokA), json={"name": "Bloqueado QA"})
check("criar agente SEM verificar e-mail -> 403", r.status_code == 403, r.text[:150])
r = verify_email_token(ea)
check("confirmar e-mail userA -> 200 (verified)",
      r.status_code == 200 and r.json().get("email_verified") is True, r.text[:150])

print("== AGENTES (CRUD) ==")
r = requests.post(f"{BASE}/agents/", headers=h(tokA),
                  json={"name": "Agente QA", "system_prompt": "Você responde sempre em português, curto."})
check("criar agente -> 200", r.status_code == 200, r.text[:200])
agA = r.json()["id"]

r = requests.post(f"{BASE}/agents/", headers=h(tokA), json={"name": "Agente QA", "system_prompt": "x"})
check("agente nome duplicado (mesmo user) -> 400", r.status_code == 400)

r = requests.put(f"{BASE}/agents/{agA}", headers=h(tokA), json={"status": "active", "description": "ativo"})
check("atualizar agente (status active) -> 200", r.status_code == 200 and r.json()["status"] == "active")

r = requests.get(f"{BASE}/agents/", headers=h(tokA))
check("listar agentes -> 1", r.status_code == 200 and len(r.json()) == 1)

r = requests.get(f"{BASE}/agents/{agA}", headers=h(tokA))
check("get agente -> 200", r.status_code == 200)

r = requests.get(f"{BASE}/agents/999999", headers=h(tokA))
check("get agente inexistente -> 404", r.status_code == 404)

print("== CHAT REAL (OpenAI) ==")
r = requests.post(f"{BASE}/agents/{agA}/chat", headers=h(tokA),
                  json={"message": "Diga apenas a palavra: funcionou", "use_memory": True})
ok_chat = r.status_code == 200 and len(r.json().get("answer", "")) > 0
check("chat responde 200 com texto", ok_chat, r.text[:200])
if ok_chat:
    print("    resposta:", repr(r.json()["answer"][:120]))
conv_id = r.json().get("conversation_id") if r.status_code == 200 else None

r = requests.post(f"{BASE}/agents/{agA}/chat", headers=h(tokA),
                  json={"conversation_id": conv_id, "message": "E qual palavra eu pedi?", "use_memory": True})
check("chat com memoria -> 200", r.status_code == 200, r.text[:150])

if conv_id:
    r = requests.get(f"{BASE}/conversations/{conv_id}/memory", headers=h(tokA))
    check("memoria da conversa tem mensagens", r.status_code == 200 and len(r.json()) >= 2)

print("== KB + RAG ==")
r = requests.post(f"{BASE}/kb/", headers=h(tokA), json={"name": f"Base QA {ts}", "description": "teste"})
check("criar KB -> 200", r.status_code == 200, r.text[:150])
kb = r.json()["id"]

doc_text = "A senha do wifi da empresa ACME é girafa-azul-42. O horario de funcionamento e das 9h as 18h."
files = {"file": ("info.txt", doc_text.encode("utf-8"), "text/plain")}
r = requests.post(f"{BASE}/kb/{kb}/upload", headers=h(tokA), files=files)
check("upload documento -> 200", r.status_code == 200, r.text[:150])
check("upload salvou conteudo", r.status_code == 200 and "girafa" in (r.json().get("content", "")), r.text[:150])

r = requests.post(f"{BASE}/kb/{kb}/index", headers=h(tokA))
check("indexar KB -> 200", r.status_code == 200, r.text[:200])

r = requests.get(f"{BASE}/kb/{kb}/search", headers=h(tokA), params={"query": "qual a senha do wifi?"})
found = r.status_code == 200 and "girafa" in (r.json().get("context", "").lower())
check("busca RAG encontra o trecho", found, r.text[:200])

# Agente com RAG conectado a esta KB
flow = {"nodes": [{"id": "n1", "type": "rag", "data": {"config": {"kbId": str(kb)}}}], "edges": []}
r = requests.post(f"{BASE}/agents/", headers=h(tokA),
                  json={"name": f"Agente RAG {ts}", "system_prompt": "Responda usando o material.", "flow": flow})
check("criar agente com RAG -> 200", r.status_code == 200, r.text[:150])
agRag = r.json()["id"]
r = requests.post(f"{BASE}/agents/{agRag}/chat", headers=h(tokA),
                  json={"message": "Qual a senha do wifi da ACME?"})
ans = r.json().get("answer", "").lower() if r.status_code == 200 else ""
check("chat agente RAG usa o contexto (cita a senha)", "girafa" in ans, ans[:160])

print("== ISOLAMENTO ENTRE USUARIOS ==")
r = requests.post(f"{BASE}/auth/register", json={"email": eb, "password": "1234", "name": "Bia QA"})
tokB = r.json()["access_token"]
r = requests.get(f"{BASE}/agents/", headers=h(tokB))
check("userB lista agentes -> 0", r.status_code == 200 and len(r.json()) == 0)
r = requests.get(f"{BASE}/agents/{agA}", headers=h(tokB))
check("userB acessar agente de A -> 404", r.status_code == 404)
r = requests.get(f"{BASE}/kb/{kb}", headers=h(tokB))
check("userB acessar KB de A -> 404", r.status_code == 404)
r = requests.get(f"{BASE}/kb/{kb}/search", headers=h(tokB), params={"query": "senha"})
check("userB buscar na KB de A -> 404 (sem vazamento)", r.status_code == 404, r.text[:120])
r = requests.post(f"{BASE}/kb/{kb}/index", headers=h(tokB))
check("userB indexar KB de A -> 404", r.status_code == 404)

print("== DELECAO ==")
r = requests.delete(f"{BASE}/agents/{agA}", headers=h(tokA))
check("excluir agente -> 200", r.status_code == 200)
r = requests.delete(f"{BASE}/kb/{kb}", headers=h(tokA))
check("excluir KB -> 200", r.status_code == 200)

print(f"\n==== RESULTADO: {passed} PASS / {failed} FAIL ====")
