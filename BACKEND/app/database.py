import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

# Render/Railway às vezes fornecem postgres://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine_kwargs = {}

if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Postgres serverless (ex.: Neon) hiberna quando inativo, deixando as
    # conexões do pool "mortas". pool_pre_ping testa/renova a conexão antes de
    # usar (evita erro 500 intermitente). pool_recycle descarta conexões velhas.
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_lightweight_migrations() -> None:
    """
    Migrações leves e idempotentes.

    Como o projeto usa ``Base.metadata.create_all`` (que só cria tabelas novas,
    nunca altera colunas de tabelas já existentes), precisamos garantir que
    colunas adicionadas depois do banco já existir sejam criadas. Tanto SQLite
    quanto PostgreSQL suportam ``ALTER TABLE ... ADD COLUMN`` (não-destrutivo).
    """
    from sqlalchemy import inspect, text

    is_sqlite = DATABASE_URL.startswith("sqlite")
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    def _has_column(table: str, column: str) -> bool:
        return column in {c["name"] for c in inspector.get_columns(table)}

    # ------------------------------------------------------------------
    # email_verified — precisa existir nos DOIS bancos (SQLite em dev e
    # PostgreSQL/Neon em produção), pois é uma coluna NOVA. Contas que já
    # existiam antes desta feature são "anistiadas" (marcadas como
    # verificadas) para não bloquearem a criação de agentes de quem já usava.
    # ------------------------------------------------------------------
    if "users" in existing_tables and not _has_column("users", "email_verified"):
        default_sql = "0" if is_sqlite else "FALSE"
        true_sql = "1" if is_sqlite else "TRUE"
        with engine.begin() as conn:
            conn.execute(
                text(
                    f"ALTER TABLE users ADD COLUMN email_verified BOOLEAN "
                    f"DEFAULT {default_sql}"
                )
            )
            conn.execute(text(f"UPDATE users SET email_verified = {true_sql}"))

    # ------------------------------------------------------------------
    # Daqui para baixo, apenas SQLite (em produção o Postgres já nasceu com
    # essas colunas quando o banco foi criado pela primeira vez).
    # ------------------------------------------------------------------
    if not is_sqlite:
        return

    # (tabela, coluna, definição SQL)
    required_columns = [
        ("users", "full_name", "VARCHAR(255)"),
        ("users", "company", "VARCHAR(255)"),
        ("users", "phone", "VARCHAR(50)"),
        ("users", "openai_api_key", "VARCHAR(255)"),
    ]

    with engine.begin() as conn:
        for table, column, ddl in required_columns:
            if table not in existing_tables:
                continue
            cols = {c["name"] for c in inspector.get_columns(table)}
            if column not in cols:
                conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {column} {ddl}'))

        # Bancos antigos tinham um índice UNIQUE GLOBAL em agents.name, o que
        # impedia que dois usuários diferentes tivessem agentes com o mesmo
        # nome. A unicidade correta é por usuário (tratada na camada da app),
        # então trocamos o índice único por um índice normal.
        if "agents" in existing_tables:
            row = conn.execute(
                text(
                    "SELECT sql FROM sqlite_master "
                    "WHERE type='index' AND name='ix_agents_name'"
                )
            ).fetchone()
            if row and row[0] and "UNIQUE" in row[0].upper():
                conn.execute(text("DROP INDEX ix_agents_name"))
                conn.execute(text("CREATE INDEX ix_agents_name ON agents (name)"))