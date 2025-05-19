import logging
import time # Keep for now, might be used by other models if any are kept
import asyncio # Keep for now
import uuid # Keep for now, used by generate_request_id if BaseRequest was here
from typing import Dict, Any, List, Optional, Union
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime

# Removed BaseRequest and its factory function as it's defined in schemas.py
# Removed LlmApiRequest, LlmApiMultimodalRequest, LlmBatchItem, LlmBatchCreateRequest
# as they are (or should be) defined in schemas.py and imported from there by routers.

# Removed unused imports related to LLM providers and db operations
# from llm_api.provider_factory import LLMProviderFactory
# from llm_api.constants import OPENAI_MODELS, ANTHROPIC_MODELS, GEMINI_MODELS, DEEPSEEK_MODELS

logger = logging.getLogger(__name__)

# --- Visualization and Data Export Schemas (Kept here for now) ---

class ChartType(str, Enum):
    """图表类型枚举"""
    BAR = "bar"
    LINE = "line"
    PIE = "pie"
    SCATTER = "scatter"
    HISTOGRAM = "histogram"
    HEATMAP = "heatmap"
    BOXPLOT = "boxplot"

class AggregationType(str, Enum):
    """聚合类型枚举"""
    SUM = "sum"
    MEAN = "mean"
    COUNT = "count"
    MAX = "max"
    MIN = "min"

class ExportFormat(str, Enum):
    """导出格式枚举"""
    PNG = "png"
    JPG = "jpg"
    SVG = "svg"
    PDF = "pdf"
    HTML = "html"

class VisualizationRequest(BaseModel): # This should inherit from schemas.BaseRequest if it's a top-level request
    """可视化请求模型"""
    # request_id: str = Field(default_factory=lambda: str(uuid.uuid4())) # Example if it were a BaseRequest
    data: List[Dict[str, Any]] = Field(..., description="要可视化的数据")
    chart_type: ChartType = Field(..., description="图表类型")
    config: Dict[str, Any] = Field(default_factory=dict, description="可视化配置")
    x_field: Optional[str] = Field(None, description="X轴字段")
    y_field: Optional[str] = Field(None, description="Y轴字段")
    group_by: Optional[str] = Field(None, description="分组字段")
    aggregation: Optional[AggregationType] = Field(None, description="聚合方式")
    export_format: Optional[ExportFormat] = Field(None, description="导出格式")

class DataExportRequest(BaseModel): # This should also inherit from schemas.BaseRequest
    """数据导出请求模型"""
    # request_id: str = Field(default_factory=lambda: str(uuid.uuid4())) # Example
    data: List[Dict[str, Any]] = Field(..., description="要导出的数据")
    file_format: str = Field(..., description="导出格式(csv, json, excel, xml)")
    filename: Optional[str] = Field(None, description="导出文件名")
    options: Dict[str, Any] = Field(default_factory=dict, description="导出选项")

# If these models (VisualizationRequest, DataExportRequest) are indeed used as API request bodies,
# they should ideally:
# 1. Inherit from schemas.BaseRequest (which is already defined in schemas.py).
# 2. Be moved to schemas.py for consistency.
# For now, they are left here to minimize changes beyond fixing the immediate ImportError.