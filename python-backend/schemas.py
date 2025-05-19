from pydantic import BaseModel, Field, Json # Json might not be used directly here, but good to have if needed
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
import uuid
from enum import Enum # Added Enum for FilterOperation

# --- Base Schemas ---

class OrmBaseModel(BaseModel):
    model_config = { # Pydantic V2 style
        "from_attributes": True,
    }

def generate_uuid_str():
    return str(uuid.uuid4())

class BaseRequest(BaseModel): # Moved BaseRequest here
    """基础请求模型"""
    request_id: str = Field(default_factory=generate_uuid_str)
    timestamp: datetime = Field(default_factory=datetime.now)
    client_version: Optional[str] = None
    
    model_config = { # Pydantic V2 style
        "validate_assignment": True,
        "arbitrary_types_allowed": True, # Still relevant for Pydantic V1 compatibility if needed by some models
    }

# --- FilterOperation Enum ---
class FilterOperation(str, Enum):
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"
    STARTS_WITH = "starts_with"
    ENDS_WITH = "ends_with"
    IN_RANGE = "in_range"
    NOT_IN_RANGE = "not_in_range"
    REGEX_MATCH = "regex_match"
    IS_NULL = "is_null"
    IS_NOT_NULL = "is_not_null"

# --- FilterCondition Schema ---
class FilterCondition(BaseModel): # Assuming BaseModel is Pydantic's BaseModel, which is imported at the top
    field: str = Field(..., description="要过滤的字段名")
    operation: FilterOperation = Field(..., description="过滤操作符") # Changed type to FilterOperation Enum, Renamed from operator
    value: Any = Field(None, description="用于比较的值 (对于 IS_NULL/IS_NOT_NULL 可以为 None)") # Made value optional and default to None
    case_sensitive: Optional[bool] = Field(True, description="是否区分大小写 (主要用于字符串操作)") # Uncommented and ensured it exists

# --- DataFilteringRequest Schema ---
class DataFilteringRequest(BaseRequest):
    """数据过滤请求模型"""
    data: List[Dict[str, Any]] = Field(..., description="要过滤的数据列表")
    filter_conditions: List[FilterCondition] = Field(..., description="过滤条件列表")
    combine_operation: Optional[str] = Field("AND", description="条件组合方式 ('AND' 或 'OR')")
    limit: Optional[int] = Field(None, description="结果限制数量")
    offset: Optional[int] = Field(None, description="结果偏移量")
    order_by: Optional[str] = Field(None, description="排序字段")
    order_direction: Optional[str] = Field("asc", description="排序方向 ('asc' 或 'desc')")

# --- Data Generation Schemas ---

class GenerationMethod(str, Enum):
    VARIATION = "variation"
    TEMPLATE = "template"
    LLM_BASED = "llm_based"

class FieldConstraint(BaseModel):
    field: str = Field(..., description="约束的字段名")
    type: str = Field(..., description="字段期望的数据类型 (e.g., 'string', 'integer', 'float', 'boolean')")
    min_value: Optional[Union[int, float, str]] = Field(None, description="最小值（数值类型）或最小长度（字符串）") # str for len
    max_value: Optional[Union[int, float, str]] = Field(None, description="最大值（数值类型）或最大长度（字符串）") # str for len
    allowed_values: Optional[List[Any]] = Field(None, description="允许值的列表")
    regex_pattern: Optional[str] = Field(None, description="正则表达式模式 (字符串类型)")
    nullable: Optional[bool] = Field(True, description="是否允许为空 (默认为True，即允许空值)")
    unique: Optional[bool] = Field(False, description="是否要求唯一 (默认为False)") # Added unique
    # required: Optional[bool] = Field(None, description="字段是否必需") # Not currently used in service

