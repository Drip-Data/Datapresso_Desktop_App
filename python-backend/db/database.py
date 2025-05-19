from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
import os
from contextlib import asynccontextmanager # Added import

from config import get_settings

settings = get_settings()

# 使用 settings.db_url，如果它已经是异步兼容的URL (e.g., "sqlite+aiosqlite:///./datapresso.db")
# 如果 settings.db_url 是 "sqlite:///./datapresso.db"，我们需要转换它
SQLALCHEMY_DATABASE_URL = settings.db_url

if SQLALCHEMY_DATABASE_URL.startswith("sqlite:///"):
    # aiosqlite 需要 "sqlite+aiosqlite:///"
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///")
elif SQLALCHEMY_DATABASE_URL.startswith("sqlite://"):
    # aiosqlite 需要 "sqlite+aiosqlite://"
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("sqlite://", "sqlite+aiosqlite://")


# 创建异步数据库引擎
# connect_args={"check_same_thread": False} 仅适用于 SQLite，用于允许多线程访问（尽管 aiosqlite 是异步的）
engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite+aiosqlite") else {},
    echo=settings.debug  # 在调试模式下打印SQL语句
)

# 创建异步会话工厂
AsyncSessionLocal = async_sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine,
    class_=AsyncSession
)

# SQLAlchemy 模型基类 (可以从 db.models 导入，或者在这里重新声明如果 db.models 也需要它)
# 为了避免循环导入，通常在 models.py 中定义 Base，然后在这里导入它。
# 假设 Base 在 db.models 中定义: from .models import Base
# 如果 models.py 中的 Base = declarative_base() 是独立的，那没问题。
# 这里我们假设 models.py 中的 Base 是我们需要的。

async def get_async_db() -> AsyncSession:
    """
    FastAPI 依赖项，用于获取异步数据库会话。
    确保会话在使用后关闭。
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit() # 正常情况下提交事务
        except Exception:
            await session.rollback() # 发生异常时回滚
            raise
        finally:
            await session.close()

from contextlib import asynccontextmanager # Ensure this is imported at the top if not already

@asynccontextmanager
async def get_async_db_contextmanager() -> AsyncSession:
    """
    Asynchronous context manager for database sessions.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
async def create_db_and_tables():
    """
    根据 SQLAlchemy 模型创建所有数据库表。
    应在应用启动时调用。
    """
    # 需要从 db.models 导入 Base
    from .models import Base 
    async with engine.begin() as conn:
        # await conn.run_sync(Base.metadata.drop_all) # 可选：用于测试，每次启动清空数据库
        await conn.run_sync(Base.metadata.create_all)

# 注意: 实际的应用启动逻辑 (如 FastAPI main.py) 中需要调用 create_db_and_tables()
# 例如:
# from fastapi import FastAPI
# from .db.database import create_db_and_tables
#
# app = FastAPI()
#
# @app.on_event("startup")
# async def on_startup():
#     await create_db_and_tables()