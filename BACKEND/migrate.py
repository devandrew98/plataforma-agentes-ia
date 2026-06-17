"""
migrate.py - Migracao do banco SQLite
- Remove unique constraint do nome dos agentes (permitir nomes iguais entre usuarios)
- Adiciona coluna owner_id em knowledge_bases
"""

import sqlite3
import os
import sys

# Garante output em UTF-8 no Windows
sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = os.path.join(os.path.dirname(__file__), "app.db")

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # ----------------------------------------------------------
    # 1. Verificar e adicionar owner_id em knowledge_bases
    # ----------------------------------------------------------
    cur.execute("PRAGMA table_info(knowledge_bases)")
    kb_cols = [row[1] for row in cur.fetchall()]

    if "owner_id" not in kb_cols:
        print("Adicionando coluna owner_id em knowledge_bases...")
        cur.execute("ALTER TABLE knowledge_bases ADD COLUMN owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE")
        print("  OK: owner_id adicionada.")
    else:
        print("  INFO: owner_id ja existe em knowledge_bases.")

    # ----------------------------------------------------------
    # 2. Remover unique constraint global do nome dos agentes
    #    SQLite nao suporta DROP CONSTRAINT, entao recriamos a tabela
    # ----------------------------------------------------------
    cur.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='agents'")
    row = cur.fetchone()
    agents_sql = row[0] if row else ""

    # Verifica se ainda tem UNIQUE na coluna name
    needs_recreation = False
    if row:
        lines = agents_sql.upper().split("\n")
        for line in lines:
            if "NAME" in line and "UNIQUE" in line:
                needs_recreation = True
                break

    if needs_recreation:
        print("Recriando tabela agents sem UNIQUE global em name...")

        # Salva dados existentes
        cur.execute("SELECT id, name, description, provider, model, system_prompt, status, flow, created_at, updated_at, owner_id FROM agents")
        agents_data = cur.fetchall()

        # Desabilita FK temporariamente
        cur.execute("PRAGMA foreign_keys = OFF")

        cur.execute("ALTER TABLE agents RENAME TO agents_old")

        cur.execute("""
            CREATE TABLE agents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(120) NOT NULL,
                description VARCHAR(255) DEFAULT '',
                provider VARCHAR(50) DEFAULT 'openai',
                model VARCHAR(120) DEFAULT 'gpt-4o-mini',
                system_prompt TEXT NOT NULL DEFAULT 'Voce e um assistente util.',
                status VARCHAR(30) DEFAULT 'draft',
                flow JSON DEFAULT '{}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        cur.executemany("""
            INSERT INTO agents (id, name, description, provider, model, system_prompt, status, flow, created_at, updated_at, owner_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, agents_data)

        cur.execute("CREATE INDEX IF NOT EXISTS ix_agents_name ON agents (name)")
        cur.execute("CREATE INDEX IF NOT EXISTS ix_agents_id ON agents (id)")

        # Reativa FK
        cur.execute("PRAGMA foreign_keys = ON")

        cur.execute("DROP TABLE agents_old")
        print(f"  OK: Tabela agents recriada com {len(agents_data)} registros.")
    else:
        print("  INFO: Tabela agents ja nao tem UNIQUE global em name.")

    # ----------------------------------------------------------
    # 3. Verificar integridade referencial
    # ----------------------------------------------------------
    cur.execute("PRAGMA foreign_key_check")
    fk_errors = cur.fetchall()
    if fk_errors:
        print(f"AVISO: Problemas de FK encontrados: {fk_errors}")
    else:
        print("  OK: Integridade referencial OK.")

    conn.commit()
    conn.close()
    print("\nMigracao concluida com sucesso!")

if __name__ == "__main__":
    migrate()
