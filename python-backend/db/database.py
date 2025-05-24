"""
数据库配置和连接管理
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import StaticPool
from config import get_settings
import logging
from typing import AsyncGenerator

logger = logging.getLogger(__name__)

# 获取配置
settings = get_settings()

# 创建异步数据库引擎
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    poolclass=StaticPool,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
    pool_pre_ping=True
)

# 创建异步会话工厂
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# 创建模型基类
Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """获取数据库会话 - 用于依赖注入"""
    async with async_session_maker() as session:
        try:
            yield session
        except Exception as e:
            logger.error(f"Database session error: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()


# 为了兼容现有代码，保留这个别名
get_async_db = get_db


async def init_database():
    """初始化数据库"""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


async def close_database():
    """关闭数据库连接"""
    await engine.dispose()
    logger.info("Database connections closed")


# 数据库操作辅助函数
class DatabaseManager:
    """数据库管理器"""
    
    @staticmethod
    async def create_session() -> AsyncSession:
        """创建新的数据库会话"""
        return async_session_maker()
    
    @staticmethod
    async def execute_query(query, params=None):
        """执行原生SQL查询"""
        async with async_session_maker() as session:
            try:
                result = await session.execute(query, params or {})
                await session.commit()
                return result
            except Exception as e:
                await session.rollback()
                logger.error(f"Query execution failed: {e}")
                raise
    
    @staticmethod
    async def health_check() -> bool:
        """数据库健康检查"""
        try:
            async with async_session_maker() as session:
                await session.execute("SELECT 1")
                return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False