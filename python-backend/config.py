import os
import yaml
import json
from pathlib import Path
from typing import Dict, Any, Optional
from pydantic import Field # Field remains in pydantic
from pydantic_settings import BaseSettings # BaseSettings moved to pydantic_settings
from functools import lru_cache

# 项目根目录
ROOT_DIR = Path(__file__).parent
CONFIG_DIR = ROOT_DIR / "config"

class Settings(BaseSettings):
    """基础设置模型"""
    environment: str = Field("development", env="FASTAPI_ENV")
    debug: bool = Field(False, env="DEBUG")
    port: int = Field(8000, env="PORT")
    log_level: str = Field("INFO", env="LOG_LEVEL")
    
    # 数据目录
    data_dir: str = Field("./data", env="DATA_DIR")
    cache_dir: str = Field("./cache", env="CACHE_DIR")
    results_dir: str = Field("./results", env="RESULTS_DIR")
    
    # LLM API配置
    openai_api_key: Optional[str] = Field(None, env="OPENAI_API_KEY")
    anthropic_api_key: Optional[str] = Field(None, env="ANTHROPIC_API_KEY")
    hosted_llm_api_url: Optional[str] = Field(None, env="HOSTED_LLM_API_URL")
    hosted_vllm_api_key: Optional[str] = Field(None, env="HOSTED_VLLM_API_KEY")
    
    # 数据库配置
    db_url: str = Field("sqlite:///./datapresso.db", env="DB_URL")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings() -> Settings:
    """获取全局设置（带缓存）"""
    return Settings()

def load_yaml_config(config_name: str) -> Dict[str, Any]:
    """加载YAML配置文件"""
    config_path = CONFIG_DIR / f"{config_name}.yaml"
    
    if not config_path.exists():
        return {}
    
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def load_json_config(config_name: str) -> Dict[str, Any]:
    """加载JSON配置文件"""
    config_path = CONFIG_DIR / f"{config_name}.json"
    
    if not config_path.exists():
        return {}
    
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_config(config_name: str, config_data: Dict[str, Any], format: str = "yaml") -> None:
    """保存配置到文件"""
    config_path = CONFIG_DIR / f"{config_name}.{format}"
    
    # 确保目录存在
    config_path.parent.mkdir(parents=True, exist_ok=True)
    
    if format.lower() == "yaml":
        with open(config_path, "w", encoding="utf-8") as f:
            yaml.dump(config_data, f, default_flow_style=False)
    elif format.lower() == "json":
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config_data, f, indent=2)
    else:
        raise ValueError(f"Unsupported config format: {format}")

def get_config(config_name: str, format: str = "yaml") -> Dict[str, Any]:
    """获取指定配置"""
    if format.lower() == "yaml":
        return load_yaml_config(config_name)
    elif format.lower() == "json":
        return load_json_config(config_name)
    else:
        raise ValueError(f"Unsupported config format: {format}")

def merge_configs(*configs) -> Dict[str, Any]:
    """合并多个配置"""
    result = {}
    
    for config in configs:
        _deep_update(result, config)
    
    return result

def _deep_update(target: Dict[str, Any], source: Dict[str, Any]) -> None:
    """深度更新字典"""
    for key, value in source.items():
        if key in target and isinstance(target[key], dict) and isinstance(value, dict):
            _deep_update(target[key], value)
        else:
            target[key] = value
