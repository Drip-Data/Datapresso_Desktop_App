from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
import time
import os
from typing import Callable
from dotenv import load_dotenv
from contextlib import asynccontextmanager # Added for lifespan

# 加载环境变量
load_dotenv()

# 导入路由模块
from routers import (
    data_filtering, data_generation, evaluation, 
    llamafactory, llm_api, quality_assessment
)
from utils.logger import setup_logger
from utils.error_handler import handle_exception
from config import Settings, get_settings

# 设置日志
logger = setup_logger()

# 导入数据库初始化函数
from db.database import create_db_and_tables, get_async_db_contextmanager

# 导入 LlamaFactoryService 以加载现有任务
from core.llamafactory.llamafactory_service import LlamaFactoryService
from routers.llamafactory import get_llamafactory_service # To get the service instance

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 在应用启动时执行
    logger.info("Application startup: Initializing database...")
    await create_db_and_tables()
    logger.info("Database initialization complete.")

    # 加载 LlamaFactory 现有任务
    logger.info("Application startup: Loading existing LlamaFactory tasks...")
    try:
        # Need a DB session here. We can use a context manager for the session.
        async with get_async_db_contextmanager() as db:
            # Get the LlamaFactoryService instance.
            # Note: get_llamafactory_service creates a global instance if None.
            # This is okay for lifespan, as it runs once.
            lf_service = get_llamafactory_service() # This will initialize if not already
            if hasattr(lf_service, 'load_existing_tasks_async'):
                 await lf_service.load_existing_tasks_async(db)
            logger.info("LlamaFactory existing tasks loading process initiated.")
    except Exception as e:
        logger.error(f"Failed to load existing LlamaFactory tasks during startup: {e}", exc_info=True)
    
    yield
    # 在应用关闭时执行 (如果需要清理逻辑)
    logger.info("Application shutdown.")

# 创建FastAPI应用
app = FastAPI(
    title="Datapresso API",
    description="Datapresso 桌面应用后端 API",
    version="1.0.0",
    docs_url="/docs" if os.getenv("FASTAPI_ENV") == "development" else None,
    lifespan=lifespan # Added lifespan manager
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加请求处理中间件
@app.middleware("http")
async def add_process_time_header(request: Request, call_next: Callable):
    # 记录请求开始时间
    start_time = time.time()
    
    # 处理请求
    response = await call_next(request)
    
    # 计算处理时间
    process_time = (time.time() - start_time) * 1000
    response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
    
    # 记录请求日志
    logger.info(
        f"Request: {request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.2f}ms"
    )
    
    return response

# 注册路由
app.include_router(data_filtering.router, prefix="/data_filtering", tags=["Data Filtering"])
app.include_router(data_generation.router, prefix="/data_generation", tags=["Data Generation"])
app.include_router(evaluation.router, prefix="/evaluation", tags=["Evaluation"])
app.include_router(llamafactory.router, prefix="/llamafactory", tags=["LlamaFactory"])
app.include_router(llm_api.router, prefix="/llm_api", tags=["LLM API"])
app.include_router(quality_assessment.router, prefix="/quality_assessment", tags=["Quality Assessment"])

# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return handle_exception(request, exc)

@app.get("/")
async def root(settings: Settings = Depends(get_settings)):
    """API根路径，返回API信息"""
    return {
        "message": "Welcome to Datapresso API",
        "version": "1.0.0",
        "environment": settings.environment,
        "docs_url": "/docs" if settings.environment == "development" else None
    }

@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "timestamp": time.time()}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
