"""
配置管理模块
"""

try:
    from pydantic_settings import BaseSettings
except ImportError:
    # 如果没有安装 pydantic-settings，尝试从 pydantic 导入
    try:
        from pydantic import BaseSettings
    except ImportError:
        raise ImportError("Please install pydantic-settings: pip install pydantic-settings")

from typing import Optional
import os


class Settings(BaseSettings):
    """应用配置"""
    
    # 应用基础配置
    app_name: str = "Datapresso Backend"
    debug: bool = False
    
    # 数据库配置
    database_url: str = "sqlite+aiosqlite:///./datapresso.db"
    
    # API配置
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    
    # 文件上传配置
    upload_dir: str = "./uploads"
    max_file_size: int = 100 * 1024 * 1024  # 100MB
    allowed_extensions: list = [".json", ".jsonl", ".csv", ".txt"]
    data_dir: str = "./data"  # 新增数据存储目录配置
    results_dir: str = "./results"  # 新增结果存储目录配置
    
    # LLM API配置
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    
    # 任务配置
    max_concurrent_tasks: int = 5
    task_timeout: int = 3600  # 1小时
    
    # 日志配置
    log_level: str = "INFO"
    log_file: str = "./logs/app.log"
    
    # 缓存配置
    cache_ttl: int = 3600  # 1小时
    
    # 安全配置
    secret_key: str = "datapresso-secret-key-change-in-production"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# 全局设置实例
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """获取配置实例（单例模式）"""
    global _settings
    if _settings is None:
        _settings = Settings()
        
        # 确保上传目录存在
        os.makedirs(_settings.upload_dir, exist_ok=True)
        os.makedirs(os.path.dirname(_settings.log_file), exist_ok=True)
        os.makedirs(_settings.data_dir, exist_ok=True)  # 确保数据目录存在
        os.makedirs(_settings.results_dir, exist_ok=True)  # 确保结果目录存在
        
    return _settings


# 常量定义
class TaskStatus:
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class DataType:
    GENERAL_QA = "general_qa"
    CODING_TASKS = "coding_tasks"
    CONVERSATIONS = "conversations"
    MATH_PROBLEMS = "math_problems"
    REASONING = "reasoning"
    OTHER = "other"


class GenerationMethod:
    LLM_BASED = "llm_based"
    TEMPLATE = "template"
    VARIATION = "variation"
    AUGMENTATION = "augmentation"


class QualityMetric:
    ACCURACY = "accuracy"
    COMPLETENESS = "completeness"
    CONSISTENCY = "consistency"
    DIVERSITY = "diversity"
    UNIQUENESS = "uniqueness"
    VALIDITY = "validity"
