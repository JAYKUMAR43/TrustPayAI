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
        await conn.run_sync(Base.metadata.create_all)
