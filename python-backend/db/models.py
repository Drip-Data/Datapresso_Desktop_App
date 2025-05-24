"""
数据库模型定义
"""

from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.database import Base
import uuid
from datetime import datetime


def generate_uuid():
    """生成UUID"""
    return str(uuid.uuid4())


class BaseModel(Base):
    """基础模型类"""
    __abstract__ = True
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    is_deleted = Column(Boolean, default=False, index=True)


class SeedData(BaseModel):
    """种子数据模型"""
    __tablename__ = "seed_data"
    
    filename = Column(String, nullable=False, index=True)
    original_filename = Column(String, nullable=False)
    saved_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    record_count = Column(Integer, default=0)
    data_type = Column(String, index=True)  # general_qa, coding_tasks, etc.
    status = Column(String, default="uploaded", index=True)  # uploaded, validated, indexed, failed
    upload_date = Column(DateTime, default=func.now(), nullable=False, index=True)
    extra_metadata = Column(JSON, default=dict)  # 额外的元数据 # Renamed from metadata
    
    # 关联的任务
    generation_tasks = relationship("GenerationTask", back_populates="seed_data")
    assessment_tasks = relationship("AssessmentTask", back_populates="seed_data")


class Task(BaseModel):
    """任务基础模型"""
    __abstract__ = True
    
    name = Column(String, nullable=False) # Renamed from task_name
    task_type = Column(String, nullable=False, index=True)
    status = Column(String, default="pending", index=True)  # pending, running, completed, failed, cancelled
    progress = Column(Float, default=0.0)
    parameters = Column(JSON, default=dict) # Renamed from config
    result = Column(JSON, default=dict)
    error = Column(Text, nullable=True) # Renamed from error_message
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)


class GenerationTask(Task):
    """数据生成任务"""
    __tablename__ = "generation_tasks"
    
    seed_data_id = Column(String, ForeignKey("seed_data.id"), nullable=True, index=True)
    generation_method = Column(String, nullable=False)  # llm_based, template, variation
    target_count = Column(Integer, nullable=False)
    generated_count = Column(Integer, default=0)
    llm_model = Column(String, nullable=True)
    llm_params = Column(JSON, default=dict)
    
    # 关联
    seed_data = relationship("SeedData", back_populates="generation_tasks")
    generated_data = relationship("GeneratedData", back_populates="generation_task")


class GeneratedData(BaseModel):
    """生成的数据"""
    __tablename__ = "generated_data"
    
    generation_task_id = Column(String, ForeignKey("generation_tasks.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    generated_metadata = Column(JSON, default=dict) # Renamed from metadata
    quality_score = Column(Float, nullable=True)
    
    # 关联
    generation_task = relationship("GenerationTask", back_populates="generated_data")


class AssessmentTask(Task):
    """质量评估任务"""
    __tablename__ = "assessment_tasks"
    
    seed_data_id = Column(String, ForeignKey("seed_data.id"), nullable=True, index=True)
    generation_task_id = Column(String, ForeignKey("generation_tasks.id"), nullable=True, index=True)
    assessment_metrics = Column(JSON, default=list)  # 评估指标列表
    overall_score = Column(Float, nullable=True)
    metric_scores = Column(JSON, default=dict)  # 各指标得分
    
    # 关联
    seed_data = relationship("SeedData", back_populates="assessment_tasks")


class FilteringTask(Task):
    """数据筛选任务"""
    __tablename__ = "filtering_tasks"
    
    source_data_type = Column(String, nullable=False)  # seed_data, generated_data
    source_data_ids = Column(JSON, default=list)  # 源数据ID列表
    filter_conditions = Column(JSON, default=list)  # 筛选条件
    filtered_count = Column(Integer, default=0)
    
    # 关联的筛选结果
    filtered_results = relationship("FilteredData", back_populates="filtering_task")


class FilteredData(BaseModel):
    """筛选结果数据"""
    __tablename__ = "filtered_data"
    
    filtering_task_id = Column(String, ForeignKey("filtering_tasks.id"), nullable=False, index=True)
    original_data_id = Column(String, nullable=False, index=True)  # 原始数据ID
    original_data_type = Column(String, nullable=False)  # 原始数据类型
    filtered_content = Column(Text, nullable=False)
    filter_metadata = Column(JSON, default=dict)
    
    # 关联
    filtering_task = relationship("FilteringTask", back_populates="filtered_results")


class LLMProvider(BaseModel):
    """LLM服务提供商配置"""
    __tablename__ = "llm_providers"
    
    provider_name = Column(String, unique=True, nullable=False, index=True)
    provider_type = Column(String, nullable=False)  # openai, anthropic, etc.
    api_key = Column(String, nullable=True)  # 加密存储
    api_base_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    config = Column(JSON, default=dict)  # 提供商特定配置
    
    # 使用统计
    total_requests = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    last_used_at = Column(DateTime, nullable=True)


class ProjectConfig(BaseModel):
    """项目配置"""
    __tablename__ = "project_configs"
    
    project_name = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    config_data = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True, index=True)


class ApiUsageLog(BaseModel):
    """API使用日志"""
    __tablename__ = "api_usage_logs"
    
    endpoint = Column(String, nullable=False, index=True)
    method = Column(String, nullable=False)
    status_code = Column(Integer, nullable=False)
    response_time = Column(Float, nullable=False)
    request_size = Column(Integer, default=0)
    response_size = Column(Integer, default=0)
    user_agent = Column(String, nullable=True)
    ip_address = Column(String, nullable=True, index=True)
    error_message = Column(Text, nullable=True)


class SystemMetrics(BaseModel):
    """系统指标"""
    __tablename__ = "system_metrics"
    
    metric_name = Column(String, nullable=False, index=True)
    metric_value = Column(Float, nullable=False)
    metric_unit = Column(String, nullable=True)
    recorded_at = Column(DateTime, default=func.now(), nullable=False, index=True)
    metric_metadata = Column(JSON, default=dict) # Renamed from metadata
