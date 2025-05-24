import os
from pathlib import Path
from pydantic import BaseSettings, Field
from typing import List

class Settings(BaseSettings):
    # 数据目录配置
    data_dir: str = Field(
        default_factory=lambda: str(Path(__file__).parent.parent / "data"),
        description="数据文件存储目录"
    )
    
    # 数据库配置
    database_url: str = Field(
        default="sqlite:///./datapresso.db",
        description="数据库连接URL"
    )
    
    # API配置
    api_host: str = Field(default="127.0.0.1", description="API服务器地址")
    api_port: int = Field(default=8000, description="API服务器端口")
    
    # CORS配置
    cors_origins: List[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"],
        description="允许的CORS源"
    )
    
    # 调试模式
    debug: bool = Field(default=True, description="调试模式")
    
    # 添加可能缺少的其他配置
    secret_key: str = Field(default="datapresso-secret-key", description="应用密钥")
    log_level: str = Field(default="INFO", description="日志级别")
    
    # 确保data目录存在
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # 确保data目录存在
        data_path = Path(self.data_dir)
        data_path.mkdir(parents=True, exist_ok=True)
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False