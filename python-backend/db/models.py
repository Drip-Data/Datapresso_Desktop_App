from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

def generate_uuid():
    """生成唯一ID"""
    return str(uuid.uuid4())

class Project(Base):
    """项目模型"""
    __tablename__ = "projects"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    config = Column(JSON)  # 项目配置
    
    # 关系
    datasets = relationship("Dataset", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="project", cascade="all, delete-orphan")

class Dataset(Base):
    """数据集模型"""
    __tablename__ = "datasets"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    name = Column(String, nullable=False)
    description = Column(Text)
    file_path = Column(String)  # 相对路径
    format = Column(String)  # csv, json, etc.
    size = Column(Integer)  # 文件大小(字节)
    record_count = Column(Integer)  # 记录数量
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    dataset_metadata = Column(JSON)  # 元数据 (SQLAlchemy ORM 属性名和数据库列名统一)
    
    # 关系
    project = relationship("Project", back_populates="datasets")
    filters = relationship("Filter", back_populates="dataset", cascade="all, delete-orphan")

class Task(Base):
    """任务模型"""
    __tablename__ = "tasks"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    name = Column(String, nullable=False)
    task_type = Column(String, nullable=False)  # filtering, generation, evaluation, etc.
    status = Column(String, default="pending")  # pending, running, completed, failed, canceled
    progress = Column(Float, default=0.0)  # 0.0 - 1.0
    created_at = Column(DateTime, server_default=func.now())
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    parameters = Column(JSON)  # 任务参数
    result = Column(JSON)  # 结果摘要
    error = Column(Text)  # 错误信息
    
    # 关系
    project = relationship("Project", back_populates="tasks")

class Filter(Base):
    """过滤器模型"""
    __tablename__ = "filters"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    dataset_id = Column(String, ForeignKey("datasets.id"))
    name = Column(String, nullable=False)
    description = Column(Text)
    filter_type = Column(String)  # 过滤器类型
    conditions = Column(JSON)  # 过滤条件
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # 关系
    dataset = relationship("Dataset", back_populates="filters")

class Evaluation(Base):
    """评估模型"""
    __tablename__ = "evaluations"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"))
    name = Column(String, nullable=False)
    description = Column(Text)
    evaluation_type = Column(String)  # 评估类型
    dataset_id = Column(String)  # 相关数据集ID
    parameters = Column(JSON)  # 评估参数
    results = Column(JSON)  # 评估结果
    created_at = Column(DateTime, server_default=func.now())
    
    # 关系
    project = relationship("Project", back_populates="evaluations")

class Model(Base):
    """模型信息"""
    __tablename__ = "models"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    category = Column(String)  # Renamed from model_type, e.g., llm, classifier, etc.
    path = Column(String)  # 模型路径
    parameters = Column(JSON)  # 模型参数
    metrics = Column(JSON)  # 模型指标
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
