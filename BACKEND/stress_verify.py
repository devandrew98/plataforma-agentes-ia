"""
Stress/edge-case test da verificação de e-mail + reset de senha.
Roda em DB temporário e isolado (não toca no app.db real).
"""
import os
os.environ["DATABASE_URL"] = "sqlite:///./_stress.db"
os.environ.pop("SMTP_HOST", None)

import threading
from app.main import app
from app import auth, crud
from app.database import SessionLocal
from fastapi.testclient import TestClient

c = TestClient(app)
passed, failed = 0, 0
crashes = []


def check(label, cond, extra=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  OK   {label}")
    else:
        failed += 1
        print(f"  FAIL {label}  {extra}")


def reg(email, pwd="senha123", name="User"):
    return c.post("/auth/register", json={"email": email, "password": pwd, "name": name})


print("\n== A) Validacao de cadastro ==")
check("email sem @ -> 400", reg("semarroba").status_code == 400)
check("senha curta -> 400", reg("a@b.com", pwd="1").status_code == 400)
r1 = reg("dup@teste.com")
r2 = reg("dup@teste.com")
check("1o cadastro -> 201", r1.status_code == 201, r1.text[:80])
check("email duplicado -> 400 (nao 500)", r2.status_code == 400, f"got {r2.status_code}")

print("\n== B) Verificacao de e-mail ==")
EM = "verif@teste.com"
rr = reg(EM)
tok = rr.json()["access_token"]
H = {"Authorization": f"Bearer {tok}"}
check("nasce nao verificado", rr.json()["user"]["email_verified"] is False)
check("token malformado -> 400", c.post("/auth/verify-email", json={"token": "lixo.invalido"}).status_code == 400)
check("token vazio -> 400/422", c.post("/auth/verify-email", json={"token": ""}).status_code in (400, 422))
exp = auth.create_email_action_token(EM, "verify_email", -5)  # já expirado
check("token expirado -> 400", c.post("/auth/verify-email", json={"token": exp}).status_code == 400)
wrongp = auth.create_email_action_token(EM, "reset_password", 60)
check("proposito errado -> 400", c.post("/auth/verify-email", json={"token": wrongp}).status_code == 400)
ghost = auth.create_email_action_token("naoexiste@x.com", "verify_email", 60)
check("usuario inexistente -> 404", c.post("/auth/verify-email", json={"token": ghost}).status_code == 404)
good = auth.create_email_action_token(EM, "verify_email", 60)
v1 = c.post("/auth/verify-email", json={"token": good})
v2 = c.post("/auth/verify-email", json={"token": good})  # idempotente
check("verifica -> 200 verified", v1.status_code == 200 and v1.json()["email_verified"] is True)
check("verificar 2x (idempotente) -> 200", v2.status_code == 200 and v2.json()["email_verified"] is True)

print("\n== C) Bloqueio de criar agente ==")
EM2 = "bloq@teste.com"
H2 = {"Authorization": f"Bearer {reg(EM2).json()['access_token']}"}
check("nao verificado -> 403 ao criar agente", c.post("/agents/", json={"name": "X"}, headers=H2).status_code == 403)
check("verificado -> 200 ao criar agente", c.post("/agents/", json={"name": "X"}, headers=H).status_code == 200)
# case-insensitive: cadastra com maiuscula, verifica com minuscula
MIX = "Maiuscula@Teste.com"
hmix = {"Authorization": f"Bearer {reg(MIX).json()['access_token']}"}
tmix = auth.create_email_action_token(MIX, "verify_email", 60)
check("verify case-insensitive -> 200", c.post("/auth/verify-email", json={"token": tmix}).status_code == 200)
check("agente liberado apos verify case -> 200", c.post("/agents/", json={"name": "Y"}, headers=hmix).status_code == 200)

print("\n== D) Reset de senha ==")
check("forgot inexistente -> 200 (sem vazar)", c.post("/auth/forgot-password", json={"email": "nada@x.com"}).status_code == 200)
# OAuth user (sem senha) nao deve poder resetar
db = SessionLocal()
crud.get_or_create_oauth_user(db, email="social@teste.com", name="S", provider="google")
db.close()
check("forgot p/ conta social -> 200 generico", c.post("/auth/forgot-password", json={"email": "social@teste.com"}).status_code == 200)
soc_tok = auth.create_email_action_token("social@teste.com", "reset_password", 60, {"st": "x"})
check("reset conta social -> 400", c.post("/auth/reset-password", json={"token": soc_tok, "password": "abcdef"}).status_code == 400)
# fluxo normal de reset
db = SessionLocal(); u = crud.get_user_by_email(db, EM); stamp = (u.hashed_password or "")[-12:]; db.close()
rtok = auth.create_email_action_token(EM, "reset_password", 60, {"st": stamp})
check("reset senha curta -> 400", c.post("/auth/reset-password", json={"token": rtok, "password": "123"}).status_code == 400)
ok = c.post("/auth/reset-password", json={"token": rtok, "password": "novaSenha9"})
check("reset valido -> 200 + token", ok.status_code == 200 and bool(ok.json().get("access_token")))
check("login nova senha -> 200", c.post("/auth/login", json={"email": EM, "password": "novaSenha9"}).status_code == 200)
check("login senha antiga -> 401", c.post("/auth/login", json={"email": EM, "password": "senha123"}).status_code == 401)
check("reuso do link de reset -> 400 (uso unico)", c.post("/auth/reset-password", json={"token": rtok, "password": "outra123"}).status_code == 400)

print("\n== E) Concorrencia: cadastro do MESMO e-mail (race) ==")
results = []
def race_reg():
    try:
        results.append(reg("race@teste.com").status_code)
    except Exception as e:
        results.append(("EXC", str(e)[:60]))
ths = [threading.Thread(target=race_reg) for _ in range(12)]
[t.start() for t in ths]; [t.join() for t in ths]
ok201 = sum(1 for r in results if r == 201)
bad500 = sum(1 for r in results if r == 500 or (isinstance(r, tuple)))
print("   status:", results)
check("exatamente 1 cadastro venceu (201)", ok201 == 1, f"got {ok201}")
check("nenhum 500/exception na corrida", bad500 == 0, f"got {bad500} -> {[r for r in results if r==500 or isinstance(r,tuple)]}")
if bad500:
    crashes.append("race de cadastro duplicado gerou 500/exception")

print("\n== F) Carga: criar/listar muitos agentes ==")
import time
t0 = time.time()
made = 0
for i in range(40):
    r = c.post("/agents/", json={"name": f"Agente {i}"}, headers=H)
    if r.status_code == 200:
        made += 1
dt = time.time() - t0
lst = c.get("/agents/", headers=H)
check(f"criou 40 agentes ({made}/40)", made == 40)
check("listagem responde 200", lst.status_code == 200)
print(f"   tempo p/ 40 criacoes: {dt:.2f}s | total na lista: {len(lst.json())}")

print(f"\n==== RESULTADO: {passed} OK / {failed} FAIL ====")
if crashes:
    print("CRASHES/BUGS:", crashes)
