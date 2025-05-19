from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional, Union
from enum import Enum
from datetime import datetime
import uuid

def generate_request_id():
    """生成唯一请求ID"""
    return str(uuid.uuid4())

class BaseRequest(BaseModel):
    """基础请求模型"""
    request_id: str = Field(default_factory=generate_request_id)
    timestamp: datetime = Field(default_factory=datetime.now)
    client_version: Optional[str] = None
    
    model_config = { # Pydantic V2 style
        "validate_assignment": True,
        "arbitrary_types_allowed": True
    }

class BaseResponse(BaseModel):
    """基础响应模型"""
    status: str  # "success" 或 "error"
    message: str
    request_id: str
    timestamp: datetime = Field(default_factory=datetime.now)
    execution_time_ms: Optional[float] = None  # 执行时间（毫秒）
    error_code: Optional[str] = None  # 错误代码(仅当status为error时)
    warnings: Optional[List[str]] = None  # 警告信息(不影响执行)
    
    model_config = { # Pydantic V2 style
        "validate_assignment": True,
        "arbitrary_types_allowed": True,
        "from_attributes": True # Pydantic V2 equivalent of orm_mode
    }
