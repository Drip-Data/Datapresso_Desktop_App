import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
import re # Added import re
import os # Added import os
from pathlib import Path # Added import Path

logger = logging.getLogger(__name__)

def get_project_root() -> Path:
    """获取项目根目录 (python-backend的上一级目录)"""
    # 当前文件路径 -> utils -> python-backend -> project_root
    return Path(__file__).resolve().parent.parent.parent

def ensure_directory_exists(dir_path: Union[str, Path]):
    """确保目录存在，如果不存在则创建它"""
    path = Path(dir_path)
    if not path.exists():
        try:
            path.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created directory: {path}")
        except OSError as e:
            logger.error(f"Failed to create directory {path}: {e}")
            raise
    elif not path.is_dir():
        logger.error(f"Path {path} exists but is not a directory.")
        raise NotADirectoryError(f"Path {path} exists but is not a directory.")

def generate_unique_id(prefix: str = "id") -> str:
    """生成带前缀的唯一ID"""
    return f"{prefix}-{uuid.uuid4()}"

def serialize_datetime(dt: datetime) -> str:
    """将datetime对象序列化为ISO格式字符串"""
    if dt:
        return dt.isoformat()
    return ""

def deserialize_datetime(dt_str: str) -> Optional[datetime]:
    """将ISO格式字符串反序列化为datetime对象"""
    if dt_str:
        try:
            return datetime.fromisoformat(dt_str)
        except ValueError:
            logger.warning(f"Invalid datetime string for deserialization: {dt_str}")
            return None
    return None

def safe_json_loads(json_string: Optional[str], default: Any = None) -> Any:
    """安全地加载JSON字符串，失败时返回默认值"""
    if json_string is None:
        return default
    try:
        return json.loads(json_string)
    except (json.JSONDecodeError, TypeError) as e:
        logger.warning(f"Failed to parse JSON string: '{json_string[:100]}...'. Error: {e}")
        return default

def safe_json_dumps(data: Any, default: Optional[str] = None, indent: Optional[int] = None) -> Optional[str]:
    """安全地序列化为JSON字符串，失败时返回默认值"""
    try:
        return json.dumps(data, indent=indent, ensure_ascii=False)
    except TypeError as e:
        logger.warning(f"Failed to serialize data to JSON. Error: {e}")
        return default

def get_nested_value(data: Dict[str, Any], path: str, default: Any = None) -> Any:
    """
    安全地从嵌套字典中获取值。
    路径使用点号分隔，例如 "key1.key2.0.key3"
    """
    keys = path.split('.')
    current = data
    for key in keys:
        if isinstance(current, dict):
            current = current.get(key, default)
        elif isinstance(current, list):
            try:
                idx = int(key)
                if 0 <= idx < len(current):
                    current = current[idx]
                else:
                    return default
            except ValueError:
                return default # Key is not a valid list index
        else:
            return default
        if current is default: # if at any point we get the default, stop.
            break
    return current

def convert_to_camel_case(snake_str: str) -> str:
    """将下划线命名转换为驼峰命名"""
    if not snake_str:
        return ""
    components = snake_str.split('_')
    # 第一个组件保持原样，后续组件首字母大写
    return components[0] + "".join(x.title() for x in components[1:])

def convert_to_snake_case(camel_str: str) -> str:
    """将驼峰命名转换为下划线命名"""
    if not camel_str:
        return ""
    # 在大写字母前插入下划线，然后全部转为小写
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', camel_str)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

def clean_dict_for_orm(data: Dict[str, Any], allowed_fields: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    清理字典，只保留在 allowed_fields 中指定的键，
    或者移除值为 None 的键（如果 allowed_fields 未提供）。
    用于准备传递给 ORM 模型的参数。
    """
    if allowed_fields:
        return {k: v for k, v in data.items() if k in allowed_fields}
    else:
        return {k: v for k, v in data.items() if v is not None}

# 可以在这里添加更多通用的辅助函数，例如：
# - 文件操作辅助函数 (如安全读取、写入)
# - 数据清洗函数
# - 简单的文本处理函数

logger.info("helpers.py loaded")