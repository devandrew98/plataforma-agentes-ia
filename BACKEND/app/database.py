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
    Migrações leves e idempotentes para SQLite.

    Como o projeto usa ``Base.metadata.create_all`` (que só cria tabelas novas,
    nunca altera colunas de tabelas já existentes), precisamos garantir que
    colunas adicionadas depois do banco já existir sejam criadas. SQLite suporta
    ``ALTER TABLE ... ADD COLUMN``, que é não-destrutivo.
    """
    if not DATABASE_URL.startswith("sqlite"):
        return

    # (tabela, coluna, definição SQL)
    required_columns = [
        ("users", "full_name", "VARCHAR(255)"),
        ("users", "company", "VARCHAR(255)"),
        ("users", "phone", "VARCHAR(50)"),
        ("users", "openai_api_key", "VARCHAR(255)"),
    ]

    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

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