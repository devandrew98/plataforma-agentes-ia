"""
app/email_utils.py
------------------
Envio de e-mail best-effort. Se as variáveis SMTP não estiverem configuradas,
a função simplesmente não envia (retorna False) — sem quebrar o fluxo.

Variáveis de ambiente (todas opcionais):
  SMTP_HOST, SMTP_PORT (587 padrão), SMTP_USER, SMTP_PASSWORD, SMTP_FROM

Ex.: para Gmail use SMTP_HOST=smtp.gmail.com, SMTP_PORT=587 e uma
"senha de app" (não a senha normal da conta).
"""

import os
import smtplib
import ssl
from email.message import EmailMessage


def send_email(to: str, subject: str, body: str) -> bool:
    host = os.getenv("SMTP_HOST")
    if not host or not to:
        return False

    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    sender = os.getenv("SMTP_FROM") or user or "no-reply@argent.ai"

    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = sender
        msg["To"] = to
        msg.set_content(body)

        ctx = ssl.create_default_context()
        if port == 465:
            with smtplib.SMTP_SSL(host, port, context=ctx, timeout=15) as s:
                if user and password:
                    s.login(user, password)
                s.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=15) as s:
                s.starttls(context=ctx)
                if user and password:
                    s.login(user, password)
                s.send_message(msg)
        return True
    except Exception:
        return False
