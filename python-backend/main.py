"""
Datapresso Backend API
主要提供数据处理、LLM集成、质量评估等服务
"""

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
import uvicorn
import logging
import time
from contextlib import asynccontextmanager

# 路由导入
from routers import (
    llm_api,
    seed_data,
    data_filtering,
    data_generation,
    evaluation,
    quality_assessment,
    llamafactory
)

# 数据库和配置
from config import get_settings
from utils.logger import setup_logger
from utils.error_handler import global_exception_handler

# 数据库和配置 (放在路由导入之后，以避免潜在的循环依赖)
from db.database import engine, get_db
from db.models import Base

# 设置日志
setup_logger()
logger = logging.getLogger(__name__)

# 获取配置
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    logger.info("Starting Datapresso Backend...")
    
    # 启动时创建数据库表
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        raise
    
    yield
    
    # 关闭时清理资源
    logger.info("Shutting down Datapresso Backend...")
    await engine.dispose()


# 创建FastAPI应用
app = FastAPI(
    title="Datapresso API",
    description="AI数据处理和质量评估平台后端API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS中间件配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源以支持 Electron 文件协议和其他环境
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局异常处理
app.add_exception_handler(Exception, global_exception_handler)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """处理请求验证错误"""
    logger.warning(f"Validation error on {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        headers={"Access-Control-Allow-Origin": "*"},
        content={
            "status": "error",
            "message": "请求参数验证失败",
            "details": exc.errors()
        }
    )


# 健康检查端点
@app.get("/health")
async def health_check():
    """健康检查端点"""
    try:
        # 检查数据库连接
        async with engine.begin() as conn:
            await conn.execute("SELECT 1")
        
        return {
            "status": "healthy",
            "message": "Datapresso Backend is running",
            "version": "1.0.0",
            "components": {
                "database": "healthy",
                "api": "healthy"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            headers={"Access-Control-Allow-Origin": "*"}, # Add CORS header here too
            content={
                "status": "unhealthy",
                "message": "Service unavailable",
                "error": str(e)
            }
        )


@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "Welcome to Datapresso API",
        "docs": "/docs",
        "health": "/health"
    }


# 注册路由
app.include_router(llm_api.router, prefix="/llm_api", tags=["LLM API"])
app.include_router(seed_data.router, prefix="/seed_data", tags=["Seed Data"])
app.include_router(data_filtering.router, prefix="/data_filtering", tags=["Data Filtering"])
app.include_router(data_generation.router, prefix="/data_generation", tags=["Data Generation"])
app.include_router(evaluation.router, prefix="/evaluation", tags=["Evaluation"])
app.include_router(quality_assessment.router, prefix="/quality_assessment", tags=["Quality Assessment"])
app.include_router(llamafactory.router, prefix="/llamafactory", tags=["LlamaFactory"])

# 添加中间件记录请求
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """记录所有HTTP请求"""
    start_time = time.time()
    
    # 记录请求
    logger.info(f"Request: {request.method} {request.url}")
    
    response = await call_next(request)
    
    # 记录响应时间
    process_time = time.time() - start_time
    logger.info(f"Response: {response.status_code} - {process_time:.3f}s")
    
    return response


if __name__ == "__main__":
    import time
    
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="debug"  # Changed log_level to debug for more verbose output
    )
