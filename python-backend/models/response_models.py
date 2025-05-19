from .base import BaseResponse
from pydantic import BaseModel, Field # Added BaseModel
from typing import List, Dict, Any, Optional, Union
from enum import Enum
from datetime import datetime

class DataFilteringResponse(BaseResponse):
    """数据过滤响应模型"""
    filtered_data: List[Dict[str, Any]] = Field(..., description="过滤后的数据")
    total_count: int = Field(..., description="原始数据总数")
    filtered_count: int = Field(..., description="过滤后的数据数量")
    filter_summary: Optional[Dict[str, Any]] = Field(None, description="过滤摘要")
    page_info: Optional[Dict[str, Any]] = Field(None, description="分页信息")

class GeneratedDataStats(BaseModel):
    """生成数据统计信息"""
    field_distributions: Dict[str, Any] = Field(..., description="字段分布信息")
    unique_values_count: Dict[str, int] = Field(..., description="唯一值计数")
    min_max_values: Dict[str, Dict[str, Any]] = Field(..., description="最小最大值")
    null_counts: Dict[str, int] = Field(..., description="空值计数")
    schema_violations: Optional[List[Dict[str, Any]]] = Field(None, description="模式违规")
    correlation_matrix: Optional[Dict[str, Dict[str, float]]] = Field(None, description="相关性矩阵")

class DataGenerationResponse(BaseResponse):
    """数据生成响应模型"""
    generated_data: List[Dict[str, Any]] = Field(..., description="生成的数据")
    generation_method: str = Field(..., description="使用的生成方法")
    count: int = Field(..., description="生成的数据数量")
    stats: Optional[GeneratedDataStats] = Field(None, description="数据统计")
    warnings: Optional[List[str]] = Field(None, description="生成时的警告")
    seed_used: Optional[int] = Field(None, description="使用的随机种子")
    processing_info: Optional[Dict[str, Any]] = Field(None, description="处理信息")

class MetricScore(BaseModel):
    """指标得分模型"""
    metric: str = Field(..., description="指标名称")
    score: float = Field(..., description="得分")
    details: Optional[Dict[str, Any]] = Field(None, description="详细信息")
    passed: Optional[bool] = Field(None, description="是否通过阈值")
    issues: Optional[List[Dict[str, Any]]] = Field(None, description="问题列表")
    recommendations: Optional[List[str]] = Field(None, description="建议")

class EvaluationResponse(BaseResponse):
    """评估响应模型"""
    overall_score: float = Field(..., description="总体评分")
    metric_scores: List[MetricScore] = Field(..., description="各指标得分")
    visualization_data: Optional[Dict[str, Any]] = Field(None, description="可视化数据")
    recommendations: Optional[List[str]] = Field(None, description="建议")
    passed: Optional[bool] = Field(None, description="是否通过阈值")
    details_by_field: Optional[Dict[str, List[Dict[str, Any]]]] = Field(None, description="字段详情")

class LlamaFactoryResponse(BaseResponse):
    """LlamaFactory响应模型"""
    model_config = {'protected_namespaces': ()} # Allow model_name and model_info

    output_data: Dict[str, Any] = Field(..., description="输出数据")
    model_name: str = Field(..., description="模型名称")
    operation: str = Field(..., description="执行的操作")
    metrics: Optional[Dict[str, Any]] = Field(None, description="评估指标")
    resources_used: Optional[Dict[str, Any]] = Field(None, description="使用的资源")
    model_info: Optional[Dict[str, Any]] = Field(None, description="模型信息")
    checkpoint_path: Optional[str] = Field(None, description="检查点路径")
    logs: Optional[List[str]] = Field(None, description="处理日志")

