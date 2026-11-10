from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from backend.config import settings

# SQLite multi-threaded access setting; PostgreSQL ignores this
connect_args = {"check_same_thread": False} if "sqlite" in settings.async_database_url else {}

engine = create_async_engine(
    settings.async_database_url,
    echo=False,
    connect_args=connect_args
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
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

        # SQLite schema dynamic migration for multi-tenant SaaS columns
        if "sqlite" in settings.async_database_url:
            from sqlalchemy import text
            columns_to_add = [
                ("authorization_mandates", "tenant_type", "VARCHAR(32) DEFAULT 'INDIVIDUAL'"),
                ("authorization_mandates", "organization_id", "VARCHAR(64)"),
                ("authorization_mandates", "user_id", "VARCHAR(64) DEFAULT 'usr_default_individual'"),
                ("procurement_requests", "tenant_type", "VARCHAR(32) DEFAULT 'INDIVIDUAL'"),
                ("procurement_requests", "organization_id", "VARCHAR(64)"),
                ("procurement_requests", "user_id", "VARCHAR(64) DEFAULT 'usr_default_individual'"),
                ("procurement_requests", "payment_mode", "VARCHAR(32) DEFAULT 'STANDARD_PAYPAL'"),
                ("transactions", "tenant_type", "VARCHAR(32) DEFAULT 'INDIVIDUAL'"),
                ("transactions", "organization_id", "VARCHAR(64)"),
                ("transactions", "user_id", "VARCHAR(64) DEFAULT 'usr_default_individual'"),
                ("transactions", "payment_mode", "VARCHAR(32) DEFAULT 'STANDARD_PAYPAL'"),
                ("users", "account_type", "VARCHAR(32) DEFAULT 'INDIVIDUAL'"),
                ("users", "current_organization_id", "VARCHAR(64)"),
                ("audit_logs", "tenant_type", "VARCHAR(32) DEFAULT 'INDIVIDUAL'"),
                ("audit_logs", "organization_id", "VARCHAR(64)"),
                ("audit_logs", "user_id", "VARCHAR(64) DEFAULT 'usr_default_individual'"),
            ]
            for tbl, col, col_def in columns_to_add:
                try:
                    await conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} {col_def}"))
                except Exception:
                    pass