class DataGenerationRequest(BaseRequest):
    """数据生成请求模型"""
    seed_data: Optional[List[Dict[str, Any]]] = Field(None, description="种子数据，用于变异或作为LLM参考")
    template: Optional[Dict[str, Any]] = Field(None, description="数据模板，用于模板生成")
    generation_method: GenerationMethod = Field(GenerationMethod.VARIATION, description="数据生成方法")
    count: int = Field(10, gt=0, description="要生成的数据项数量")
    field_constraints: Optional[List[FieldConstraint]] = Field(None, description="应用于生成数据的字段约束列表")
    variation_factor: Optional[float] = Field(None, ge=0.0, le=1.0, description="变异因子 (0.0-1.0)，用于变异方法")
    preserve_relationships: Optional[bool] = Field(True, description="在变异时是否尝试保持字段间的现有关系")
    random_seed: Optional[int] = Field(None, description="随机种子，用于可复现的生成")
    llm_prompt: Optional[str] = Field(None, description="用于 LLM_BASED 方法的用户提示")
    llm_model: Optional[str] = Field(None, description="用于 LLM_BASED 方法的 LLM 模型名称")
    # project_id: Optional[str] = None # If generation is tied to a project

# --- Task Schemas ---

class TaskBase(OrmBaseModel):
    name: str
    task_type: str
    status: Optional[str] = "pending"
    progress: Optional[float] = 0.0
    parameters: Optional[Dict[str, Any]] = None
    result: Optional[Dict[str, Any]] = None # Result summary
    error: Optional[str] = None

class TaskCreate(TaskBase):
    id: Optional[str] = Field(default_factory=generate_uuid_str) # Allow pre-setting ID, or generate
    project_id: Optional[str] = None 