class LlmApiResponse(BaseResponse):
    """LLM API响应模型"""
    result: Union[str, Dict[str, Any]] = Field(..., description="生成结果")
    model: str = Field(..., description="使用的模型")
    tokens_used: Optional[int] = Field(None, description="使用的token数")
    token_breakdown: Optional[Dict[str, int]] = Field(None, description="token使用明细")
    finish_reason: Optional[str] = Field(None, description="完成原因('stop','length'等)")
    provider: Optional[str] = Field(None, description="使用的提供商")
    cost: Optional[float] = Field(None, description="估计成本(美元)")

class EmbeddingsResponse(BaseResponse):
    """嵌入向量响应模型"""
    embedding: List[float] = Field(..., description="嵌入向量")
    dimensions: int = Field(..., description="向量维度")
    model: str = Field(..., description="使用的模型")
    provider: str = Field(..., description="使用的提供商")
    tokens: int = Field(..., description="使用的token数")
    cost: float = Field(..., description="估计成本(美元)")

class DocumentProcessResponse(BaseResponse):
    """文档处理响应模型"""
    chunks: List[str] = Field(..., description="文档块")
    embeddings: List[List[float]] = Field(..., description="嵌入向量列表")
    count: int = Field(..., description="块数量")
    model: str = Field(..., description="使用的模型")
    provider: str = Field(..., description="使用的提供商")
    total_tokens: int = Field(..., description="使用的token总数")
    cost: float = Field(..., description="估计成本(美元)")
    document_name: Optional[str] = Field(None, description="文档名称")

# Removed duplicate LlmApiResponse definition that started at old line 93.
# The first definition at old line 63 is kept.

class DimensionAssessment(BaseModel):
    """维度评估结果"""
    dimension: str = Field(..., description="评估维度")
    score: float = Field(..., ge=0.0, le=1.0, description="得分(0.0-1.0)")
    issues: List[Dict[str, Any]] = Field(..., description="问题列表")
    recommendations: List[str] = Field(..., description="建议列表")
    passed: Optional[bool] = Field(None, description="是否通过阈值")
    sample_issues: Optional[List[Dict[str, Any]]] = Field(None, description="示例问题")

class QualityAssessmentResponse(BaseResponse):
    """质量评估响应模型"""
    overall_score: float = Field(..., ge=0.0, le=1.0, description="总体评分(0.0-1.0)")
    dimension_scores: List[DimensionAssessment] = Field(..., description="各维度评估")
    summary: Dict[str, Any] = Field(..., description="评估摘要")
    passed_threshold: Optional[bool] = Field(None, description="是否通过总体阈值")
    report_url: Optional[str] = Field(None, description="报告URL(如生成了报告)")
    field_scores: Optional[Dict[str, float]] = Field(None, description="字段评分")
    improvement_priority: Optional[List[Dict[str, Any]]] = Field(None, description="改进优先级")
    visualizations: Optional[Dict[str, Any]] = Field(None, description="可视化数据")

class VisualizationResponse(BaseResponse):
    """可视化响应模型"""
    chart_data: Optional[Dict[str, Any]] = Field(None, description="图表数据")
    chart_config: Optional[Dict[str, Any]] = Field(None, description="图表配置")
    chart_type: Optional[str] = Field(None, description="图表类型")
    visualization_id: Optional[str] = Field(None, description="可视化ID")
    image_url: Optional[str] = Field(None, description="图片URL")
    html_content: Optional[str] = Field(None, description="HTML内容")

class DataImportResponse(BaseResponse):
    """数据导入响应模型"""
    data: List[Dict[str, Any]] = Field(..., description="导入的数据")
    file_info: Dict[str, Any] = Field(..., description="文件信息")
    inferred_schema: Optional[Dict[str, Any]] = Field(None, description="推断的数据模式") # Renamed from schema
    summary: Optional[Dict[str, Any]] = Field(None, description="数据摘要")

class DataExportResponse(BaseResponse):
    """数据导出响应模型"""
    file_url: str = Field(..., description="导出文件URL")
    file_path: str = Field(..., description="导出文件路径")
    file_size: int = Field(..., description="文件大小(字节)")
    row_count: int = Field(..., description="导出记录数")