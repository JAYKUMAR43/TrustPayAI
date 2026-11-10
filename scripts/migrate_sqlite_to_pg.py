"""
SQLite to PostgreSQL Data Migration & Backup Utility for TRUSTPAY AI.

Usage:
  # 1. Backup SQLite data to local JSON
  python scripts/migrate_sqlite_to_pg.py --backup

  # 2. Migrate backed-up records into PostgreSQL
  python scripts/migrate_sqlite_to_pg.py --restore --target-url "postgresql+asyncpg://user:pass@host/dbname"
"""

import sys
import os
import json
import asyncio
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Ensure backend can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import settings
from backend.database.connection import Base, engine as source_engine

BACKUP_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "trustpay_backup.json")

TABLES_IN_ORDER = [
    "users",
    "agents",
    "vendors",
    "spending_policies",
    "policy_rules",
    "procurement_requests",
    "purchase_requests",
    "authorization_mandates",
    "transactions",
    "risk_events",
    "audit_logs",
    "organizations",
    "organization_memberships",
    "payment_accounts"
]

async def backup_sqlite_data():
    print(f"[*] Backing up data from: {settings.async_database_url}")
    data = {}
    async with source_engine.connect() as conn:
        for tbl in TABLES_IN_ORDER:
            try:
                res = await conn.execute(text(f"SELECT * FROM {tbl}"))
                rows = [dict(row._mapping) for row in res.fetchall()]
                # Convert datetimes to ISO strings for JSON serialization
                for r in rows:
                    for k, v in r.items():
                        if isinstance(v, datetime):
                            r[k] = v.isoformat()
                data[tbl] = rows
                print(f"  -> Exported {len(rows)} records from table '{tbl}'")
            except Exception as e:
                print(f"  -> Skipping table '{tbl}': {e}")
                data[tbl] = []

    with open(BACKUP_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"[+] Backup successfully saved to: {BACKUP_FILE}")
    return data

async def restore_to_postgres(target_url: str):
    print(f"[*] Restoring records to PostgreSQL database: {target_url}")
    if not os.path.exists(BACKUP_FILE):
        print(f"[!] Error: Backup file {BACKUP_FILE} not found. Run --backup first.")
        return

    with open(BACKUP_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Format URL
    url = target_url
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    target_engine = create_async_engine(url, echo=False)

    async with target_engine.begin() as conn:
        # Create all schema tables
        import backend.models.user
        import backend.models.agent
        import backend.models.vendor
        import backend.models.procurement
        import backend.models.policy
        import backend.models.mandate
        import backend.models.transaction
        import backend.models.risk
        import backend.models.audit
        import backend.models.idempotency
        import backend.models.purchase
        import backend.models.organization
        import backend.models.membership
        import backend.models.payment_account
        await conn.run_sync(Base.metadata.create_all)
        print("[+] PostgreSQL schema verified and created.")

    async_session = async_sessionmaker(bind=target_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        for tbl in TABLES_IN_ORDER:
            rows = data.get(tbl, [])
            if not rows:
                continue
            for r in rows:
                cols = ", ".join(r.keys())
                placeholders = ", ".join([f":{k}" for k in r.keys()])
                stmt = text(f"INSERT INTO {tbl} ({cols}) VALUES ({placeholders}) ON CONFLICT DO NOTHING")
                try:
                    await session.execute(stmt, r)
                except Exception as e:
                    print(f"  -> Error inserting into {tbl}: {e}")
            await session.commit()
            print(f"  -> Migrated {len(rows)} records into '{tbl}'")

    print("[+] PostgreSQL restore complete!")

if __name__ == "__main__":
    if "--backup" in sys.argv:
        asyncio.run(backup_sqlite_data())
    elif "--restore" in sys.argv:
        target = sys.argv[sys.argv.index("--restore") + 1] if len(sys.argv) > sys.argv.index("--restore") + 1 else os.getenv("DATABASE_URL")
        if not target or target.startswith("--"):
            print("Please provide target URL: python scripts/migrate_sqlite_to_pg.py --restore <POSTGRES_URL>")
            sys.exit(1)
        asyncio.run(restore_to_postgres(target))
    else:
        # Default: perform backup
        asyncio.run(backup_sqlite_data())