class TaskUpdate(OrmBaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[float] = None
    parameters: Optional[Dict[str, Any]] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class TaskInDBBase(TaskBase):
    id: str # ID is now set by TaskCreate or default_factory in ORM
    project_id: Optional[str] = None
    created_at: datetime 
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class Task(TaskInDBBase): # Schema for reading/returning task data
    pass

# --- Project Schemas ---

class ProjectBase(OrmBaseModel):
    name: str
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

class ProjectCreate(ProjectBase):
    id: Optional[str] = Field(default_factory=generate_uuid_str)
    pass

class ProjectUpdate(OrmBaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

class ProjectInDBBase(ProjectBase):
    id: str
    created_at: datetime
    updated_at: datetime

class Project(ProjectInDBBase): 
    datasets: List['Dataset'] = [] 
    tasks: List[Task] = []
    evaluations: List['Evaluation'] = []

# --- Dataset Schemas ---

class DatasetBase(OrmBaseModel):
    name: str
    description: Optional[str] = None
    file_path: Optional[str] = None
    format: Optional[str] = None
    size: Optional[int] = None
    record_count: Optional[int] = None
    dataset_metadata: Optional[Dict[str, Any]] = None 

class DatasetCreate(DatasetBase):
    id: Optional[str] = Field(default_factory=generate_uuid_str)
    project_id: str

class DatasetUpdate(OrmBaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    file_path: Optional[str] = None
    format: Optional[str] = None
    size: Optional[int] = None
    record_count: Optional[int] = None
    dataset_metadata: Optional[Dict[str, Any]] = None

class DatasetInDBBase(DatasetBase):
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime

class Dataset(DatasetInDBBase): 
    filters: List['Filter'] = []

# --- Filter Schemas ---

class FilterBase(OrmBaseModel):
    name: str
    description: Optional[str] = None
    filter_type: Optional[str] = None
    conditions: Optional[Dict[str, Any]] = None 

class FilterCreate(FilterBase):
    id: Optional[str] = Field(default_factory=generate_uuid_str)
    dataset_id: str

class FilterUpdate(OrmBaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    filter_type: Optional[str] = None
    conditions: Optional[Dict[str, Any]] = None

class FilterInDBBase(FilterBase):
    id: str
    dataset_id: str
    created_at: datetime
    updated_at: datetime

class Filter(FilterInDBBase): 
    pass

# --- Evaluation Schemas ---

class EvaluationBase(OrmBaseModel):
    name: str
    description: Optional[str] = None
    evaluation_type: Optional[str] = None
    dataset_id: Optional[str] = None 
    parameters: Optional[Dict[str, Any]] = None
    results: Optional[Dict[str, Any]] = None

class EvaluationCreate(EvaluationBase):
    id: Optional[str] = Field(default_factory=generate_uuid_str)
    project_id: str

class EvaluationUpdate(OrmBaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    evaluation_type: Optional[str] = None
    dataset_id: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    results: Optional[Dict[str, Any]] = None

class EvaluationInDBBase(EvaluationBase):
    id: str
    project_id: str
    created_at: datetime

class Evaluation(EvaluationInDBBase):
    pass

class EvaluationRequest(BaseRequest): # New Request Schema
    """评估请求模型"""
    name: str
    project_id: str
    description: Optional[str] = None
    evaluation_type: Optional[str] = None
    dataset_id: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    # results are usually part of response, not request for creation
    # id will be generated by DB or can be part of Create schema if needed for specific cases

# --- Model Schemas (for trained/imported models) ---
# Note: Pydantic V2 UserWarning: Field "model_type" has conflict with protected namespace "model_".
# Consider renaming model_type to something like llm_model_type or custom_model_type
# or use model_config = {'protected_namespaces': ()} in ModelBase
class ModelBase(OrmBaseModel):
    name: str
    category: Optional[str] = Field(None, description="Category of the model, e.g., llm, classifier") # Renamed model_category to category
    path: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None

    model_config = { # Pydantic V2 style for config
        'protected_namespaces': (), # Allows fields like 'model_type'
        'from_attributes': True   # Equivalent to orm_mode = True
    }

class ModelCreate(ModelBase):
    id: Optional[str] = Field(default_factory=generate_uuid_str)
    pass 

class ModelUpdate(OrmBaseModel):
    name: Optional[str] = None
    category: Optional[str] = Field(None, description="Category of the model") # Renamed model_category to category
    path: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None

class ModelInDBBase(ModelBase):
    id: str
    created_at: datetime
    updated_at: datetime

class Model(ModelInDBBase): 
    pass

# --- LLM API Specific Request Schemas (Moved from models/request_models.py) ---

# --- Evaluation Metric Enum ---
class EvaluationMetric(str, Enum):
    COMPLETENESS = "completeness"
    ACCURACY = "accuracy"
    CONSISTENCY = "consistency"
    DIVERSITY = "diversity"
    RELEVANCE = "relevance"
    # Add other specific metrics as needed, e.g.:
    ROUGE_L = "rouge_l"
    BLEU = "bleu"
    BERT_SCORE = "bert_score"
    CUSTOM = "custom" # For custom metric code

class LlmApiRequest(BaseRequest):
    prompt: str = Field(..., description="提示词")
    model: str = Field("gpt-3.5-turbo", description="模型名称") # Renamed from model_name to avoid Pydantic warning
    system_message: Optional[str] = Field(None, description="系统消息")
    temperature: Optional[float] = Field(0.7, description="生成温度")
    max_tokens: Optional[int] = Field(1000, description="最大生成token数")
    top_p: Optional[float] = Field(1.0, description="Top-p采样")
    frequency_penalty: Optional[float] = Field(0.0, description="频率惩罚")
    presence_penalty: Optional[float] = Field(0.0, description="存在惩罚")
    stop_sequences: Optional[List[str]] = Field(None, description="停止序列")
    stream: Optional[bool] = Field(False, description="是否流式输出")
    timeout: Optional[float] = Field(60.0, description="超时时间(秒)")
    provider: Optional[str] = Field("openai", description="提供商('openai','anthropic','local'等)")

class LlmApiMultimodalRequest(BaseRequest):
    prompt: str = Field(..., description="文本提示词")
    images: List[str] = Field(..., description="图像列表 (URL 或 Base64 编码的字符串)")
    model: str = Field(..., description="模型名称") # Renamed
    system_message: Optional[str] = Field(None, description="系统消息")
    provider: Optional[str] = Field("openai", description="提供商 ('openai','anthropic','gemini' 等)")
    temperature: Optional[float] = Field(0.7, description="生成温度")
    max_tokens: Optional[int] = Field(1000, description="最大生成token数")

class LlmBatchItem(BaseModel): 
    custom_id: Optional[str] = Field(None, description="自定义项目ID，用于结果匹配")
    data: Dict[str, Any] = Field(..., description="用于填充提示模板的数据项")

class LlmBatchCreateRequest(BaseRequest):
    items: List[LlmBatchItem] = Field(..., min_length=1, description="要处理的数据项列表") # Changed min_items to min_length
    prompt_template: str = Field(..., description="提示词模板，使用 {key} 引用 item.data 中的字段")
    model: str = Field(..., description="应用于所有项目的模型名称") # Renamed
    system_prompt: Optional[str] = Field(None, description="应用于所有项目的系统提示词")
    provider: Optional[str] = Field("openai", description="提供商")
    use_batch_api: Optional[bool] = Field(True, description="是否尝试使用提供商的专用批量API（如果可用）")
    max_concurrent_requests: Optional[int] = Field(5, ge=1, le=100, description="当不使用专用批量API时，通用批量处理器的最大并发请求数")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0, description="生成温度")
    max_tokens: Optional[int] = Field(1000, ge=1, description="最大生成token数")
    top_p: Optional[float] = Field(None, ge=0.0, le=1.0, description="Top-p采样")
    frequency_penalty: Optional[float] = Field(None, ge=-2.0, le=2.0, description="频率惩罚")
    presence_penalty: Optional[float] = Field(None, ge=-2.0, le=2.0, description="存在惩罚")
    stop_sequences: Optional[List[str]] = Field(None, description="停止序列")

# --- Quality Assessment Schemas ---

class QualityDimension(str, Enum):
    """质量维度枚举"""
    COMPLETENESS = "completeness"
    ACCURACY = "accuracy"
    CONSISTENCY = "consistency"
    VALIDITY = "validity"
    UNIQUENESS = "uniqueness"
    DIVERSITY = "diversity"
    RELEVANCE = "relevance"
    ETHICAL = "ethical"
    TIMELINESS = "timeliness"
    READABILITY = "readability"

class QualityAssessmentRequest(BaseRequest):
    """质量评估请求模型"""
    data: List[Dict[str, Any]] = Field(..., description="要评估的数据")
    dimensions: List[QualityDimension] = Field(..., min_length=1, description="评估维度") # Changed min_items to min_length
    schema_definition: Optional[Dict[str, Any]] = Field(None, description="数据结构定义 (alias for schema to avoid Pydantic conflict)", alias="schema")
    reference_data: Optional[List[Dict[str, Any]]] = Field(None, description="参考数据")
    weights: Optional[Dict[str, float]] = Field(None, description="维度权重")
    threshold_scores: Optional[Dict[str, float]] = Field(None, description="各维度阈值")
    generate_report: Optional[bool] = Field(True, description="是否生成报告")
    report_format: Optional[str] = Field("json", description="报告格式('json','html','pdf')")
    detail_level: Optional[str] = Field("medium", description="详细程度('low','medium','high')")
    custom_rules: Optional[Dict[str, Any]] = Field(None, description="自定义评估规则")
    
    # Pydantic V2 does not use `values` in validators the same way.
    # We need to use model_validator for cross-field validation or individual field validators.
    # For simplicity, these validators are removed for now. If complex validation is needed,
    # it should be re-implemented using Pydantic V2 model_validators or field_validators.
    # @validator('weights')
    # def validate_weights(cls, weights, values):
    #     if weights:
    #         # `values.get('dimensions')` would not work directly in Pydantic V2 field validator for `weights`
    #         # This needs a model_validator.
    #         pass
    #     return weights
    
    # @validator('threshold_scores')
    # def validate_thresholds(cls, thresholds, values):
    #     if thresholds:
    #         for dim_name, score in thresholds.items():
    #             if score < 0 or score > 1:
    #                 raise ValueError(f"维度'{dim_name}'的阈值必须在0-1之间")
    #     return thresholds

# Update forward references
# For Pydantic V2, model_rebuild() is preferred if forward refs are complex or for post-init validation.
# update_forward_refs() is for Pydantic V1.
# If using Pydantic V2, and forward refs are simple strings, they often resolve automatically.
# If issues arise, use Model.model_rebuild().
Project.model_rebuild()
Dataset.model_rebuild()
# Task, Filter, Evaluation, Model schemas here don't have string forward refs in their direct definition that need explicit resolving here.
# Their fields like List[Task] use already defined Task schema.