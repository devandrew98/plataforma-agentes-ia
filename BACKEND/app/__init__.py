"""
Pacote da aplicação.

Carrega as variáveis do arquivo .env o mais cedo possível — antes de qualquer
submódulo (auth, database, etc.) ler ``os.getenv`` no momento do import. Sem
isto, em desenvolvimento o ``JWT_SECRET`` (e outras variáveis) do .env eram
ignorados porque ``app.auth`` era importado antes de qualquer ``load_dotenv``.

Em produção (Render/Vercel) não há arquivo .env e as variáveis já vêm do
ambiente; ``load_dotenv`` é um no-op e ``override=False`` garante que o ambiente
real nunca seja sobrescrito.
"""

from dotenv import load_dotenv

load_dotenv()
