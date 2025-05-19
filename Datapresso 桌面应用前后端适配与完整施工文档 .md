# Datapresso 桌面应用前后端适配与施工文档 

---

## 目录

1. [项目简介](#1-项目简介)
2. [技术架构总览](#2-技术架构总览)
3. [环境准备与依赖安装](#3-环境准备与依赖安装)
4. [后端算法服务重构与接口设计](#4-后端算法服务重构与接口设计)
5. [Electron 主进程与后端服务桥接](#5-electron-主进程与后端服务桥接)
6. [前端调用与交互实现](#6-前端调用与交互实现)
7. [统一接口规范与错误处理](#7-统一接口规范与错误处理)
8. [前端交互设计与UI规范](#8-前端交互设计与UI规范)
9. [典型开发流程举例](#9-典型开发流程举例)
10. [常见问题与排查](#10-常见问题与排查)
11. [代码示例库](#11-代码示例库)
12. [测试与调试指南](#12-测试与调试指南)
13. [打包与部署](#13-打包与部署)
14. [项目维护与升级](#14-项目维护与升级)
15. [前后端参数映射、交互细节与最佳实践](#15-前后端参数映射交互细节与最佳实践)
16. [数据处理流程与算法实现](#16-数据处理流程与算法实现)
17. [系统配置与环境变量管理](#17-系统配置与环境变量管理)
18. [状态管理与数据持久化](#18-状态管理与数据持久化)
19. [任务调度与进度监控](#19-任务调度与进度监控)
20. [插件系统与扩展机制](#20-插件系统与扩展机制)

---

## 1. 项目简介

Datapresso 桌面应用是一个集数据处理、生成和评估功能于一体的工具，采用 Electron + Python (FastAPI) 架构。前端通过 Electron 主进程与 Python 后端算法服务通信，实现各种数据处理功能。本文档旨在为开发者提供一份可直接施工的详细指南。

### 1.1 核心功能模块

- **数据过滤 (data_filtering)**: 对输入数据进行过滤和预处理，支持多种条件组合和自定义规则
- **数据生成 (data_generation)**: 根据种子数据生成新的数据集，支持多种生成策略
- **评估 (evaluation)**: 对数据或模型进行评估和打分，生成详细报告
- **LlamaFactory**: Llama 系列模型的操作接口，支持训练、微调和推理
- **LLM API**: 大语言模型 API 的统一接口，支持多种模型和参数配置
- **质量评估 (quality_assessment)**: 对数据质量进行评估，支持多维度质量分析

### 1.2 目标用户群体

- **数据科学家**: 需要高效处理和生成数据的专业人员
- **AI研究人员**: 需要训练和评估模型的研究人员
- **业务分析师**: 需要进行数据质量评估的业务人员
- **开发人员**: 需要集成数据处理功能的应用开发者

### 1.3 核心价值主张

- **一站式数据处理**: 集成数据过滤、生成、评估等功能
- **本地化处理**: 数据不需上传云端，保护数据隐私
- **高度可定制**: 支持自定义处理规则和评估标准
- **模型训练支持**: 内置LlamaFactory，支持本地训练和微调
- **多源LLM集成**: 统一接口访问不同大语言模型服务

---

## 2. 技术架构总览

### 2.1 整体架构

- **前端**: Electron + HTML/JS/CSS (new-datapresso-interface)
- **主进程**: Electron 主进程，负责管理 Python 服务并通过 IPC 暴露 API
- **后端**: Python (FastAPI)，负责算法逻辑，暴露 RESTful API
- **通信方式**: 前后端均采用 POST 通信，主进程通过 IPC 桥接前端与后端
- **数据存储**: SQLite用于本地数据持久化，文件系统用于缓存和结果存储

### 2.2 详细架构图

```
┌────────────────────────────────────────────────────────────────────┐
│                        Electron 应用                                │
│                                                                    │
│  ┌───────────────────────────┐        ┌───────────────────────┐    │
│  │     渲染进程 (前端界面)     │        │      主进程           │    │
│  │                           │        │   (系统与API桥接)       │    │
│  │  ┌─────────────────────┐  │        │                       │    │
│  │  │ React/Vue 组件结构   │  │        │  ┌─────────────────┐  │    │
│  │  │ 或原生HTML/JS/CSS    │  │        │  │ Express 服务     │  │    │
│  │  └────────┬────────────┘  │        │  └────────┬────────┘  │    │
│  │           │               │  IPC   │           │           │    │
│  │  ┌────────┴────────────┐  │◄─────►│  ┌────────┴────────┐  │    │
│  │  │   前端API调用层      │  │        │  │  IPC 处理器     │  │    │
│  │  └────────┬────────────┘  │        │  └────────┬────────┘  │    │
│  └───────────┼───────────────┘        └───────────┼───────────┘    │
└───────────────┼───────────────────────────────────┼─────────────────┘
                │                                   │ HTTP
                │                                   ▼
┌───────────────┴───────────────────────────────────────────────────────┐
│                      Python FastAPI 服务                               │
│                                                                       │
│  ┌───────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │    路由层 (API)    │  │  服务层 (业务逻辑) │  │ 模型层 (数据定义)   │  │
│  └─────────┬─────────┘  └────────┬─────────┘  └──────────┬─────────┘  │
│            │                     │                       │            │
│  ┌─────────┴─────────────────────┴───────────────────────┴─────────┐  │
│  │                           算法模块                               │  │
│  │                                                                 │  │
│  │  ┌──────────────┐  ┌───────────────┐  ┌─────────────┐           │  │
│  │  │ data_filter  │  │ data_gener.   │  │ evaluation  │   ...     │  │
│  │  └──────────────┘  └───────────────┘  └─────────────┘           │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                   外部依赖与服务集成                              │  │
│  │                                                                 │  │
│  │  ┌───────────────┐  ┌─────────────────┐  ┌─────────────────┐    │  │
│  │  │ LlamaFactory  │  │ 外部LLM API      │  │ 数据库连接      │    │  │
│  │  └───────────────┘  └─────────────────┘  └─────────────────┘    │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

### 2.3 数据流程图

```
┌──────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│ 用户交互  │───►│ 前端组件  │───►│ API调用层 │───►│ IPC通信   │
└──────────┘    └───────────┘    └───────────┘    └─────┬─────┘
                                                        │
                                                        ▼
┌──────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│ 结果展示  │◄───│ 状态更新  │◄───│ 响应处理  │◄───│ HTTP响应  │
└──────────┘    └───────────┘    └───────────┘    └─────┬─────┘
                                                        │
                                                        ▼
┌──────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│ 后端路由  │───►│ 服务层    │───►│ 算法处理  │───►│ 数据持久化│
└──────────┘    └───────────┘    └───────────┘    └───────────┘
```

### 2.4 技术栈详情

#### 前端技术栈
- **UI框架**: 原生HTML/CSS/JS或React/Vue
- **构建工具**: Webpack/Rollup
- **状态管理**: 本地状态或Redux/Vuex
- **样式方案**: CSS/SCSS/Tailwind
- **HTTP客户端**: Axios (通过Electron IPC间接使用)

#### 后端技术栈
- **Web框架**: FastAPI
- **ORM**: SQLAlchemy (可选)
- **数据处理**: NumPy, Pandas, scikit-learn
- **模型操作**: LlamaFactory
- **API客户端**: requests, httpx

#### 持久化方案
- **本地数据库**: SQLite
- **缓存机制**: 文件系统缓存
- **日志系统**: 滚动文件日志
- **配置存储**: JSON/YAML配置文件

---

## 3. 环境准备与依赖安装

### 3.1 开发环境要求

- **操作系统**: Windows 10/11 (主要支持), macOS, Linux
- **Node.js**: v14.0.0 或更高 (推荐 v16+)
- **Python**: 3.8+ (推荐 3.9 或 3.10)
- **IDE**: Visual Studio Code (推荐)
- **GPU支持**: NVIDIA GPU (可选，用于LlamaFactory模型训练)

### 3.2 安装 Node.js 与 npm

1. 访问 [Node.js 官网](https://nodejs.org/) 下载并安装最新 LTS 版本
2. 验证安装:
   ```bash
   node -v
   npm -v
   ```
3. 配置npm镜像(可选，国内用户推荐):
   ```bash
   npm config set registry https://registry.npmmirror.com
   ```

### 3.3 安装 Python 3.8+

1. 访问 [Python 官网](https://www.python.org/downloads/) 下载并安装
2. 验证安装:
   ```bash
   python --version
   pip --version
   ```
3. 配置pip镜像(可选，国内用户推荐):
   ```bash
   pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
   ```

### 3.4 安装前端依赖

在项目根目录下执行:

```bash
# 安装基础依赖
npm install

# 安装Electron相关依赖
npm install electron electron-builder --save-dev

# 安装HTTP客户端
npm install axios --save

# 安装UI相关依赖(可选)
npm install tailwindcss postcss autoprefixer --save-dev
```

### 3.5 安装后端依赖

创建并激活虚拟环境:

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python -m venv venv
source venv/bin/activate
```

安装基础依赖:

```bash
# 安装Web框架和工具
pip install fastapi uvicorn pydantic

# 安装数据处理库
pip install numpy pandas scikit-learn

# 安装HTTP客户端
pip install requests httpx

# 安装数据库驱动
pip install sqlalchemy aiosqlite

# 安装工具库
pip install python-dotenv pyyaml
```

安装LlamaFactory(可选):
```bash
# 克隆仓库
git clone https://github.com/hiyouga/LLaMA-Factory.git
cd LLaMA-Factory

# 安装依赖
pip install -e .
```

### 3.6 VSCode设置(推荐)

创建`.vscode/settings.json`:

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/venv/Scripts/python",
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

### 3.7 环境变量设置

创建`.env`文件:

```
# 后端设置
FASTAPI_ENV=development
PORT=8000
LOG_LEVEL=INFO

# LLM API配置
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
HOSTED_VLLM_API_KEY=token-abc123

# 数据路径配置
DATA_DIR=./data
CACHE_DIR=./cache
RESULTS_DIR=./results
```

---

## 4. 后端算法服务重构与接口设计

### 4.1 目录结构

```
Datapresso_Desktop_App/
├─ python-backend/
│   ├─ main.py                   # FastAPI 主程序
│   ├─ requirements.txt          # 依赖列表
│   ├─ config.py                 # 配置加载
│   ├─ .env                      # 环境变量(不入版本控制)
│   ├─ models/                   # 数据模型
│   │   ├─ __init__.py
│   │   ├─ base.py               # 基础模型
│   │   ├─ request_models.py     # 请求模型
│   │   ├─ response_models.py    # 响应模型
│   │   └─ data_models.py        # 内部数据模型
│   ├─ routers/                  # API 路由
│   │   ├─ __init__.py
│   │   ├─ data_filtering.py
│   │   ├─ data_generation.py
│   │   ├─ evaluation.py
│   │   ├─ llamafactory.py
│   │   ├─ llm_api.py
│   │   └─ quality_assessment.py
│   ├─ utils/                    # 工具函数
│   │   ├─ __init__.py
│   │   ├─ error_handler.py      # 错误处理
│   │   ├─ logger.py             # 日志
│   │   ├─ validators.py         # 数据验证
│   │   └─ helpers.py            # 辅助函数
│   ├─ services/                 # 业务逻辑
│   │   ├─ __init__.py
│   │   ├─ data_filtering_service.py
│   │   ├─ data_generation_service.py
│   │   ├─ evaluation_service.py
│   │   ├─ llamafactory_service.py
│   │   ├─ llm_api_service.py
│   │   └─ quality_assessment_service.py
│   ├─ core/                     # 核心算法
│   │   ├─ __init__.py
│   │   ├─ data_filters/         # 数据过滤算法
│   │   ├─ data_generators/      # 数据生成算法
│   │   ├─ evaluators/           # 评估算法
│   │   ├─ llm_wrappers/         # LLM封装
│   │   └─ quality_assessors/    # 质量评估算法
│   ├─ db/                       # 数据库
│   │   ├─ __init__.py
│   │   ├─ session.py            # 数据库会话
│   │   ├─ models.py             # 数据库模型
│   │   └─ operations.py         # 数据库操作
│   └─ tests/                    # 测试
│       ├─ __init__.py
│       ├─ test_routers/
│       ├─ test_services/
│       └─ test_core/
├─ electron-app/                 # Electron应用
│   ├─ main/                     # 主进程
│   │   ├─ main.js               # 主进程入口
│   │   ├─ preload.js            # 预加载脚本
│   │   ├─ ipc-handlers.js       # IPC处理器
│   │   └─ backend-service.js    # 后端服务管理
│   ├─ renderer/                 # 渲染进程
│   │   ├─ index.html            # 主页面
│   │   ├─ css/                  # 样式文件
│   │   ├─ js/                   # JS脚本
│   │   └─ assets/               # 静态资源
│   └─ package.json              # NPM配置
└─ shared/                       # 共享资源
    ├─ schema/                   # 共享模式定义
    ├─ constants/                # 共享常量
    └─ utils/                    # 共享工具函数
```

### 4.2 数据模型定义

#### 基础模型 (base.py)

```python
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
    
    class Config:
        validate_assignment = True
        arbitrary_types_allowed = True

class BaseResponse(BaseModel):
    """基础响应模型"""
    status: str  # "success" 或 "error"
    message: str
    request_id: str
    timestamp: datetime = Field(default_factory=datetime.now)
    execution_time_ms: Optional[float] = None  # 执行时间（毫秒）
    error_code: Optional[str] = None  # 错误代码(仅当status为error时)
    warnings: Optional[List[str]] = None  # 警告信息(不影响执行)
    
    class Config:
        validate_assignment = True
        arbitrary_types_allowed = True
```

#### 请求模型 (request_models.py)

```python
from .base import BaseRequest
from pydantic import Field, validator
from typing import List, Dict, Any, Optional, Union
from enum import Enum
from datetime import datetime

# --- 数据过滤模型 ---

class FilterOperation(str, Enum):
    """过滤操作枚举"""
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

class FilterCondition(BaseModel):
    """过滤条件模型"""
    field: str = Field(..., description="要过滤的字段名")
    operation: FilterOperation = Field(..., description="过滤操作类型")
    value: Any = Field(None, description="过滤值(部分操作如IS_NULL不需要)")
    case_sensitive: Optional[bool] = Field(False, description="区分大小写(适用于字符串操作)")
    
    @validator('value', pre=True)
    def validate_value(cls, v, values):
        """验证value是否与operation匹配"""
        operation = values.get('operation')
        if operation in [FilterOperation.IS_NULL, FilterOperation.IS_NOT_NULL]:
            # 这些操作不需要value
            return None
        elif operation in [FilterOperation.IN_RANGE, FilterOperation.NOT_IN_RANGE]:
            # 这些操作需要List[Any]值
            if not isinstance(v, list) or len(v) != 2:
                raise ValueError(f"{operation}需要一个包含两个元素的列表")
        elif v is None:
            # 其他操作需要非空value
            raise ValueError(f"{operation}需要一个非空value")
        return v

class DataFilteringRequest(BaseRequest):
    """数据过滤请求模型"""
    data: List[Dict[str, Any]] = Field(..., description="要过滤的数据列表")
    filter_conditions: List[FilterCondition] = Field(..., description="过滤条件列表")
    combine_operation: str = Field("AND", description="条件组合方式('AND'或'OR')")
    limit: Optional[int] = Field(None, description="结果限制数量")
    offset: Optional[int] = Field(None, description="结果偏移量(分页)")
    order_by: Optional[str] = Field(None, description="排序字段")
    order_direction: Optional[str] = Field("asc", description="排序方向('asc'或'desc')")
    
    @validator('combine_operation')
    def validate_combine_operation(cls, v):
        if v not in ["AND", "OR"]:
            raise ValueError('combine_operation必须是"AND"或"OR"')
        return v
    
    @validator('order_direction')
    def validate_order_direction(cls, v):
        if v and v not in ["asc", "desc"]:
            raise ValueError('order_direction必须是"asc"或"desc"')
        return v

# --- 数据生成模型 ---

class GenerationMethod(str, Enum):
    """数据生成方法枚举"""
    VARIATION = "variation"       # 变异现有数据
    TEMPLATE = "template"         # 基于模板生成
    RULE_BASED = "rule_based"     # 基于规则生成
    ML_BASED = "ml_based"         # 基于机器学习生成
    LLM_BASED = "llm_based"       # 基于大语言模型生成

class FieldConstraint(BaseModel):
    """字段约束模型"""
    field: str = Field(..., description="字段名")
    type: str = Field(..., description="数据类型('string','number','boolean','date'等)")
    min_value: Optional[Any] = Field(None, description="最小值")
    max_value: Optional[Any] = Field(None, description="最大值")
    allowed_values: Optional[List[Any]] = Field(None, description="允许的值列表")
    format: Optional[str] = Field(None, description="格式('email','url','phone'等)")
    regex_pattern: Optional[str] = Field(None, description="正则表达式模式")
    nullable: Optional[bool] = Field(False, description="是否允许为空")
    unique: Optional[bool] = Field(False, description="是否要求唯一")

class DataGenerationRequest(BaseRequest):
    """数据生成请求模型"""
    seed_data: Optional[List[Dict[str, Any]]] = Field(None, description="种子数据")
    template: Optional[Dict[str, Any]] = Field(None, description="数据模板")
    generation_method: GenerationMethod = Field(..., description="生成方法")
    count: int = Field(..., gt=0, description="生成数据数量")
    field_constraints: Optional[List[FieldConstraint]] = Field(None, description="字段约束")
    variation_factor: Optional[float] = Field(None, ge=0.0, le=1.0, description="变异因子(0.0-1.0)")
    preserve_relationships: Optional[bool] = Field(True, description="保持字段间关系")
    random_seed: Optional[int] = Field(None, description="随机种子(用于重现结果)")
    llm_prompt: Optional[str] = Field(None, description="LLM生成提示(LLM_BASED方法使用)")
    llm_model: Optional[str] = Field("gpt-3.5-turbo", description="LLM模型名称(LLM_BASED方法使用)")

# --- 评估模型 ---

class EvaluationMetric(str, Enum):
    """评估指标枚举"""
    ACCURACY = "accuracy"
    COMPLETENESS = "completeness"
    CONSISTENCY = "consistency"
    DIVERSITY = "diversity"
    RELEVANCE = "relevance"
    CUSTOM = "custom"

class EvaluationRequest(BaseRequest):
    """评估请求模型"""
    data: List[Dict[str, Any]] = Field(..., description="要评估的数据")
    reference_data: Optional[List[Dict[str, Any]]] = Field(None, description="参考数据(如有)")
    metrics: List[EvaluationMetric] = Field(..., description="评估指标列表")
    custom_metric_code: Optional[str] = Field(None, description="自定义指标代码(用于CUSTOM)")
    weights: Optional[Dict[str, float]] = Field(None, description="各指标权重")
    threshold: Optional[float] = Field(None, description="通过阈值")
    schema: Optional[Dict[str, Any]] = Field(None, description="数据结构定义")
    detail_level: Optional[str] = Field("medium", description="详细程度('low','medium','high')")
    
    @validator('metrics')
    def validate_metrics(cls, metrics, values):
        if EvaluationMetric.CUSTOM in metrics and not values.get('custom_metric_code'):
            raise ValueError("使用CUSTOM指标时必须提供custom_metric_code")
        return metrics
    
    @validator('weights')
    def validate_weights(cls, weights, values):
        if weights:
            for metric in values.get('metrics', []):
                if metric.value not in weights:
                    raise ValueError(f"缺少指标'{metric.value}'的权重")
        return weights

# --- LlamaFactory模型 ---

class LlamaOperationType(str, Enum):
    """LlamaFactory操作类型"""
    TRAIN = "train"
    INFERENCE = "inference"
    SFT = "sft"
    DPO = "dpo"
    PPO = "ppo"
    EVAL = "eval"

class LlamaFactoryRequest(BaseRequest):
    """LlamaFactory请求模型"""
    input_data: Dict[str, Any] = Field(..., description="输入数据")
    llama_params: Dict[str, Any] = Field(..., description="LlamaFactory参数")
    model_name: str = Field(..., description="模型名称")
    operation: LlamaOperationType = Field(..., description="操作类型")
    batch_size: Optional[int] = Field(1, description="批处理大小")
    max_length: Optional[int] = Field(512, description="最大序列长度")
    temperature: Optional[float] = Field(0.7, description="生成温度")
    top_p: Optional[float] = Field(0.9, description="Top-p采样")
    save_result: Optional[bool] = Field(False, description="是否保存结果")
    result_path: Optional[str] = Field(None, description="结果保存路径")
    use_lora: Optional[bool] = Field(True, description="是否使用LoRA")
    lora_rank: Optional[int] = Field(8, description="LoRA秩")
    lora_alpha: Optional[int] = Field(16, description="LoRA alpha")
    tensor_parallel_size: Optional[int] = Field(1, description="张量并行大小")

# --- LLM API模型 ---

class LlmApiRequest(BaseRequest):
    """LLM API请求模型"""
    prompt: str = Field(..., description="提示词")
    model: str = Field("gpt-3.5-turbo", description="模型名称")
    system_message: Optional[str] = Field(None, description="系统消息")
    temperature: Optional[float] = Field(0.7, description="生成温度")
    max_tokens: Optional[int] = Field(256, description="最大token数")
    top_p: Optional[float] = Field(1.0, description="Top-p采样")
    frequency_penalty: Optional[float] = Field(0.0, description="频率惩罚")
    presence_penalty: Optional[float] = Field(0.0, description="存在惩罚")
    stop_sequences: Optional[List[str]] = Field(None, description="停止序列")
    stream: Optional[bool] = Field(False, description="是否流式输出")
    timeout: Optional[float] = Field(60.0, description="超时时间(秒)")
    provider: Optional[str] = Field("openai", description="提供商('openai','anthropic','local'等)")

# --- 质量评估模型 ---

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
    dimensions: List[QualityDimension] = Field(..., min_items=1, description="评估维度")
    schema: Optional[Dict[str, Any]] = Field(None, description="数据结构定义")
    reference_data: Optional[List[Dict[str, Any]]] = Field(None, description="参考数据")
    weights: Optional[Dict[str, float]] = Field(None, description="维度权重")
    threshold_scores: Optional[Dict[str, float]] = Field(None, description="各维度阈值")
    generate_report: Optional[bool] = Field(True, description="是否生成报告")
    report_format: Optional[str] = Field("json", description="报告格式('json','html','pdf')")
    detail_level: Optional[str] = Field("medium", description="详细程度('low','medium','high')")
    custom_rules: Optional[Dict[str, Any]] = Field(None, description="自定义评估规则")
    
    @validator('weights')
    def validate_weights(cls, weights, values):
        if weights:
            for dim in values.get('dimensions', []):
                if dim.value not in weights:
                    raise ValueError(f"缺少维度'{dim.value}'的权重")
        return weights
    
    @validator('threshold_scores')
    def validate_thresholds(cls, thresholds, values):
        if thresholds:
            for dim_name, score in thresholds.items():
                if score < 0 or score > 1:
                    raise ValueError(f"维度'{dim_name}'的阈值必须在0-1之间")
        return thresholds
```

#### 响应模型 (response_models.py)

```python
from .base import BaseResponse
from pydantic import Field
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
```

### 4.3 FastAPI 主程序

```python
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
import time
import os
from typing import Callable
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 导入路由模块
from routers import (
    data_filtering, data_generation, evaluation, 
    llamafactory, llm_api, quality_assessment
)
from utils.logger import setup_logger
from utils.error_handler import handle_exception
from config import Settings, get_settings

# 设置日志
logger = setup_logger()

# 创建FastAPI应用
app = FastAPI(
    title="Datapresso API",
    description="Datapresso 桌面应用后端 API",
    version="1.0.0",
    docs_url="/docs" if os.getenv("FASTAPI_ENV") == "development" else None
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加请求处理中间件
@app.middleware("http")
async def add_process_time_header(request: Request, call_next: Callable):
    # 记录请求开始时间
    start_time = time.time()
    
    # 处理请求
    response = await call_next(request)
    
    # 计算处理时间
    process_time = (time.time() - start_time) * 1000
    response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
    
    # 记录请求日志
    logger.info(
        f"Request: {request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.2f}ms"
    )
    
    return response

# 注册路由
app.include_router(data_filtering.router, prefix="/data_filtering", tags=["Data Filtering"])
app.include_router(data_generation.router, prefix="/data_generation", tags=["Data Generation"])
app.include_router(evaluation.router, prefix="/evaluation", tags=["Evaluation"])
app.include_router(llamafactory.router, prefix="/llamafactory", tags=["LlamaFactory"])
app.include_router(llm_api.router, prefix="/llm_api", tags=["LLM API"])
app.include_router(quality_assessment.router, prefix="/quality_assessment", tags=["Quality Assessment"])

# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return handle_exception(request, exc)

@app.get("/")
async def root(settings: Settings = Depends(get_settings)):
    """API根路径，返回API信息"""
    return {
        "message": "Welcome to Datapresso API",
        "version": "1.0.0",
        "environment": settings.environment,
        "docs_url": "/docs" if settings.environment == "development" else None
    }

@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "timestamp": time.time()}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
```

### 4.4 路由实现示例

以数据过滤路由为例：

```python
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from models.request_models import DataFilteringRequest
from models.response_models import DataFilteringResponse, BaseResponse
from services.data_filtering_service import DataFilteringService
import logging
import time
from typing import Any

router = APIRouter()
logger = logging.getLogger(__name__)

def get_data_filtering_service():
    """依赖注入：获取数据过滤服务实例"""
    return DataFilteringService()

@router.post("/filter", response_model=DataFilteringResponse)
async def filter_data(
    request: DataFilteringRequest,
    service: DataFilteringService = Depends(get_data_filtering_service)
):
    """
    对数据进行过滤处理
    
    - **data**: 需要过滤的数据列表
    - **filter_conditions**: 过滤条件列表
    - **combine_operation**: 条件组合方式('AND'或'OR')
    - **limit**: 结果限制数量(可选)
    - **offset**: A结果偏移量(可选)
    
    返回:
    - **filtered_data**: 过滤后的数据
    - **total_count**: 原始数据总数
    - **filtered_count**: 过滤后的数据数量
    - **filter_summary**: 过滤摘要
    """
    try:
        logger.info(f"Received filter request (id: {request.request_id}) with {len(request.data)} items")
        start_time = time.time()
        
        # 调用服务层处理过滤
        result = await service.filter_data(
            data=request.data,
            filter_conditions=request.filter_conditions,
            combine_operation=request.combine_operation,
            limit=request.limit,
            offset=request.offset,
            order_by=request.order_by,
            order_direction=request.order_direction
        )
        
        execution_time = (time.time() - start_time) * 1000
        logger.info(f"Filter completed (id: {request.request_id}), returning {len(result['filtered_data'])} items")
        
        # 构建响应
        return DataFilteringResponse(
            filtered_data=result["filtered_data"],
            total_count=len(request.data),
            filtered_count=len(result["filtered_data"]),
            filter_summary=result["summary"],
            page_info=result.get("page_info"),
            status="success",
            message="Data filtered successfully",
            request_id=request.request_id,
            execution_time_ms=execution_time
        )
    except Exception as e:
        logger.error(f"Error in filter_data (id: {request.request_id}): {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/async_filter", response_model=BaseResponse)
async def async_filter_data(
    request: DataFilteringRequest,
    background_tasks: BackgroundTasks,
    service: DataFilteringService = Depends(get_data_filtering_service)
):
    """
    异步执行数据过滤，适用于大数据集
    
    返回任务ID，可通过/task/{task_id}查询结果
    """
    try:
        logger.info(f"Received async filter request (id: {request.request_id}) with {len(request.data)} items")
        
        # 将过滤任务加入后台任务队列
        task_id = await service.start_async_filter_task(request)
        background_tasks.add_task(service.execute_async_filter_task, task_id)
        
        return BaseResponse(
            status="success",
            message=f"Async filter task started with ID: {task_id}",
            request_id=request.request_id
        )
    except Exception as e:
        logger.error(f"Error in async_filter_data (id: {request.request_id}): {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/task/{task_id}", response_model=Any)
async def get_filter_task_result(
    task_id: str,
    service: DataFilteringService = Depends(get_data_filtering_service)
):
    """获取异步过滤任务结果"""
    try:
        # 获取任务状态和结果
        task_status = await service.get_task_status(task_id)
        
        if task_status["status"] == "completed":
            return DataFilteringResponse(**task_status["result"])
        elif task_status["status"] == "running":
            return BaseResponse(
                status="pending",
                message=f"Task {task_id} is still running. Progress: {task_status.get('progress', 0)}%",
                request_id=task_id
            )
        elif task_status["status"] == "failed":
            return BaseResponse(
                status="error",
                message=f"Task {task_id} failed: {task_status.get('error', 'Unknown error')}",
                request_id=task_id,
                error_code="TASK_FAILED"
            )
        else:
            return BaseResponse(
                status="error", 
                message=f"Task {task_id} not found",
                request_id=task_id,
                error_code="TASK_NOT_FOUND"
            )
    except Exception as e:
        logger.error(f"Error retrieving task {task_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
```

### 4.5 服务层实现示例

```python
from typing import List, Dict, Any, Optional, Union
import logging
import asyncio
import uuid
import time
from models.request_models import FilterCondition
from core.data_filters.filter_engine import apply_filters
from db.operations import save_task, update_task, get_task

logger = logging.getLogger(__name__)

class DataFilteringService:
    """数据过滤服务"""
    
    async def filter_data(
        self,
        data: List[Dict[str, Any]],
        filter_conditions: List[FilterCondition],
        combine_operation: str = "AND",
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        order_by: Optional[str] = None,
        order_direction: Optional[str] = "asc"
    ) -> Dict[str, Any]:
        """
        执行数据过滤
        
        Args:
            data: 要过滤的数据
            filter_conditions: 过滤条件
            combine_operation: 条件组合方式
            limit: 结果限制
            offset: 结果偏移
            order_by: 排序字段
            order_direction: 排序方向
            
        Returns:
            包含过滤结果和摘要的字典
        """
        logger.debug(f"Filtering data with {len(filter_conditions)} conditions")
        
        # 1. 应用过滤条件
        filtered_data, filter_summary = apply_filters(
            data, 
            filter_conditions,
            combine_operation
        )
        
        # 2. 应用排序(如果指定)
        if order_by:
            reverse = order_direction.lower() == "desc"
            filtered_data = sorted(
                filtered_data,
                key=lambda x: x.get(order_by, ""),
                reverse=reverse
            )
        
        # 3. 应用分页(如果指定)
        total_filtered = len(filtered_data)
        page_info = None
        
        if offset is not None or limit is not None:
            start_idx = offset if offset is not None else 0
            end_idx = (start_idx + limit) if limit is not None else None
            
            filtered_data = filtered_data[start_idx:end_idx]
            
            # 构建分页信息
            page_info = {
                "total": total_filtered,
                "offset": start_idx,
                "limit": limit,
                "has_more": end_idx is not None and end_idx < total_filtered
            }
        
        # 4. 返回结果
        return {
            "filtered_data": filtered_data,
            "summary": filter_summary,
            "page_info": page_info
        }
    
    async def start_async_filter_task(self, request) -> str:
        """启动异步过滤任务，返回任务ID"""
        task_id = str(uuid.uuid4())
        
        # 保存任务信息到数据库
        await save_task(task_id, {
            "type": "data_filtering",
            "request": request.dict(),
            "status": "queued",
            "created_at": time.time()
        })
        
        return task_id
    
    async def execute_async_filter_task(self, task_id: str):
        """执行异步过滤任务"""
        try:
            # 更新任务状态为运行中
            await update_task(task_id, {"status": "running", "started_at": time.time()})
            
            # 获取任务请求
            task_info = await get_task(task_id)
            request = task_info["request"]
            
            # 执行过滤
            result = await self.filter_data(
                data=request["data"],
                filter_conditions=request["filter_conditions"],
                combine_operation=request["combine_operation"],
                limit=request.get("limit"),
                offset=request.get("offset"),
                order_by=request.get("order_by"),
                order_direction=request.get("order_direction")
            )
            
            # 构建响应
            response = {
                "filtered_data": result["filtered_data"],
                "total_count": len(request["data"]),
                "filtered_count": len(result["filtered_data"]),
                "filter_summary": result["summary"],
                "page_info": result.get("page_info"),
                "status": "success",
                "message": "Data filtered successfully",
                "request_id": request["request_id"],
                "execution_time_ms": (time.time() - task_info["started_at"]) * 1000
            }
            
            # 更新任务状态为完成
            await update_task(task_id, {
                "status": "completed", 
                "result": response,
                "completed_at": time.time()
            })
            
        except Exception as e:
            logger.error(f"Error in async filter task {task_id}: {str(e)}", exc_info=True)
            # 更新任务状态为失败
            await update_task(task_id, {
                "status": "failed",
                "error": str(e),
                "completed_at": time.time()
            })
    
    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """获取任务状态和结果"""
        task_info = await get_task(task_id)
        if not task_info:
            return {"status": "not_found"}
        
        return task_info
```

### 4.6 核心算法层示例

```python
# core/data_filters/filter_engine.py
from typing import List, Dict, Any, Tuple, Callable, Optional
import re
from models.request_models import FilterCondition, FilterOperation

def apply_filters(
    data: List[Dict[str, Any]],
    filter_conditions: List[FilterCondition],
    combine_operation: str = "AND"
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    应用过滤条件到数据集
    
    Args:
        data: 要过滤的数据列表
        filter_conditions: 过滤条件列表
        combine_operation: 条件组合方式('AND'或'OR')
        
    Returns:
        (filtered_data, filter_summary): 过滤后的数据和过滤摘要
    """
    # 初始化过滤摘要
    summary = {
        "total_items": len(data),
        "applied_conditions": len(filter_conditions),
        "combine_operation": combine_operation,
        "condition_matches": {},
        "fields_analyzed": set()
    }
    
    # 如果没有过滤条件，返回所有数据
    if not filter_conditions:
        return data, {
            **summary,
            "filtered_items": len(data),
            "message": "No filter conditions provided"
        }
    
    # 将每个过滤条件转换为过滤函数
    filter_funcs = []
    for condition in filter_conditions:
        filter_func = _create_filter_function(condition)
        filter_funcs.append((condition, filter_func))
        summary["fields_analyzed"].add(condition.field)
    
    # 应用过滤条件
    filtered_data = []
    for item in data:
        matches = []
        
        for condition, filter_func in filter_funcs:
            condition_key = f"{condition.field}_{condition.operation.value}"
            result = filter_func(item)
            matches.append(result)
            
            # 更新条件匹配计数
            if condition_key not in summary["condition_matches"]:
                summary["condition_matches"][condition_key] = 0
            if result:
                summary["condition_matches"][condition_key] += 1
        
        # 基于组合操作决定是否包含项目
        include_item = all(matches) if combine_operation == "AND" else any(matches)
        
        # 如果满足条件，添加到过滤结果
        if include_item:
            filtered_data.append(item)
    
    # 构建最终摘要
    summary["filtered_items"] = len(filtered_data)
    summary["fields_analyzed"] = list(summary["fields_analyzed"])
    summary["rejection_rate"] = (len(data) - len(filtered_data)) / len(data) if data else 0
    
    return filtered_data, summary

def _create_filter_function(condition: FilterCondition) -> Callable:
    """
    为给定的过滤条件创建过滤函数
    
    Args:
        condition: 过滤条件对象
        
    Returns:
        返回一个接受数据项并返回布尔值的函数
    """
    field = condition.field
    operation = condition.operation
    value = condition.value
    case_sensitive = condition.case_sensitive
    
    def filter_func(item: Dict[str, Any]) -> bool:
        # 获取字段值，如果不存在则返回None
        item_value = item.get(field)
        
        # 字符串值处理大小写敏感性
        if isinstance(item_value, str) and isinstance(value, str) and not case_sensitive:
            item_value = item_value.lower()
            compare_value = value.lower()
        else:
            compare_value = value
        
        # 根据操作类型应用不同的比较
        if operation == FilterOperation.EQUALS:
            return item_value == compare_value
        elif operation == FilterOperation.NOT_EQUALS:
            return item_value != compare_value
        elif operation == FilterOperation.GREATER_THAN:
            return item_value > compare_value if item_value is not None else False
        elif operation == FilterOperation.LESS_THAN:
            return item_value < compare_value if item_value is not None else False
        elif operation == FilterOperation.CONTAINS:
            return compare_value in item_value if isinstance(item_value, str) else False
        elif operation == FilterOperation.NOT_CONTAINS:
            return compare_value not in item_value if isinstance(item_value, str) else True
        elif operation == FilterOperation.STARTS_WITH:
            return item_value.startswith(compare_value) if isinstance(item_value, str) else False
        elif operation == FilterOperation.ENDS_WITH:
            return item_value.endswith(compare_value) if isinstance(item_value, str) else False
        elif operation == FilterOperation.IN_RANGE:
            return compare_value[0] <= item_value <= compare_value[1] if item_value is not None else False
        elif operation == FilterOperation.NOT_IN_RANGE:
            return not (compare_value[0] <= item_value <= compare_value[1]) if item_value is not None else True
        elif operation == FilterOperation.REGEX_MATCH:
            return bool(re.match(compare_value, item_value)) if isinstance(item_value, str) else False
        elif operation == FilterOperation.IS_NULL:
            return item_value is None
        elif operation == FilterOperation.IS_NOT_NULL:
            return item_value is not None
        else:
            raise ValueError(f"Unsupported filter operation: {operation}")
    
    return filter_func
```

### 4.6 错误处理

```python
from fastapi import Request
from fastapi.responses import JSONResponse
import logging
import traceback
from datetime import datetime
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# 错误码定义
class ErrorCode:
    VALIDATION_ERROR = "VALIDATION_ERROR"
    PROCESSING_ERROR = "PROCESSING_ERROR"
    NOT_FOUND = "NOT_FOUND"
    PERMISSION_ERROR = "PERMISSION_ERROR"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    INVALID_INPUT = "INVALID_INPUT"
    CONFIGURATION_ERROR = "CONFIGURATION_ERROR"
    RESOURCE_EXHAUSTED = "RESOURCE_EXHAUSTED"

def handle_exception(request: Request, exc: Exception) -> JSONResponse:
    """
    全局异常处理函数
    
    Args:
        request: FastAPI请求对象
        exc: 捕获的异常
        
    Returns:
        JSONResponse: 包含错误详情的JSON响应
    """
    # 提取请求信息
    path = request.url.path
    method = request.method
    
    # 生成请求ID(如果请求中没有)
    request_id = getattr(request.state, "request_id", f"err-{datetime.now().strftime('%Y%m%d%H%M%S')}")
    
    # 准备基本错误详情
    error_detail = str(exc)
    error_trace = traceback.format_exc()
    status_code = 500
    error_code = ErrorCode.INTERNAL_SERVER_ERROR
    
    # 根据异常类型确定状态码和错误码
    if hasattr(exc, "status_code"):
        status_code = exc.status_code
    
    # 处理不同类型的错误
    if "ValidationError" in exc.__class__.__name__:
        error_code = ErrorCode.VALIDATION_ERROR
        status_code = 400
        logger.warning(f"Validation error in {path}: {error_detail}")
    elif "NotFound" in exc.__class__.__name__:
        error_code = ErrorCode.NOT_FOUND
        status_code = 404
        logger.warning(f"Resource not found in {path}: {error_detail}")
    elif "Permission" in exc.__class__.__name__:
        error_code = ErrorCode.PERMISSION_ERROR
        status_code = 403
        logger.warning(f"Permission error in {path}: {error_detail}")
    elif "ValueError" == exc.__class__.__name__:
        error_code = ErrorCode.INVALID_INPUT
        status_code = 400
        logger.warning(f"Invalid input in {path}: {error_detail}")
    else:
        # 未分类的错误作为内部服务器错误处理
        logger.error(f"Unhandled exception in {method} {path}: {error_detail}")
        logger.debug(f"Error trace: {error_trace}")
    
    # 构建错误响应
    error_response = {
        "status": "error",
        "message": error_detail,
        "error_code": error_code,
        "request_id": request_id,
        "timestamp": datetime.now().isoformat(),
        "path": path
    }
    
    # 在开发环境中添加更多调试信息
    if logger.level <= logging.DEBUG:
        error_response["debug_info"] = {
            "error_type": exc.__class__.__name__,
            "error_location": _extract_error_location(error_trace)
        }
    
    return JSONResponse(
        status_code=status_code,
        content=error_response
    )

def _extract_error_location(trace: str) -> Optional[Dict[str, Any]]:
    """从错误堆栈中提取错误位置信息"""
    try:
        # 分析堆栈跟踪以查找最相关的错误位置
        lines = trace.strip().split('\n')
        
        # 寻找第一个应用代码相关的行
        for line in lines:
            if "File" in line and "site-packages" not in line:
                # 文件位置通常在第一个引号对之间
                file_start = line.find('"') + 1
                file_end = line.find('"', file_start)
                
                # 行号通常在"line"之后
                line_num_start = line.find("line") + 5
                line_num_end = line.find(",", line_num_start)
                
                # 返回位置信息
                return {
                    "file": line[file_start:file_end] if file_start > 0 else "unknown",
                    "line": int(line[line_num_start:line_num_end]) if line_num_start > 5 else 0
                }
        
        # 如果没有找到应用代码，返回最后一个错误位置
        if len(lines) >= 2:
            return {"trace": lines[-2:]}
        
        return None
    except Exception:
        return None
```

### 4.7 自定义错误类

```python
from fastapi import HTTPException
from typing import Any, Dict, Optional

class DatapressoException(HTTPException):
    """Datapresso应用的基础异常类"""
    
    def __init__(
        self, 
        status_code: int = 500, 
        detail: str = "An unexpected error occurred",
        error_code: str = "INTERNAL_ERROR",
        context: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code
        self.context = context or {}

class ValidationException(DatapressoException):
    """输入验证错误"""
    
    def __init__(self, detail: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=400, 
            detail=detail,
            error_code="VALIDATION_ERROR",
            context=context
        )

class ProcessingException(DatapressoException):
    """处理过程中发生的错误"""
    
    def __init__(self, detail: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=500, 
            detail=detail,
            error_code="PROCESSING_ERROR",
            context=context
        )

class ResourceNotFoundException(DatapressoException):
    """请求的资源未找到"""
    
    def __init__(self, resource_type: str, resource_id: str, context: Optional[Dict[str, Any]] = None):
        detail = f"{resource_type} with ID '{resource_id}' not found"
        super().__init__(
            status_code=404, 
            detail=detail,
            error_code="NOT_FOUND",
            context=context
        )

class ConfigurationException(DatapressoException):
    """配置错误"""
    
    def __init__(self, detail: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=500, 
            detail=detail,
            error_code="CONFIGURATION_ERROR",
            context=context
        )

class ExternalServiceException(DatapressoException):
    """外部服务调用错误"""
    
    def __init__(self, service_name: str, detail: str, context: Optional[Dict[str, Any]] = None):
        context = context or {}
        context["service"] = service_name
        super().__init__(
            status_code=502, 
            detail=f"Error in external service '{service_name}': {detail}",
            error_code="EXTERNAL_SERVICE_ERROR",
            context=context
        )
```
---

## 5. Electron 主进程与后端服务桥接

### 5.1 Electron 主进程配置

```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

// Python 进程引用
let pyProc = null;
const API_BASE_URL = 'http://127.0.0.1:8000';

// 创建主窗口
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // 加载前端页面
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }
}

// 启动 Python 后端服务
function startPythonServer() {
  console.log('Starting Python backend server...');
  
  // 判断开发环境还是生产环境
  let scriptPath;
  if (isDev) {
    scriptPath = path.join(__dirname, '../backend/main.py');
  } else {
    // 在打包后的应用中，Python可能在resources目录下
    scriptPath = path.join(process.resourcesPath, 'backend/main.py');
  }
  
  // 检查路径是否存在
  if (!fs.existsSync(scriptPath)) {
    console.error(`ERROR: Python script not found: ${scriptPath}`);
    return;
  }
  
  // 启动Python进程
  pyProc = spawn('python', [scriptPath]);
  
  pyProc.stdout.on('data', (data) => {
    console.log(`Python stdout: ${data}`);
  });
  
  pyProc.stderr.on('data', (data) => {
    console.error(`Python stderr: ${data}`);
  });
  
  pyProc.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
    pyProc = null;
  });
}

// 当Electron应用准备好时
app.whenReady().then(() => {
  startPythonServer();
  createWindow();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出时关闭Python进程
app.on('will-quit', () => {
  if (pyProc) {
    console.log('Killing Python backend process...');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', pyProc.pid, '/f', '/t']);
    } else {
      pyProc.kill();
    }
    pyProc = null;
  }
});

// IPC 通信处理
// 数据过滤
ipcMain.handle('api:data_filtering/filter', async (event, payload) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/data_filtering/filter`, payload);
    return response.data;
  } catch (error) {
    console.error('Error calling data_filtering/filter:', error);
    return {
      status: 'error',
      message: error.message,
      filtered_data: []
    };
  }
});

// 数据生成
ipcMain.handle('api:data_generation/generate', async (event, payload) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/data_generation/generate`, payload);
    return response.data;
  } catch (error) {
    console.error('Error calling data_generation/generate:', error);
    return {
      status: 'error',
      message: error.message,
      generated_data: []
    };
  }
});

// 评估
ipcMain.handle('api:evaluation/evaluate', async (event, payload) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/evaluation/evaluate`, payload);
    return response.data;
  } catch (error) {
    console.error('Error calling evaluation/evaluate:', error);
    return {
      status: 'error',
      message: error.message,
      score: null
    };
  }
});

// LlamaFactory
ipcMain.handle('api:llamafactory/run', async (event, payload) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/llamafactory/run`, payload);
    return response.data;
  } catch (error) {
    console.error('Error calling llamafactory/run:', error);
    return {
      status: 'error',
      message: error.message,
      output_data: {}
    };
  }
});

// LLM API
ipcMain.handle('api:llm_api/invoke', async (event, payload) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/llm_api/invoke`, payload);
    return response.data;
  } catch (error) {
    console.error('Error calling llm_api/invoke:', error);
    return {
      status: 'error',
      message: error.message,
      result: null
    };
  }
});

// 质量评估
ipcMain.handle('api:quality_assessment/assess', async (event, payload) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/quality_assessment/assess`, payload);
    return response.data;
  } catch (error) {
    console.error('Error calling quality_assessment/assess:', error);
    return {
      status: 'error',
      message: error.message,
      assessment: {}
    };
  }
});
```

### 5.2 预加载脚本

```javascript
const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 数据过滤
  filterData: (payload) => ipcRenderer.invoke('api:data_filtering/filter', payload),
  
  // 数据生成
  generateData: (payload) => ipcRenderer.invoke('api:data_generation/generate', payload),
  
  // 评估
  evaluateData: (payload) => ipcRenderer.invoke('api:evaluation/evaluate', payload),
  
  // LlamaFactory
  runLlamaFactory: (payload) => ipcRenderer.invoke('api:llamafactory/run', payload),
  
  // LLM API
  invokeLlm: (payload) => ipcRenderer.invoke('api:llm_api/invoke', payload),
  
  // 质量评估
  assessQuality: (payload) => ipcRenderer.invoke('api:quality_assessment/assess', payload)
});
```

---

## 6. 前端调用与交互实现

### 6.1 API 调用辅助函数

```javascript
// API 封装

/**
 * 数据过滤
 * @param {Array} data - 需要过滤的数据
 * @param {Object} filterParams - 过滤参数
 * @returns {Promise} - 过滤结果
 */
export async function filterData(data, filterParams) {
  try {
    const result = await window.electronAPI.filterData({
      data,
      filter_params: filterParams,
      request_id: generateRequestId()
    });
    
    return result;
  } catch (error) {
    console.error('Error filtering data:', error);
    throw error;
  }
}

/**
 * 数据生成
 * @param {Array} seedData - 种子数据
 * @param {Object} generationParams - 生成参数
 * @returns {Promise} - 生成结果
 */
export async function generateData(seedData, generationParams) {
  try {
    const result = await window.electronAPI.generateData({
      seed_data: seedData,
      generation_params: generationParams,
      request_id: generateRequestId()
    });
    
    return result;
  } catch (error) {
    console.error('Error generating data:', error);
    throw error;
  }
}

/**
 * 数据评估
 * @param {Array} data - 需要评估的数据
 * @param {Object} evalParams - 评估参数
 * @returns {Promise} - 评估结果
 */
export async function evaluateData(data, evalParams) {
  try {
    const result = await window.electronAPI.evaluateData({
      data,
      eval_params: evalParams,
      request_id: generateRequestId()
    });
    
    return result;
  } catch (error) {
    console.error('Error evaluating data:', error);
    throw error;
  }
}

/**
 * 运行LlamaFactory
 * @param {Object} inputData - 输入数据
 * @param {Object} llamaParams - 参数
 * @returns {Promise} - 运行结果
 */
export async function runLlamaFactory(inputData, llamaParams) {
  try {
    const result = await window.electronAPI.runLlamaFactory({
      input_data: inputData,
      llama_params: llamaParams,
      request_id: generateRequestId()
    });
    
    return result;
  } catch (error) {
    console.error('Error running LlamaFactory:', error);
    throw error;
  }
}

/**
 * 调用LLM API
 * @param {string} prompt - 提示词
 * @param {Object} llmParams - LLM参数
 * @returns {Promise} - LLM响应
 */
export async function invokeLlm(prompt, llmParams) {
  try {
    const result = await window.electronAPI.invokeLlm({
      prompt,
      llm_params: llmParams,
      request_id: generateRequestId()
    });
    
    return result;
  } catch (error) {
    console.error('Error invoking LLM:', error);
    throw error;
  }
}

/**
 * 质量评估
 * @param {Array} data - 需要评估的数据
 * @param {Object} qaParams - 评估参数
 * @returns {Promise} - 评估结果
 */
export async function assessQuality(data, qaParams) {
  try {
    const result = await window.electronAPI.assessQuality({
      data,
      qa_params: qaParams,
      request_id: generateRequestId()
    });
    
    return result;
  } catch (error) {
    console.error('Error assessing quality:', error);
    throw error;
  }
}

/**
 * 生成请求ID
 * @returns {string} - 唯一请求ID
 */
function generateRequestId() {
  return `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
```

### 6.2 前端组件示例: 数据过滤

```javascript
import { filterData } from '../api.js';

class DataFilteringComponent {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.isLoading = false;
    this.initialize();
  }
  
  initialize() {
    this.render();
    this.attachEventListeners();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="data-filtering-component">
        <h2>数据过滤</h2>
        
        <div class="form-group">
          <label for="threshold">阈值:</label>
          <input type="number" id="threshold" value="0" min="0" />
        </div>
        
        <div class="form-group">
          <label for="data-input">输入数据 (JSON):</label>
          <textarea id="data-input" rows="10" placeholder='[{"id": 1, "value": 5}, {"id": 2, "value": 10}]'></textarea>
        </div>
        
        <button id="filter-button" class="primary-button">过滤数据</button>
        
        <div class="loading-indicator" style="display: none;">正在处理...</div>
        
        <div class="form-group">
          <label for="result-output">结果:</label>
          <textarea id="result-output" rows="10" readonly></textarea>
        </div>
      </div>
    `;
  }
  
  attachEventListeners() {
    const filterButton = this.container.querySelector('#filter-button');
    filterButton.addEventListener('click', () => this.handleFilter());
  }
  
  async handleFilter() {
    if (this.isLoading) return;
    
    const thresholdInput = this.container.querySelector('#threshold');
    const dataInput = this.container.querySelector('#data-input');
    const resultOutput = this.container.querySelector('#result-output');
    const loadingIndicator = this.container.querySelector('.loading-indicator');
    
    try {
      // 解析输入
      const threshold = Number(thresholdInput.value);
      const data = JSON.parse(dataInput.value);
      
      // 显示加载状态
      this.isLoading = true;
      loadingIndicator.style.display = 'block';
      resultOutput.value = '';
      
      // 调用API
      const result = await filterData(data, { threshold, field: 'value' });
      
      // 显示结果
      resultOutput.value = JSON.stringify(result, null, 2);
    } catch (error) {
      resultOutput.value = `错误: ${error.message}`;
    } finally {
      // 恢复状态
      this.isLoading = false;
      loadingIndicator.style.display = 'none';
    }
  }
}

export default DataFilteringComponent;
```

### 6.3 HTML 入口文件

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Datapresso Desktop</title>
  <link rel="stylesheet" href="styles/main.css">
</head>
<body>
  <div class="app-container">
    <header class="app-header">
      <h1>Datapresso Desktop</h1>
    </header>
    
    <nav class="app-nav">
      <ul>
        <li><a href="#" data-tab="data-filtering">数据过滤</a></li>
        <li><a href="#" data-tab="data-generation">数据生成</a></li>
        <li><a href="#" data-tab="evaluation">评估</a></li>
        <li><a href="#" data-tab="llamafactory">LlamaFactory</a></li>
        <li><a href="#" data-tab="llm-api">LLM API</a></li>
        <li><a href="#" data-tab="quality-assessment">质量评估</a></li>
      </ul>
    </nav>
    
    <main class="app-content">
      <div id="data-filtering" class="tab-content active"></div>
      <div id="data-generation" class="tab-content"></div>
      <div id="evaluation" class="tab-content"></div>
      <div id="llamafactory" class="tab-content"></div>
      <div id="llm-api" class="tab-content"></div>
      <div id="quality-assessment" class="tab-content"></div>
    </main>
    
    <footer class="app-footer">
      <p>Datapresso Desktop &copy; 2023</p>
    </footer>
  </div>

  <script type="module" src="scripts/app.js"></script>
</body>
</html>
```

### 6.4 前端主逻辑

```javascript
import DataFilteringComponent from './components/DataFilteringComponent.js';
// 导入其他组件...

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  // 初始化组件
  const dataFilteringComponent = new DataFilteringComponent('data-filtering');
  // 初始化其他组件...
  
  // 标签页切换逻辑
  const tabLinks = document.querySelectorAll('.app-nav a');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // 更新活动标签
      tabLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // 显示对应内容
      const targetTab = link.getAttribute('data-tab');
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === targetTab) {
          content.classList.add('active');
        }
      });
    });
  });
  
  // 默认显示第一个标签
  tabLinks[0].click();
});
```

---

## 7. 统一接口规范与错误处理

### 7.1 接口规范

所有 API 遵循以下规范:

1. **请求方法**: 统一使用 POST
2. **输入参数**: JSON 格式，包含各模块所需的数据和参数
3. **输出格式**: 统一包含 status、message 和实际数据字段
4. **状态字段**: success(成功)或error(失败)

### 7.2 错误处理策略

1. **前端错误处理**:
   - 网络错误: 提示用户检查网络连接
   - 数据解析错误: 提示用户检查输入格式
   - API错误: 显示后端返回的错误消息

2. **后端错误处理**:
   - 输入验证错误: 返回 400 状态码和详细错误信息
   - 算法处理错误: 捕获异常并返回 500 状态码
   - 未授权错误: 返回 401 状态码

### 7.3 错误处理示例

前端错误处理示例:

```javascript
try {
  const result = await filterData(data, filterParams);
  // 处理成功结果
  if (result.status === 'success') {
    displayResults(result.filtered_data);
  } else {
    showErrorMessage(result.message);
  }
} catch (error) {
  // 处理网络错误等
  showErrorMessage(`请求失败: ${error.message}`);
}
```

---

## 8. 前端交互设计与UI规范

### 8.1 整体布局

Datapresso 桌面应用的前端采用现代化的分区布局设计：

1. **顶部区域**：Logo、标题和全局操作按钮
2. **左侧侧边栏**：功能导航菜单
3. **主内容区**：功能操作界面和数据展示
4. **右侧面板**（可折叠）：上下文帮助和参数设置
5. **底部状态栏**：操作状态和简要信息



### 8.3 用户体验流程

以下是主要功能模块的用户体验流程设计：

#### 8.3.1 数据过滤流程

1. **输入数据**：
   - 允许上传JSON文件
   - 提供文本区域直接输入JSON数据
   - 提供示例数据按钮

2. **配置过滤参数**：
   - 提供字段选择下拉菜单
   - 提供条件选择器（等于、大于、小于等）
   - 提供值输入框
   - 支持添加多个过滤条件

3. **执行过滤**：
   - 显示加载状态和进度条
   - 操作完成后显示结果条数信息

4. **查看和导出结果**：
   - 表格形式展示过滤结果
   - 提供导出为JSON、CSV选项
   - 提供可视化图表选项

#### 8.3.2 数据生成流程

1. **选择生成模式**：
   - 基于种子数据生成
   - 基于模板生成
   - 基于规则生成

2. **配置生成参数**：
   - 设置生成数量
   - 配置数据变异度
   - 配置字段约束

3. **预览和确认**：
   - 预览部分生成数据样例
   - 允许调整参数并重新预览

4. **生成和处理**：
   - 显示进度信息
   - 分批处理大量数据

#### 8.3.3 质量评估流程

1. **输入待评估数据**：
   - 上传或粘贴数据
   - 选择已处理的数据集

2. **选择评估维度**：
   - 完整性检查
   - 一致性检查
   - 准确性评估
   - 多样性评估

3. **执行评估**：
   - 显示评估进度
   - 可取消长时间运行的评估

4. **查看评估报告**：
   - 评分卡展示关键指标
   - 详细问题列表
   - 可视化图表分析
   - 改进建议

### 8.4 交互设计原则

1. **即时反馈**：每个操作都提供即时视觉反馈
2. **渐进式展示**：复杂功能采用分步引导
3. **容错设计**：输入验证与友好错误提示
4. **一致性**：相似功能保持一致的操作方式
5. **效率优先**：为重复操作提供快捷方式

### 8.5 响应式设计考虑

虽然桌面应用通常运行在固定尺寸的窗口中，但仍需考虑以下响应式设计因素：

1. **窗口大小适应**：
   - 最小窗口尺寸：900 x 600 像素
   - 支持布局调整和面板折叠
   - 表格和图表自动缩放

2. **高DPI支持**：
   - 矢量图标和样式
   - 适配高分辨率屏幕的文本和UI元素

3. **辅助功能**：
   - 支持键盘导航
   - 符合WCAG 2.0 AA级标准
   - 支持系统深色/浅色模式

---

## 9. 典型开发流程举例

### 9.1 开发新功能流程

1. **后端开发**：
   - 在 `backend/models` 中定义请求和响应模型
   - 在 `backend/services` 中实现业务逻辑
   - 在 `backend/routers` 中创建 API 端点

2. **主进程桥接**：
   - 在 `electron/main.js` 中添加新的 IPC 处理函数
   - 实现 HTTP 到 IPC 的转发逻辑

3. **前端实现**：
   - 在 `src/scripts/api.js` 中添加 API 调用函数
   - 创建相应的 UI 组件
   - 处理用户交互和结果展示

### 9.2 完整示例: 添加数据排序功能

1. **后端模型**：

```python
# 添加到 models/request_models.py
class DataSortingRequest(BaseRequest):
    """数据排序请求模型"""
    data: List[Dict[str, Any]]
    sort_params: Dict[str, Any]

# 添加到 models/response_models.py
class DataSortingResponse(BaseResponse):
    """数据排序响应模型"""
    sorted_data: List[Dict[str, Any]]
```

2. **后端服务**：

```python
# services/data_sorting_service.py
def sort_data_service(data, sort_params):
    field = sort_params.get('field', 'value')
    reverse = sort_params.get('reverse', False)
    
    sorted_data = sorted(data, key=lambda x: x.get(field, 0), reverse=reverse)
    return sorted_data
```

3. **后端路由**：

```python
# routers/data_sorting.py
from fastapi import APIRouter
from models.request_models import DataSortingRequest
from models.response_models import DataSortingResponse
from services.data_sorting_service import sort_data_service

router = APIRouter()

@router.post("/sort", response_model=DataSortingResponse)
async def sort_data(request: DataSortingRequest):
    sorted_data = sort_data_service(request.data, request.sort_params)
    return DataSortingResponse(
        sorted_data=sorted_data,
        status="success",
        message="Data sorted successfully",
        request_id=request.request_id
    )
```

4. **主进程桥接**：

```javascript
// 添加到 main.js
ipcMain.handle('api:data_sorting/sort', async (event, payload) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/data_sorting/sort`, payload);
    return response.data;
  } catch (error) {
    console.error('Error calling data_sorting/sort:', error);
    return {
      status: 'error',
      message: error.message,
      sorted_data: []
    };
  }
});
```

5. **前端 API**：

```javascript
// 添加到 api.js
export async function sortData(data, sortParams) {
  try {
    const result = await window.electronAPI.sortData({
      data,
      sort_params: sortParams,
      request_id: generateRequestId()
    });
    
    return result;
  } catch (error) {
    console.error('Error sorting data:', error);
    throw error;
  }
}
```

6. **前端组件**：

```javascript
// components/DataSortingComponent.js
import { sortData } from '../api.js';

class DataSortingComponent {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.initialize();
  }
  
  // 实现组件逻辑...
}
```

---

## 10. 常见问题与排查

### 10.1 Python 服务启动失败

**症状**: Electron 应用启动，但无法连接到后端 API

**排查步骤**：
1. 检查 Electron 控制台输出，寻找 Python 启动错误
2. 确认 Python 路径正确，尝试单独启动 Python 服务
3. 检查端口占用情况，确保 8000 端口可用
4. 确认所有 Python 依赖已安装

**解决方案**：
- 调整 Python 启动命令
- 更换端口
- 安装缺失依赖

### 10.2 IPC 通信失败

**症状**: 前端调用 API 时报错或无响应

**排查步骤**：
1. 检查 preload.js 是否正确暴露 API
2. 检查前端调用是否使用正确的函数名
3. 查看主进程日志中的 IPC 错误

**解决方案**：
- 更正 preload.js 中的 API 暴露
- 修正前端调用方式
- 确保输入数据格式正确

### 10.3 数据格式错误

**症状**: API 调用返回 400 错误

**排查步骤**：
1. 检查前端发送的数据格式
2. 确认与后端定义的模型匹配
3. 验证 JSON 解析/序列化操作

**解决方案**：
- 修正前端数据结构
- 调整后端模型验证
- 添加前端数据验证

---

## 11. 代码示例库

### 11.1 完整 API 调用示例

```javascript
// 数据过滤示例
async function filterDataExample() {
  const data = [
    { id: 1, value: 5 },
    { id: 2, value: 10 },
    { id: 3, value: 15 }
  ];
  
  const filterParams = {
    threshold: 7,
    field: 'value'
  };
  
  try {
    const result = await filterData(data, filterParams);
    console.log('Filtered data:', result.filtered_data);
  } catch (error) {
    console.error('Filter failed:', error);
  }
}

// 数据生成示例
async function generateDataExample() {
  const seedData = [
    { id: 1, value: 5 },
    { id: 2, value: 10 }
  ];
  
  const generationParams = {
    count: 5,
    variance: 0.2
  };
  
  try {
    const result = await generateData(seedData, generationParams);
    console.log('Generated data:', result.generated_data);
  } catch (error) {
    console.error('Generation failed:', error);
  }
}

// LLM API 调用示例
async function llmApiExample() {
  const prompt = "生成一个关于数据科学的短文";
  
  const llmParams = {
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    max_tokens: 100
  };
  
  try {
    const result = await invokeLlm(prompt, llmParams);
    console.log('LLM result:', result.result);
  } catch (error) {
    console.error('LLM API call failed:', error);
  }
}
```

### 11.2 错误处理示例

```javascript
// 通用错误处理函数
function handleApiError(error, component) {
  if (error.response) {
    // 服务器响应错误
    const status = error.response.status;
    const message = error.response.data.message || 'Unknown server error';
    
    switch (status) {
      case 400:
        component.showError(`请求参数错误: ${message}`);
        break;
      case 401:
        component.showError('未授权访问，请重新登录');
        break;
      case 500:
        component.showError(`服务器内部错误: ${message}`);
        break;
      default:
        component.showError(`请求失败 (${status}): ${message}`);
    }
  } else if (error.request) {
    // 请求发送但无响应
    component.showError('服务器无响应，请检查网络连接');
  } else {
    // 请求配置错误
    component.showError(`请求错误: ${error.message}`);
  }
}
```

---

## 12. 测试与调试指南

### 12.1 后端测试

1. **单独测试 FastAPI**：

```bash
cd backend
pytest  # 运行单元测试
```

2. **API 测试**：

```bash
# 启动服务
uvicorn main:app --reload

# 使用 curl 测试
curl -X POST http://localhost:8000/data_filtering/filter \
  -H "Content-Type: application/json" \
  -d '{"data":[{"id":1,"value":5},{"id":2,"value":10}],"filter_params":{"threshold":7}}'
```

3. **访问 Swagger 文档**：

打开浏览器访问 `http://localhost:8000/docs`

### 12.2 前端调试

1. **开启 DevTools**：

```javascript
// main.js
mainWindow.webContents.openDevTools();
```

2. **使用 console.log**：

```javascript
console.log('API请求数据:', payload);
console.log('API响应结果:', result);
```

3. **使用网络面板**：

在 DevTools 中监控网络请求，查看请求响应详情

### 12.3 Electron 主进程调试

添加详细日志：

```javascript
console.log('[Main Process] Starting Python backend...');
console.log('[Main Process] API request:', channel, payload);
```

---

## 13. 打包与部署

### 13.1 准备打包配置

创建 `electron-builder.yml`：

```yaml
appId: "com.example.datapresso"
productName: "Datapresso Desktop"
directories:
  output: "dist"
  buildResources: "build"
files:
  - "build/**/*"
  - "node_modules/**/*"
  - "package.json"
extraResources:
  - from: "backend"
    to: "backend"
  - from: "venv/Lib/site-packages"
    to: "site-packages"
```

### 13.2 打包脚本

添加到 `package.json`：

```json
"scripts": {
  "start": "electron .",
  "build": "react-scripts build",
  "package": "electron-builder build --win --publish never",
  "package-all": "electron-builder build -mwl"
}
```

### 13.3 打包步骤

1. 安装打包依赖：

```bash
npm install electron-builder --save-dev
```

2. 构建前端：

```bash
npm run build
```

3. 打包应用：

```bash
npm run package
```

---

## 14. 项目维护与升级

### 14.1 版本管理

- 为前后端接口添加版本号
- 在更新时保持向后兼容性
- 遵循语义化版本规范

### 14.2 接口变更流程

1. 添加新接口版本
2. 保留旧接口一段时间
3. 前端适配新接口
4. 弃用旧接口

### 14.3 日志与监控

- 实现详细的应用日志记录
- 捕获并上报关键错误
- 定期检查日志发现问题

---

## 15. 前后端参数映射、交互细节与最佳实践

### 15.1 参数映射规范与数据流

#### 15.1.1 命名规范与类型映射

前端和后端参数命名应遵循一致的规范，确保数据传输的准确性：

| 后端(Python) | 前端(JavaScript) | 说明 |
|-------------|-----------------|------|
| snake_case | camelCase | 后端使用下划线命名，前端使用驼峰命名 |
| Dict[str, Any] | Object | 字典/对象映射 |
| List[T] | Array<T> | 列表/数组映射 |
| Optional[T] | T \| null | 可选值映射 |
| Enum | string | 枚举映射为字符串 |

示例映射：

```python
# 后端模型
class FilterParams(BaseModel):
    field: str
    operation: FilterOperation
    threshold: Optional[float] = None
```

```javascript
// 前端参数构建
const filterParams = {
  field: 'quality_score',
  operation: 'greater_than',
  threshold: 0.8
};
```

#### 15.1.2 请求-响应数据流

**标准数据流程**：

1. 前端组件收集用户输入，构建请求参数
2. 通过API辅助函数调用Electron IPC
3. 主进程转发至Python后端
4. 后端处理后返回结构化响应
5. 前端解析响应并更新UI

**数据验证层级**：

1. **前端输入验证**：在UI组件中验证用户输入格式和范围
2. **API调用验证**：在API辅助函数中验证参数格式
3. **后端模型验证**：使用Pydantic模型验证请求数据
4. **算法层验证**：在核心算法中验证业务逻辑

### 15.2 交互模式与状态传递

#### 15.2.1 同步与异步交互

**同步交互**：适用于快速完成的操作
- 前端显示加载状态
- 主进程等待后端响应
- 响应返回后更新UI

**异步交互**：适用于长时间运行的任务
- 前端发起请求并获取任务ID
- 定期轮询任务状态
- 支持取消操作
- 任务完成后获取结果

#### 15.2.2 状态码与错误处理

标准响应状态：

| 状态 | 说明 | 前端处理 |
|------|------|---------|
| success | 操作成功 | 显示结果，更新UI |
| error | 操作失败 | 显示错误信息 |
| pending | 异步任务进行中 | 显示进度，允许取消 |

错误码映射：

| 错误码 | 说明 | 前端处理建议 |
|--------|------|-------------|
| VALIDATION_ERROR | 参数验证失败 | 高亮显示问题字段，提示修正方法 |
| PROCESSING_ERROR | 处理过程错误 | 显示详细错误并提供重试选项 |
| EXTERNAL_SERVICE_ERROR | 外部服务错误 | 建议用户检查API密钥或网络连接 |
| RESOURCE_EXHAUSTED | 资源不足 | 提示用户减小数据量或释放资源 |

### 15.3 具体模块交互示例

#### 15.3.1 数据过滤交互

```javascript
// 前端交互示例
async function handleFilterData() {
  // 1. 收集过滤参数
  const filterConditions = buildFilterConditionsFromUI();
  
  // 2. 显示加载状态
  setLoading(true);
  
  try {
    // 3. 调用API
    const result = await filterData(inputData, {
      filter_conditions: filterConditions,
      combine_operation: combineOperation,
      limit: pageSize,
      offset: (currentPage - 1) * pageSize
    });
    
    // 4. 处理结果
    if (result.status === 'success') {
      setFilteredData(result.filtered_data);
      setFilterSummary(result.filter_summary);
      showSuccessMessage(`已筛选出 ${result.filtered_count} 条数据`);
    } else {
      showErrorMessage(result.message);
    }
  } catch (error) {
    handleApiError(error);
  } finally {
    setLoading(false);
  }
}
```

#### 15.3.2 数据生成交互

```javascript
// 前端交互示例
async function handleGenerateData() {
  // 1. 收集生成参数
  const generationMethod = selectedMethod;
  const generationParams = {
    count: generationCount,
    seed_data: seedData,
    generation_method: generationMethod,
    variation_factor: variationFactor,
    field_constraints: buildFieldConstraints()
  };
  
  // 2. 对于大量数据，使用异步模式
  if (generationCount > 1000) {
    const taskResult = await startAsyncGeneration(generationParams);
    if (taskResult.status === 'success') {
      setTaskId(taskResult.task_id);
      startProgressPolling(taskResult.task_id);
    } else {
      showErrorMessage(taskResult.message);
    }
  } else {
    // 3. 小量数据，使用同步模式
    setLoading(true);
    try {
      const result = await generateData(generationParams);
      if (result.status === 'success') {
        setGeneratedData(result.generated_data);
        setDataStats(result.stats);
      } else {
        showErrorMessage(result.message);
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }
}
```

### 15.4 最佳实践与注意事项

#### 15.4.1 前端最佳实践

1. **参数构建辅助函数**：创建专用函数生成复杂参数，而不是直接在组件中构建
2. **错误处理统一化**：使用统一的错误处理函数，根据错误类型显示不同提示
3. **状态管理清晰化**：使用明确的loading、error、data状态，避免状态混乱
4. **用户反馈即时化**：所有操作都提供即时反馈，长时操作显示进度
5. **数据验证多层化**：在UI层、API调用层都进行数据验证，减轻后端压力

#### 15.4.2 后端最佳实践

1. **模型验证严格化**：使用Pydantic的验证器确保数据完整性和业务规则
2. **错误信息详细化**：返回具体的错误字段和建议修正方法
3. **大数据异步处理**：对于大量数据操作，提供异步处理接口
4. **版本兼容维护**：接口升级时保持向后兼容，避免前端频繁适配
5. **性能监控内置化**：记录操作耗时，为前端提供性能反馈

## 16. 数据处理流程与算法实现

### 16.1 数据过滤模块 (data_filtering)

#### 16.1.1 处理流程

1. **输入阶段**：接收数据集和过滤条件
2. **条件解析**：将前端过滤条件转换为可执行的过滤函数
3. **数据过滤**：应用过滤函数到数据集
4. **后处理**：排序、分页、统计
5. **输出阶段**：返回过滤后的数据和统计信息

#### 16.1.2 核心算法实现

```python
def apply_filter_condition(item, condition):
    """应用单个过滤条件到数据项"""
    field = condition.field
    operation = condition.operation
    value = condition.value
    
    # 获取字段值
    item_value = item.get(field)
    
    # 应用操作
    if operation == "equals":
        return item_value == value
    elif operation == "not_equals":
        return item_value != value
    elif operation == "greater_than":
        return isinstance(item_value, (int, float)) and item_value > value
    elif operation == "less_than":
        return isinstance(item_value, (int, float)) and item_value < value
    elif operation == "contains":
        return isinstance(item_value, str) and value in item_value
    # ... 其他操作类型
    
def filter_data(data, filter_conditions, combine_operation="AND"):
    """过滤数据集"""
    if not filter_conditions:
        return data, {"filtered_count": len(data), "total_count": len(data)}
    
    filtered_data = []
    for item in data:
        results = [apply_filter_condition(item, condition) for condition in filter_conditions]
        
        # 根据组合操作符决定结果
        if combine_operation == "AND" and all(results):
            filtered_data.append(item)
        elif combine_operation == "OR" and any(results):
            filtered_data.append(item)
    
    # 生成过滤统计
    stats = {
        "total_count": len(data),
        "filtered_count": len(filtered_data),
        "rejection_rate": (len(data) - len(filtered_data)) / len(data) if data else 0
    }
    
    return filtered_data, stats
```

#### 16.1.3 优化策略

1. **条件预编译**：将过滤条件预编译为函数，避免重复解析
2. **惰性求值**：对于大数据集，使用生成器惰性处理
3. **索引优化**：对常用过滤字段建立内存索引
4. **并行处理**：对独立数据块并行应用过滤条件

### 16.2 数据生成模块 (data_generation)

#### 16.2.1 处理流程

1. **输入阶段**：接收种子数据和生成参数
2. **生成策略选择**：根据参数选择生成方法
3. **数据生成**：执行生成算法
4. **约束应用**：应用字段约束和验证规则
5. **数据验证**：验证生成数据的质量和合规性
6. **输出阶段**：返回生成数据和统计信息

#### 16.2.2 生成策略实现

**变异生成 (Variation)**：

```python
def generate_variations(seed_data, count, variation_factor=0.2):
    """基于种子数据生成变异数据"""
    result = []
    seed_count = len(seed_data)
    
    for i in range(count):
        # 随机选择一个种子
        seed_item = seed_data[random.randint(0, seed_count - 1)]
        new_item = copy.deepcopy(seed_item)
        
        # 对数值字段应用变异
        for key, value in new_item.items():
            if isinstance(value, (int, float)):
                # 在原值基础上添加随机变异
                variation = value * variation_factor * (random.random() * 2 - 1)
                new_item[key] = value + variation
            elif isinstance(value, str) and random.random() < variation_factor:
                # 对字符串应用变异（如截断、替换字符等）
                if len(value) > 3 and random.random() < 0.5:
                    cut_point = random.randint(1, len(value) - 2)
                    new_item[key] = value[:cut_point] + value[cut_point+1:]
        
        result.append(new_item)
    
    return result
```

**模板生成 (Template)**：

```python
def generate_from_template(template, count, field_constraints=None):
    """基于模板生成数据"""
    result = []
    
    for i in range(count):
        item = {}
        
        for field, field_template in template.items():
            if isinstance(field_template, dict) and "type" in field_template:
                # 处理类型化模板
                field_type = field_template["type"]
                if field_type == "integer":
                    min_val = field_template.get("min", 0)
                    max_val = field_template.get("max", 100)
                    item[field] = random.randint(min_val, max_val)
                elif field_type == "float":
                    min_val = field_template.get("min", 0.0)
                    max_val = field_template.get("max", 1.0)
                    item[field] = min_val + random.random() * (max_val - min_val)
                elif field_type == "string":
                    pattern = field_template.get("pattern", "[A-Za-z]{5,10}")
                    item[field] = generate_string_from_pattern(pattern)
                elif field_type == "choice":
                    choices = field_template.get("choices", [])
                    item[field] = random.choice(choices) if choices else None
            else:
                # 直接使用提供的值
                item[field] = field_template
        
        # 应用字段约束
        if field_constraints:
            apply_field_constraints(item, field_constraints)
        
        result.append(item)
    
    return result
```

**LLM生成 (LLM-based)**：

```python
async def generate_with_llm(prompt, count, model="gpt-3.5-turbo", temperature=0.7):
    """使用LLM生成数据"""
    system_message = f"""
    你是一个数据生成助手。请生成{count}条符合以下要求的数据条目：
    - 每条数据必须是有效的JSON对象
    - 数据应该多样化且合理
    - 遵循提供的字段约束
    """
    
    # 构建完整提示
    full_prompt = f"{prompt}\n请生成{count}条数据，以JSON数组格式返回。"
    
    try:
        # 调用LLM服务
        llm_response = await llm_service.invoke_llm(
            system_message=system_message,
            prompt=full_prompt,
            model=model,
            temperature=temperature
        )
        
        # 解析LLM响应
        try:
            # 尝试提取JSON部分
            json_str = extract_json_from_text(llm_response.result)
            generated_data = json.loads(json_str)
            
            # 验证生成的数据
            if isinstance(generated_data, list) and len(generated_data) > 0:
                return generated_data
            else:
                return [{"error": "Generated data is not a valid list"}]
        except json.JSONDecodeError:
            return [{"error": "Failed to parse JSON from LLM response"}]
    except Exception as e:
        return [{"error": f"LLM generation failed: {str(e)}"}]
```

#### 16.2.3 质量控制机制

1. **模式验证**：验证生成数据符合预定义模式
2. **一致性检查**：确保关联字段之间保持一致
3. **重复性检测**：检测并处理重复数据
4. **异常值过滤**：识别并处理异常值
5. **人工干预点**：提供人工审核入口

### 16.3 评估模块 (evaluation)

#### 16.3.1 处理流程

1. **输入阶段**：接收数据集和评估参数
2. **评估指标选择**：根据参数选择评估指标
3. **指标计算**：计算各项评估指标值
4. **综合评分**：汇总各指标得出总体评分
5. **输出阶段**：返回评估结果和详细报告

#### 16.3.2 评估指标实现

**准确性评估**：

```python
def evaluate_accuracy(data, reference_data=None, schema=None):
    """评估数据准确性"""
    if not data:
        return {"score": 0, "details": {"error": "Empty dataset"}}
    
    issues = []
    score = 1.0
    
    if schema:
        # 基于模式验证
        for i, item in enumerate(data):
            item_issues = validate_against_schema(item, schema)
            if item_issues:
                issues.append({"index": i, "issues": item_issues})
                score -= 0.1  # 每个问题项扣分
    
    if reference_data:
        # 基于参考数据验证
        # 可以使用各种距离度量或领域特定的比较方法
        similarity = calculate_similarity(data, reference_data)
        accuracy_score = similarity * 0.8 + 0.2  # 将相似度转换为0.2-1.0的分数
        return {
            "score": min(accuracy_score, 1.0),
            "details": {
                "similarity": similarity,
                "compared_fields": list(data[0].keys()) if data else []
            }
        }
    
    # 确保分数在0-1范围内
    score = max(0, min(score, 1.0))
    
    return {
        "score": score,
        "details": {
            "validated_items": len(data),
            "issues_count": len(issues),
            "sample_issues": issues[:5] if issues else []
        }
    }
```

**一致性评估**：

```python
def evaluate_consistency(data):
    """评估数据一致性"""
    if not data or len(data) < 2:
        return {"score": 0, "details": {"error": "Insufficient data for consistency evaluation"}}
    
    # 提取所有字段
    fields = set()
    for item in data:
        fields.update(item.keys())
    
    consistency_scores = {}
    issues = []
    
    # 检查字段一致性
    for field in fields:
        # 计算字段存在率
        field_presence = sum(1 for item in data if field in item) / len(data)
        
        # 检查类型一致性
        field_types = {}
        for i, item in enumerate(data):
            if field in item:
                item_type = type(item[field]).__name__
                field_types[item_type] = field_types.get(item_type, 0) + 1
                
        # 计算主要类型的比例
        max_type = max(field_types.items(), key=lambda x: x[1]) if field_types else (None, 0)
        type_consistency = max_type[1] / sum(field_types.values()) if field_types else 0
        
        # 综合得分
        field_score = field_presence * 0.4 + type_consistency * 0.6
        consistency_scores[field] = field_score
        
        # 记录问题
        if field_score < 0.8:
            issues.append({
                "field": field,
                "score": field_score,
                "presence": field_presence,
                "type_consistency": type_consistency,
                "types": field_types
            })
    
    # 计算总体一致性得分
    overall_score = sum(consistency_scores.values()) / len(consistency_scores) if consistency_scores else 0
    
    return {
        "score": overall_score,
        "details": {
            "field_scores": consistency_scores,
            "issues": issues
        }
    }
```

**多样性评估**：

```python
def evaluate_diversity(data, fields=None):
    """评估数据多样性"""
    if not data:
        return {"score": 0, "details": {"error": "Empty dataset"}}
    
    # 如果未指定字段，使用所有字段
    if not fields:
        fields = list(data[0].keys()) if data else []
    
    diversity_scores = {}
    total_score = 0
    
    for field in fields:
        # 收集字段值
        field_values = [item.get(field) for item in data if field in item]
        
        if not field_values:
            diversity_scores[field] = 0
            continue
        
        # 计算唯一值比例
        unique_values = set(str(v) for v in field_values if v is not None)
        unique_ratio = len(unique_values) / len(field_values) if field_values else 0
        
        # 计算熵 (需要离散化连续值)
        if all(isinstance(v, (int, float)) for v in field_values if v is not None):
            # 对数值型使用离散化后的熵
            normalized_entropy = calculate_normalized_entropy(field_values)
        else:
            # 对类别型直接计算熵
            value_counts = {}
            for v in field_values:
                v_str = str(v)
                value_counts[v_str] = value_counts.get(v_str, 0) + 1
            
            entropy = 0
            for count in value_counts.values():
                p = count / len(field_values)
                entropy -= p * math.log2(p) if p > 0 else 0
            
            # 归一化熵 (相对于最大可能熵)
            max_entropy = math.log2(len(field_values)) if len(field_values) > 1 else 1
            normalized_entropy = entropy / max_entropy if max_entropy > 0 else 0
        
        # 综合得分 (唯一比例和熵的加权平均)
        field_score = unique_ratio * 0.4 + normalized_entropy * 0.6
        diversity_scores[field] = field_score
        total_score += field_score
    
    # 计算总体多样性得分
    overall_score = total_score / len(fields) if fields else 0
    
    return {
        "score": overall_score,
        "details": {
            "field_scores": diversity_scores,
            "unique_value_counts": {field: len(set(str(item.get(field)) for item in data if field in item)) for field in fields}
        }
    }
```

### 16.4 LlamaFactory模块

#### 16.4.1 处理流程

1. **输入阶段**：接收模型参数和数据
2. **操作选择**：根据操作类型(训练、推理等)选择处理流程
3. **参数准备**：转换参数为LlamaFactory格式
4. **操作执行**：调用LlamaFactory API
5. **结果处理**：处理LlamaFactory返回结果
6. **输出阶段**：返回处理结果和性能指标

#### 16.4.2 核心集成实现

**模型初始化**：

```python
def initialize_llama_model(model_name, operation_type, use_lora=True, lora_config=None):
    """初始化LlamaFactory模型"""
    try:
        # 根据操作类型选择模型类
        if operation_type == "inference":
            # 加载推理模型
            model, tokenizer = load_model_for_inference(model_name)
            return {"model": model, "tokenizer": tokenizer}
        elif operation_type in ["sft", "dpo", "ppo"]:
            # 加载训练模型
            model_config = {
                "model_name_or_path": model_name,
                "use_lora": use_lora
            }
            
            # 添加LoRA配置
            if use_lora and lora_config:
                model_config.update({
                    "lora_rank": lora_config.get("rank", 8),
                    "lora_alpha": lora_config.get("alpha", 16),
                    "lora_dropout": lora_config.get("dropout", 0.05)
                })
            
            # 初始化模型
            model, tokenizer = load_model_for_training(model_config)
            return {"model": model, "tokenizer": tokenizer, "config": model_config}
    except Exception as e:
        raise Exception(f"Failed to initialize LlamaFactory model: {str(e)}")
```

**模型训练**：

```python
async def train_model(model_info, training_data, training_params):
    """使用LlamaFactory进行模型训练"""
    try:
        # 准备训练参数
        train_config = {
            "output_dir": training_params.get("output_dir", "./outputs"),
            "num_train_epochs": training_params.get("epochs", 3),
            "per_device_train_batch_size": training_params.get("batch_size", 4),
            "gradient_accumulation_steps": training_params.get("gradient_accumulation", 4),
            "learning_rate": training_params.get("learning_rate", 5e-5),
            "weight_decay": training_params.get("weight_decay", 0.01),
            "warmup_ratio": training_params.get("warmup_ratio", 0.1),
            "logging_steps": training_params.get("logging_steps", 50)
        }
        
        # 准备训练数据
        train_dataset = prepare_dataset_for_training(training_data, model_info["tokenizer"])
        
        # 创建训练器
        trainer = create_trainer(
            model=model_info["model"],
            tokenizer=model_info["tokenizer"],
            train_dataset=train_dataset,
            args=train_config
        )
        
        # 执行训练
        train_result = trainer.train()
        
        # 保存模型
        trainer.save_model()
        trainer.save_state()
        
        # 准备返回结果
        metrics = train_result.metrics
        return {
            "metrics": metrics,
            "checkpoint_path": train_config["output_dir"],
            "training_time": metrics.get("train_runtime", 0),
            "samples_per_second": metrics.get("train_samples_per_second", 0)
        }
    except Exception as e:
        raise Exception(f"LlamaFactory training failed: {str(e)}")
```

**模型推理**：

```python
async def run_inference(model_info, input_data, inference_params):
    """使用LlamaFactory进行模型推理"""
    try:
        model = model_info["model"]
        tokenizer = model_info["tokenizer"]
        
        # 准备推理参数
        generation_config = {
            "max_length": inference_params.get("max_length", 512),
            "temperature": inference_params.get("temperature", 0.7),
            "top_p": inference_params.get("top_p", 0.9),
            "repetition_penalty": inference_params.get("repetition_penalty", 1.1),
            "do_sample": inference_params.get("do_sample", True)
        }
        
        results = []
        batch_size = inference_params.get("batch_size", 1)
        
        # 分批处理输入
        for i in range(0, len(input_data), batch_size):
            batch = input_data[i:i+batch_size]
            batch_inputs = [item.get("prompt", "") for item in batch]
            
            # 对批次进行推理
            tokenized_inputs = tokenizer(batch_inputs, return_tensors="pt", padding=True)
            tokenized_inputs = {k: v.to(model.device) for k, v in tokenized_inputs.items()}
            
            output_ids = model.generate(
                **tokenized_inputs,
                **generation_config
            )
            
            # 解码输出
            decoded_outputs = [tokenizer.decode(ids, skip_special_tokens=True) for ids in output_ids]
            
            # 处理结果
            for j, output in enumerate(decoded_outputs):
                input_item = batch[j]
                results.append({
                    "input": input_item.get("prompt", ""),
                    "output": output,
                    "id": input_item.get("id", f"{i+j}")
                })
        
        return {
            "results": results,
            "count": len(results),
            "parameters": generation_config
        }
    except Exception as e:
        raise Exception(f"LlamaFactory inference failed: {str(e)}")
```

### 16.5 LLM API模块

#### 16.5.1 处理流程

1. **输入阶段**：接收提示词和调用参数
2. **提供商选择**：根据参数选择LLM提供商
3. **请求构建**：构建API请求
4. **API调用**：发送请求至LLM服务
5. **响应处理**：解析和处理API响应
6. **输出阶段**：返回生成结果和使用统计

#### 16.5.2 多提供商支持实现

```python
async def invoke_llm(prompt, model="gpt-3.5-turbo", provider="openai", **params):
    """调用LLM API生成文本"""
    try:
        if provider == "openai":
            return await invoke_openai(prompt, model, **params)
        elif provider == "anthropic":
            return await invoke_anthropic(prompt, model, **params)
        elif provider == "local":
            return await invoke_local_model(prompt, model, **params)
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")
    except Exception as e:
        raise Exception(f"LLM API invocation failed: {str(e)}")

async def invoke_openai(prompt, model, system_message=None, **params):
    """调用OpenAI API"""
    try:
        import openai
        
        # 获取API密钥
        api_key = get_api_key("openai")
        if not api_key:
            raise ValueError("OpenAI API key not found")
        
        openai.api_key = api_key
        
        # 构建消息
        messages = []
        if system_message:
            messages.append({"role": "system", "content": system_message})
        messages.append({"role": "user", "content": prompt})
        
        # 构建请求参数
        request_params = {
            "model": model,
            "messages": messages,
            "temperature": params.get("temperature", 0.7),
            "max_tokens": params.get("max_tokens", 256),
            "top_p": params.get("top_p", 1.0),
            "frequency_penalty": params.get("frequency_penalty", 0.0),
            "presence_penalty": params.get("presence_penalty", 0.0)
        }
        
        # 添加停止序列 (如果提供)
        if "stop_sequences" in params and params["stop_sequences"]:
            request_params["stop"] = params["stop_sequences"]
        
        # 调用API
        if params.get("stream", False):
            # 流式调用
            response = await openai.ChatCompletion.acreate(
                **request_params,
                stream=True
            )
            # 聚合流式响应
            collected_content = ""
            async for chunk in response:
                if chunk.choices and chunk.choices[0].delta.get("content"):
                    collected_content += chunk.choices[0].delta.content
            
            response_content = collected_content
            tokens_used = estimate_tokens(prompt) + estimate_tokens(collected_content)
        else:
            # 非流式调用
            response = await openai.ChatCompletion.acreate(**request_params)
            response_content = response.choices[0].message.content
            tokens_used = response.usage.total_tokens
        
        # 准备返回结果
        return {
            "result": response_content,
            "tokens_used": tokens_used,
            "finish_reason": response.choices[0].finish_reason if not params.get("stream", False) else None,
            "model": model,
            "provider": "openai"
        }
    except Exception as e:
        raise Exception(f"OpenAI API call failed: {str(e)}")
```

### 16.6 质量评估模块 (quality_assessment)

#### 16.6.1 处理流程

1. **输入阶段**：接收数据集和评估维度
2. **维度评估**：对各评估维度分别计算得分
3. **综合评分**：根据权重计算总体质量得分
4. **问题识别**：识别并分类质量问题
5. **报告生成**：生成详细评估报告
6. **输出阶段**：返回评估结果和建议

#### 16.6.2 质量维度评估

```python
async def assess_quality(data, dimensions, weights=None, threshold_scores=None, **params):
    """评估数据质量"""
    if not data:
        return {
            "overall_score": 0,
            "dimension_scores": [],
            "message": "Empty dataset"
        }
    
    # 初始化默认权重
    if not weights:
        weights = {dim: 1.0/len(dimensions) for dim in dimensions}
    
    # 初始化阈值
    if not threshold_scores:
        threshold_scores = {dim: 0.7 for dim in dimensions}
    
    # 评估各维度
    dimension_assessments = []
    total_weighted_score = 0
    
    for dimension in dimensions:
        # 根据维度调用相应的评估函数
        if dimension == "completeness":
            assessment = assess_completeness(data, **params)
        elif dimension == "accuracy":
            assessment = assess_accuracy(data, **params)
        elif dimension == "consistency":
            assessment = assess_consistency(data, **params)
        elif dimension == "validity":
            assessment = assess_validity(data, **params)
        elif dimension == "uniqueness":
            assessment = assess_uniqueness(data, **params)
        elif dimension == "diversity":
            assessment = assess_diversity(data, **params)
        else:
            assessment = {"score": 0, "details": {"error": f"Unsupported dimension: {dimension}"}}
        
        # 检查是否通过阈值
        threshold = threshold_scores.get(dimension, 0.7)
        passed_threshold = assessment["score"] >= threshold
        
        # 计算加权得分
        weight = weights.get(dimension, 1.0/len(dimensions))
        weighted_score = assessment["score"] * weight
        total_weighted_score += weighted_score
        
        # 添加到评估结果
        dimension_assessments.append({
            "dimension": dimension,
            "score": assessment["score"],
            "weighted_score": weighted_score,
            "weight": weight,
            "passed": passed_threshold,
            "threshold": threshold,
            "issues": assessment.get("issues", []),
            "recommendations": generate_recommendations(dimension, assessment)
        })
    
    # 计算总体得分
    overall_score = total_weighted_score
    
    # 检查是否通过总体阈值
    overall_threshold = params.get("overall_threshold", 0.7)
    passed_overall = overall_score >= overall_threshold
    
    # 生成评估摘要
    summary = {
        "assessed_items": len(data),
        "assessed_dimensions": len(dimensions),
        "passed_dimensions": sum(1 for dim in dimension_assessments if dim["passed"]),
        "failed_dimensions": sum(1 for dim in dimension_assessments if not dim["passed"]),
        "top_issues": extract_top_issues(dimension_assessments, limit=5)
    }
    
    # 生成改进优先级
    improvement_priority = sorted(
        dimension_assessments,
        key=lambda x: (not x["passed"], x["weight"], -x["score"])
    )
    improvement_priority = [{
        "dimension": dim["dimension"],
        "current_score": dim["score"],
        "target_score": max(dim["threshold"], dim["score"] + 0.1),
        "impact": dim["weight"] * (max(dim["threshold"], dim["score"] + 0.1) - dim["score"])
    } for dim in improvement_priority]
    
    # 如果需要生成报告，创建报告URL
    report_url = None
    if params.get("generate_report", True):
        report_format = params.get("report_format", "json")
        report_url = await generate_quality_report(
            data, dimension_assessments, overall_score, summary, 
            report_format=report_format
        )
    
    # 返回完整评估结果
    return {
        "overall_score": overall_score,
        "passed_threshold": passed_overall,
        "dimension_scores": dimension_assessments,
        "summary": summary,
        "improvement_priority": improvement_priority,
        "report_url": report_url
    }
```

## 17. 系统配置与环境变量管理

### 17.1 配置设计原则

#### 17.1.1 分层配置架构

Datapresso采用四层配置架构，确保灵活性、安全性和易用性：

1. **默认配置**：代码中嵌入的基础配置
2. **配置文件**：项目目录下的配置文件
3. **环境变量**：系统或项目的环境变量
4. **运行时配置**：运行时提供的配置参数

优先级：运行时配置 > 环境变量 > 配置文件 > 默认配置

#### 17.1.2 配置类别

配置分为以下几类：

1. **系统配置**：服务器端口、日志级别等
2. **业务配置**：算法参数、模型设置等
3. **集成配置**：外部服务连接信息
4. **安全配置**：密钥、证书等敏感信息
5. **用户配置**：用户偏好设置

### 17.2 配置实现机制

#### 17.2.1 后端配置管理

```python
# config.py
import os
import yaml
import json
from pathlib import Path
from typing import Dict, Any, Optional
from pydantic import BaseSettings, Field
from functools import lru_cache

# 项目根目录
ROOT_DIR = Path(__file__).parent.parent
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
```

#### 17.2.2 前端配置管理

```javascript
// config/config.js
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// 用户配置目录
const userConfigDir = path.join(app.getPath('userData'), 'config');

// 确保用户配置目录存在
if (!fs.existsSync(userConfigDir)) {
  fs.mkdirSync(userConfigDir, { recursive: true });
}

// 默认配置
const defaultConfig = {
  app: {
    name: 'Datapresso Desktop',
    version: app.getVersion() || '1.0.0',
    theme: 'light',
    language: 'zh-CN'
  },
  backend: {
    host: 'http://127.0.0.1',
    port: 8000,
    timeout: 30000 // 30秒
  },
  paths: {
    data: path.join(app.getPath('documents'), 'Datapresso', 'data'),
    export: path.join(app.getPath('documents'), 'Datapresso', 'exports'),
    models: path.join(app.getPath('documents'), 'Datapresso', 'models')
  },
  features: {
    autoSave: true,
    checkUpdates: true,
    telemetry: false,
    debugMode: false
  }
};

// 加载用户配置
function loadUserConfig() {
  const userConfigPath = path.join(userConfigDir, 'user-config.yaml');
  
  if (!fs.existsSync(userConfigPath)) {
    return {};
  }
  
  try {
    const fileContent = fs.readFileSync(userConfigPath, 'utf8');
    return yaml.load(fileContent) || {};
  } catch (err) {
    console.error('Error loading user config:', err);
    return {};
  }
}

// 保存用户配置
function saveUserConfig(config) {
  const userConfigPath = path.join(userConfigDir, 'user-config.yaml');
  
  try {
    const yamlContent = yaml.dump(config);
    fs.writeFileSync(userConfigPath, yamlContent, 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving user config:', err);
    return false;
  }
}

// 深度合并对象
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

// 获取完整配置
function getConfig() {
  const userConfig = loadUserConfig();
  return deepMerge(defaultConfig, userConfig);
}

// 更新配置
function updateConfig(newConfig) {
  const currentConfig = getConfig();
  const updatedConfig = deepMerge(currentConfig, newConfig);
  return saveUserConfig(updatedConfig);
}

module.exports = {
  getConfig,
  updateConfig,
  saveUserConfig,
  loadUserConfig
};
```

### 17.3 环境变量管理

#### 17.3.1 环境变量定义

Datapresso使用以下环境变量：

| 变量名 | 说明 | 默认值 | 示例值 |
|-------|-----|-------|-------|
| FASTAPI_ENV | 运行环境 | development | production |
| PORT | 后端服务端口 | 8000 | 9000 |
| LOG_LEVEL | 日志级别 | INFO | DEBUG |
| DATA_DIR | 数据目录 | ./data | D:/datapresso_data |
| CACHE_DIR | 缓存目录 | ./cache | D:/datapresso_cache |
| RESULTS_DIR | 结果目录 | ./results | D:/datapresso_results |
| OPENAI_API_KEY | OpenAI API密钥 | None | sk-abcdef123456 |
| ANTHROPIC_API_KEY | Anthropic API密钥 | None | sk-ant-abcdef123456 |
| HOSTED_LLM_API_URL | 托管LLM API URL | None | https://api.example.com |
| DB_URL | 数据库连接URL | sqlite:///./datapresso.db | postgresql://user:pass@localhost/datapresso |

#### 17.3.2 环境变量加载

```python
# .env 文件示例
FASTAPI_ENV=development
PORT=8000
LOG_LEVEL=INFO
DATA_DIR=./data
CACHE_DIR=./cache
RESULTS_DIR=./results
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
HOSTED_LLM_API_URL=
HOSTED_VLLM_API_KEY=
DB_URL=sqlite:///./datapresso.db
```

加载环境变量的代码（Python后端）：

```python
# utils/env_loader.py
import os
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

def load_environment():
    """加载环境变量"""
    # 尝试从多个位置加载.env文件
    env_paths = [
        './.env',                      # 项目根目录
        '../.env',                     # 上级目录
        os.path.expanduser('~/.datapresso/.env')  # 用户主目录
    ]
    
    # 记录已尝试路径
    tried_paths = []
    
    for env_path in env_paths:
        if os.path.exists(env_path):
            logger.info(f"Loading environment from {env_path}")
            load_dotenv(env_path)
            return True
        tried_paths.append(env_path)
    
    # 如果没有找到.env文件，尝试使用默认环境变量
    logger.warning(f"No .env file found in {tried_paths}. Using default environment variables.")
    return False

def get_env(key, default=None):
    """获取环境变量，支持默认值"""
    return os.environ.get(key, default)

def get_env_bool(key, default=False):
    """获取布尔类型环境变量"""
    value = os.environ.get(key, str(default)).lower()
    return value in ('true', '1', 'yes', 'y', 'on')

def get_env_int(key, default=0):
    """获取整数类型环境变量"""
    try:
        return int(os.environ.get(key, default))
    except (ValueError, TypeError):
        return default

def get_env_float(key, default=0.0):
    """获取浮点类型环境变量"""
    try:
        return float(os.environ.get(key, default))
    except (ValueError, TypeError):
        return default

def get_env_list(key, default=None, separator=','):
    """获取列表类型环境变量"""
    if default is None:
        default = []
    value = os.environ.get(key)
    if not value:
        return default
    return [item.strip() for item in value.split(separator)]
```

### 17.4 多环境支持

#### 17.4.1 环境配置文件

为不同环境提供专用配置文件：

```
config/
  ├── default.yaml          # 默认配置
  ├── development.yaml      # 开发环境配置
  ├── testing.yaml          # 测试环境配置
  ├── production.yaml       # 生产环境配置
  └── local.yaml            # 本地覆盖配置（不加入版本控制）
```

#### 17.4.2 环境加载逻辑

```python
# 环境配置加载
def load_environment_config(env=None):
    """加载特定环境的配置"""
    if env is None:
        env = os.environ.get("FASTAPI_ENV", "development")
    
    # 加载配置文件
    default_config = load_yaml_config("default")
    env_config = load_yaml_config(env)
    local_config = load_yaml_config("local")
    
    # 合并配置 (default < env < local)
    config = merge_configs(default_config, env_config, local_config)
    
    return config
```

### 17.5 安全性配置管理

#### 17.5.1 敏感信息处理

```python
# utils/security.py
import os
import base64
import json
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

def generate_encryption_key(password, salt=None):
    """生成加密密钥"""
    if salt is None:
        salt = os.urandom(16)
    
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000
    )
    
    key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
    return key, salt

def encrypt_data(data, key):
    """加密数据"""
    f = Fernet(key)
    json_data = json.dumps(data)
    return f.encrypt(json_data.encode())

def decrypt_data(encrypted_data, key):
    """解密数据"""
    f = Fernet(key)
    json_data = f.decrypt(encrypted_data).decode()
    return json.loads(json_data)

def store_api_key(service_name, api_key, app_password):
    """安全存储API密钥"""
    # 生成加密密钥
    key, salt = generate_encryption_key(app_password)
    
    # 加密API密钥
    encrypted_api_key = encrypt_data({service_name: api_key}, key)
    
    # 存储加密的API密钥和盐值
    api_keys_dir = os.path.join(os.path.expanduser("~"), ".datapresso", "api_keys")
    os.makedirs(api_keys_dir, exist_ok=True)
    
    with open(os.path.join(api_keys_dir, f"{service_name}.encrypted"), "wb") as f:
        f.write(encrypted_api_key)
    
    with open(os.path.join(api_keys_dir, f"{service_name}.salt"), "wb") as f:
        f.write(salt)
    
    return True

def get_api_key(service_name, app_password):
    """安全获取API密钥"""
    # 获取盐值
    api_keys_dir = os.path.join(os.path.expanduser("~"), ".datapresso", "api_keys")
    salt_path = os.path.join(api_keys_dir, f"{service_name}.salt")
    encrypted_path = os.path.join(api_keys_dir, f"{service_name}.encrypted")
    
    if not os.path.exists(salt_path) or not os.path.exists(encrypted_path):
        return None
    
    with open(salt_path, "rb") as f:
        salt = f.read()
    
    with open(encrypted_path, "rb") as f:
        encrypted_api_key = f.read()
    
    # 生成解密密钥
    key, _ = generate_encryption_key(app_password, salt)
    
    try:
        # 解密API密钥
        data = decrypt_data(encrypted_api_key, key)
        return data.get(service_name)
    except Exception:
        return None
```


## 18. 状态管理与数据持久化

状态管理和数据持久化是确保应用程序稳定性和用户体验连续性的关键组件。本节详细说明应用程序如何管理内部状态并持久化重要数据。

### 18.1 状态管理架构

#### 18.1.1 前端状态管理
- **React状态管理**：使用React Context API和hooks(useState, useReducer)管理UI组件状态
- **全局状态管理**：使用Redux或Zustand存储全局应用状态，包括：
  - 当前活动项目
  - 用户配置
  - 应用设置
  - 运行中任务状态
  - 评估结果和过滤状态

#### 18.1.2 后端状态管理
- **内存状态**：使用Python类实例变量跟踪短期运行状态
- **进程状态**：使用进程间通信(IPC)方法在主进程与工作进程间同步状态
- **服务状态**：通过FastAPI中间件或状态装饰器管理服务级别状态

### 18.2 数据持久化策略

#### 18.2.1 数据库设计
- **SQLite主数据库**：用于存储项目元数据、任务历史和系统配置
  - 表结构设计：
    - `projects`: 存储项目基本信息
    - `tasks`: 任务执行历史记录
    - `datasets`: 数据集信息
    - `models`: 模型信息
    - `evaluations`: 评估结果
    - `filters`: 过滤规则

#### 18.2.2 文件系统存储
- **数据文件组织**：
  ```
  [项目目录]/
  ├── data/
  │   ├── raw/                # 原始数据
  │   ├── processed/          # 处理后数据
  │   ├── generated/          # 生成的数据
  │   ├── assessed/           # 质量评估后的数据
  │   ├── filtered/           # 过滤后的数据
  │   └── output/             # 最终输出数据
  ├── models/                 # 训练好的模型存储
  ├── configs/                # 配置文件存储
  ├── logs/                   # 日志文件
  └── cache/                  # 临时缓存
  ```

#### 18.2.3 配置文件管理
- **配置文件格式**：使用YAML格式存储用户配置和系统设置
- **配置分层**：
  - 全局配置：`~/.datapresso/global_config.yaml`
  - 项目配置：`[项目目录]/config.yaml`
  - LLM API配置：`~/.datapresso/llm_api_configs/`

#### 18.2.4 缓存管理
- **内容缓存**：实现LRU缓存策略加速频繁访问的数据
- **API响应缓存**：缓存LLM API响应避免重复请求
- **中间结果缓存**：保存数据处理中间结果，支持断点续传
- **缓存失效策略**：基于时间戳和数据变更的智能缓存失效

### 18.3 前后端数据同步机制

#### 18.3.1 同步策略
- **实时同步**：WebSocket用于实时状态更新和推送通知
- **按需同步**：REST API用于按需获取数据和提交操作
- **批量同步**：定期批量同步以减少网络负载

#### 18.3.2 数据一致性保障
- **乐观锁**：使用版本号或时间戳防止冲突
- **事务处理**：关键操作使用数据库事务保证原子性
- **增量更新**：只传输变更部分减少数据传输

#### 18.3.3 离线工作支持
- **离线数据缓存**：临时存储离线期间的操作
- **同步冲突解决**：提供用户选择机制解决同步冲突
- **定期自动保存**：防止数据丢失

## 19. 任务调度与进度监控

任务调度系统负责管理长时间运行的操作，确保系统资源合理分配，并提供用户友好的进度反馈机制。

### 19.1 任务调度架构

#### 19.1.1 任务队列系统
- **队列实现**：使用Celery或自定义任务队列管理多任务
- **任务优先级**：支持基于紧急程度的任务优先级
- **资源限制**：限制同时运行任务数量避免资源耗尽
- **任务依赖**：支持定义任务间的前置依赖关系

#### 19.1.2 任务生命周期管理
- **状态转换**：
  ```
  等待中 -> 准备中 -> 运行中 -> [暂停] -> 完成/失败/取消
  ```
- **持久化**：任务状态变更同步至数据库确保系统重启后恢复
- **重试机制**：自动重试失败任务，指数退避策略

### 19.2 进度监控系统

#### 19.2.1 进度报告机制
- **进度计算**：
  - 基于已完成项目数量的简单进度
  - 基于任务复杂度权重的加权进度
  - 基于时间估算的预测进度
- **细粒度进度**：支持子任务级别的进度报告
- **进度历史**：记录执行速度历史用于优化预测

#### 19.2.2 前端进度展示
- **进度条UI**：多层次进度条显示总体和子任务进度
- **详细信息面板**：显示当前步骤、预计剩余时间等
- **日志实时展示**：滚动显示最新日志消息
- **资源使用监控**：CPU、内存使用率可视化展示

#### 19.2.3 通知系统
- **进度通知**：重要阶段完成或任务状态变更时通知
- **错误通知**：任务失败或警告时立即通知
- **批量处理通知**：合并频繁更新减少打扰

### 19.3 任务控制接口

#### 19.3.1 REST API端点
- **任务管理端点**：
  - `POST /api/tasks`: 创建新任务
  - `GET /api/tasks/{id}`: 获取任务详情
  - `GET /api/tasks/{id}/status`: 获取任务状态
  - `GET /api/tasks/{id}/progress`: 获取任务进度
  - `PUT /api/tasks/{id}/action`: 控制任务(暂停/恢复/取消)
  - `GET /api/tasks/{id}/logs`: 获取任务日志

#### 19.3.2 WebSocket实时更新
- **事件通道**：
  - `task.created`: 新任务创建
  - `task.status_changed`: 任务状态变更
  - `task.progress_updated`: 进度更新
  - `task.log_updated`: 日志更新
  - `task.completed`: 任务完成
  - `task.failed`: 任务失败

#### 19.3.3 任务恢复机制
- **断点续传**：支持从中断点恢复任务执行
- **状态保存**：任务执行状态定期保存到磁盘
- **错误恢复策略**：提供智能错误处理和恢复建议

## 20. 插件系统与扩展机制

插件系统允许第三方开发者和高级用户扩展Datapresso的功能，而无需修改核心代码。

### 20.1 插件架构设计

#### 20.1.1 插件类型
- **数据源插件**：连接新的数据来源
- **模型提供商插件**：集成新的LLM服务提供商
- **数据处理插件**：自定义数据处理流程
- **评估指标插件**：添加新的质量评估维度
- **UI扩展插件**：定制用户界面组件
- **导出格式插件**：支持新的数据导出格式

#### 20.1.2 插件接口规范
- **核心接口**：所有插件必须实现的基础接口
  ```python
  class DatapressoPlugin:
      def get_metadata(self) -> Dict[str, Any]:
          """返回插件元数据，包括名称、版本、描述等"""
          
      def initialize(self, context: PluginContext) -> bool:
          """初始化插件，返回是否成功"""
          
      def shutdown(self) -> None:
          """关闭插件并释放资源"""
  ```

- **类型特定接口**：根据插件类型实现的专用接口
  ```python
  class LLMProviderPlugin(DatapressoPlugin):
      def get_provider_info(self) -> ProviderInfo:
          """返回提供商信息"""
          
      def generate_text(self, prompt: str, params: Dict[str, Any]) -> str:
          """生成文本"""
          
      def get_supported_models(self) -> List[ModelInfo]:
          """返回支持的模型列表"""
  ```

#### 20.1.3 插件生命周期
- **发现**：启动时扫描插件目录
- **加载**：验证元数据和依赖后加载
- **初始化**：调用`initialize`方法
- **运行**：正常使用插件功能
- **关闭**：应用退出时调用`shutdown`

### 20.2 插件管理系统

#### 20.2.1 插件目录结构
```
plugins/
├── [plugin_id]/
│   ├── manifest.json    # 插件元数据
│   ├── main.py          # 插件主入口
│   ├── requirements.txt # 依赖项
│   └── resources/       # 资源文件
```

#### 20.2.2 插件安装与更新
- **安装方式**：
  - 从插件市场安装
  - 从本地ZIP文件安装
  - 开发模式从源码目录加载
- **更新机制**：
  - 版本比较和兼容性检查
  - 增量更新减少下载量
  - 回滚支持防止更新失败

#### 20.2.3 插件安全措施
- **沙箱隔离**：限制插件访问系统资源
- **权限系统**：细粒度控制插件权限
- **代码签名**：验证插件来源可信度
- **资源限制**：防止插件过度消耗系统资源

### 20.3 扩展API

#### 20.3.1 后端扩展点
- **LLM提供商API**：集成新的语言模型服务
  ```python
  # 示例: 实现新的LLM提供商
  from datapresso.llm_api.llm_provider import LLMProvider
  
  class MyCustomProvider(LLMProvider):
      def __init__(self, config):
          super().__init__(config)
          # 初始化自定义提供商
          
      def generate(self, prompt, params=None):
          # 实现生成逻辑
          return generated_text
  ```

- **数据处理管道扩展**：自定义数据处理步骤
  ```python
  # 示例: 自定义数据处理器
  from datapresso.data_filtering.filter_base import BaseFilter
  
  class MyCustomFilter(BaseFilter):
      def filter(self, data):
          # 实现过滤逻辑
          return filtered_data
  ```

- **评估指标扩展**：添加自定义评估维度
  ```python
  # 示例: 自定义评估指标
  from datapresso.quality_assessment.metric_base import BaseMetric
  
  class MyCustomMetric(BaseMetric):
      def evaluate(self, sample):
          # 实现评估逻辑
          return score
  ```

#### 20.3.2 前端扩展点
- **UI组件扩展**：注册自定义React组件
  ```jsx
  // 示例: 自定义数据可视化组件
  import { registerCustomComponent } from 'datapresso-ui-sdk';
  
  function MyCustomViz({ data }) {
    // 实现自定义可视化
    return <div>...</div>;
  }
  
  registerCustomComponent('data-visualization', 'my-custom-viz', MyCustomViz);
  ```

- **工作流扩展**：添加自定义工作流步骤
  ```jsx
  // 示例: 自定义工作流步骤
  import { registerWorkflowStep } from 'datapresso-ui-sdk';
  
  const myCustomStep = {
    id: 'my-custom-step',
    name: 'My Custom Step',
    description: 'Performs custom processing',
    component: MyCustomStepConfig, // 配置UI组件
    executor: (data, config) => {
      // 执行逻辑
      return processedData;
    }
  };
  
  registerWorkflowStep(myCustomStep);
  ```

#### 20.3.3 事件系统
- **事件订阅机制**：允许插件响应系统事件
  ```python
  # 示例: 订阅系统事件
  from datapresso.plugin_framework.events import subscribe
  
  @subscribe('data.generation.completed')
  def handle_generation_completed(event_data):
      # 处理数据生成完成事件
      pass
  ```

- **自定义事件**：允许插件发布自定义事件
  ```python
  # 示例: 发布自定义事件
  from datapresso.plugin_framework.events import publish
  
  def my_plugin_function():
      # 执行某些操作
      publish('my_plugin.custom_event', {
          'result': result,
          'timestamp': time.time()
      })
  ```

### 20.4 版本兼容性管理

#### 20.4.1 API版本控制
- **语义化版本**：遵循SemVer规范进行API版本管理
- **向后兼容保证**：次要版本更新保持API兼容性
- **废弃流程**：API变更前先标记为废弃并提供迁移路径

#### 20.4.2 兼容性检查
- **自动验证**：加载时验证插件与当前API兼容性
- **依赖检查**：验证插件所需的系统组件和版本
- **冲突检测**：检测并处理插件间的潜在冲突

#### 20.4.3 迁移工具
- **API迁移助手**：辅助插件开发者适配新版API
- **兼容性层**：提供临时兼容层支持旧版插件
- **升级指南**：详细的API变更文档和最佳实践
```

上述内容全面补充了状态管理与数据持久化、任务调度与进度监控以及插件系统与扩展机制的实现细节。方案中考虑了前后端交互、数据流动、扩展性和兼容性等关键因素，为开发者提供了清晰的实施路径。

已进行更改。



## 21.LLM与AI功能增强

### 21.1 LLM提供商集成架构

基于现有的前端`llmConfig.ts`配置，我们需要构建一个统一的后端适配层，支持OpenAI、Anthropic、DeepSeek、Gemini等LLM提供商。

#### 21.1.1 统一适配层设计

```python
# datapresso/llm_api/provider_factory.py

from typing import Dict, Any, Optional, Type, Union
import os
from abc import ABC, abstractmethod

class BaseLLMProvider(ABC):
    """所有LLM提供商适配器的基类"""
    
    @abstractmethod
    async def generate(self, prompt: str, system_prompt: Optional[str] = None, 
                      temperature: float = 0.7, max_tokens: int = 1000, 
                      **kwargs) -> Dict[str, Any]:
        """生成文本响应"""
        pass
        
    @abstractmethod
    async def generate_with_images(self, prompt: str, images: list, 
                                 system_prompt: Optional[str] = None,
                                 **kwargs) -> Dict[str, Any]:
        """生成包含图像的多模态响应"""
        pass
    
    @abstractmethod
    async def get_embeddings(self, text: str) -> list:
        """获取文本嵌入向量"""
        pass
    
    @abstractmethod
    def get_token_count(self, text: str) -> int:
        """计算文本的token数量"""
        pass
    
    @abstractmethod
    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """计算API调用成本"""
        pass

    @property
    @abstractmethod
    def model_info(self) -> Dict[str, Any]:
        """获取模型信息，包括上下文窗口大小等"""
        pass


class LLMProviderFactory:
    """LLM提供商工厂，根据配置创建对应的适配器实例"""
    
    _providers = {}
    
    @classmethod
    def register_provider(cls, provider_id: str, provider_class: Type[BaseLLMProvider]):
        """注册LLM提供商适配器类"""
        cls._providers[provider_id] = provider_class
    
    @classmethod
    def create_provider(cls, provider_id: str, api_key: Optional[str] = None, 
                      model_name: str = None, **kwargs) -> BaseLLMProvider:
        """创建LLM提供商适配器实例"""
        if provider_id not in cls._providers:
            raise ValueError(f"未知的LLM提供商: {provider_id}")
        
        # 如果没有提供API key，尝试从环境变量获取
        if not api_key:
            env_var_name = f"{provider_id.upper()}_API_KEY"
            api_key = os.environ.get(env_var_name)
            
        return cls._providers[provider_id](api_key=api_key, model_name=model_name, **kwargs)
```

#### 21.1.2 OpenAI适配器实现

```python
# datapresso/llm_api/providers/openai_provider.py

import os
import json
import asyncio
from typing import Dict, Any, Optional, List, Union
import tiktoken
from openai import AsyncOpenAI

from datapresso.llm_api.provider_factory import BaseLLMProvider, LLMProviderFactory
from datapresso.llm_api.constants import OPENAI_MODELS, OPENAI_PRICING

class OpenAIProvider(BaseLLMProvider):
    """OpenAI API适配器"""
    
    def __init__(self, api_key: Optional[str] = None, model_name: str = "gpt-4o", base_url: Optional[str] = None):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("未提供OpenAI API密钥")
        
        self.model_name = model_name
        self.client = AsyncOpenAI(api_key=self.api_key, base_url=base_url)
        self.encoding = tiktoken.encoding_for_model(model_name)
        
    async def generate(self, prompt: str, system_prompt: Optional[str] = None, 
                     temperature: float = 0.7, max_tokens: int = 1000,
                     **kwargs) -> Dict[str, Any]:
        """生成文本响应"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        messages.append({"role": "user", "content": prompt})
        
        response = await self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs
        )
        
        usage = {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
            "cost": self.calculate_cost(response.usage.prompt_tokens, response.usage.completion_tokens)
        }
        
        return {
            "text": response.choices[0].message.content,
            "model": self.model_name,
            "usage": usage,
            "finish_reason": response.choices[0].finish_reason,
            "raw_response": response
        }
    
    async def generate_with_images(self, prompt: str, images: List[Union[str, bytes]], 
                                system_prompt: Optional[str] = None,
                                **kwargs) -> Dict[str, Any]:
        """生成包含图像的多模态响应"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        content = []
        content.append({"type": "text", "text": prompt})
        
        for image in images:
            if isinstance(image, str):
                if image.startswith(('http://', 'https://')):
                    content.append({
                        "type": "image_url",
                        "image_url": {"url": image}
                    })
                else:
                    # 处理base64图片
                    content.append({
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image}"}
                    })
            elif isinstance(image, bytes):
                import base64
                image_base64 = base64.b64encode(image).decode('utf-8')
                content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}
                })
        
        messages.append({"role": "user", "content": content})
        
        response = await self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            **kwargs
        )
        
        usage = {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
            "cost": self.calculate_cost(response.usage.prompt_tokens, response.usage.completion_tokens)
        }
        
        return {
            "text": response.choices[0].message.content,
            "model": self.model_name,
            "usage": usage,
            "finish_reason": response.choices[0].finish_reason,
            "raw_response": response
        }
    
    async def get_embeddings(self, text: str) -> list:
        """获取文本嵌入向量"""
        response = await self.client.embeddings.create(
            model="text-embedding-3-large",
            input=text
        )
        return response.data[0].embedding
    
    def get_token_count(self, text: str) -> int:
        """计算文本的token数量"""
        return len(self.encoding.encode(text))
    
    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """计算API调用成本"""
        if self.model_name not in OPENAI_PRICING:
            return 0.0
        
        pricing = OPENAI_PRICING[self.model_name]
        prompt_cost = prompt_tokens * pricing["prompt"] / 1000
        completion_cost = completion_tokens * pricing["completion"] / 1000
        return prompt_cost + completion_cost
    
    @property
    def model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        if self.model_name not in OPENAI_MODELS:
            return {"context_window": 4096, "max_output_tokens": 2048}
        
        return OPENAI_MODELS[self.model_name]

# 注册提供商
LLMProviderFactory.register_provider("openai", OpenAIProvider)
```

#### 21.1.3 Anthropic适配器实现

```python
# datapresso/llm_api/providers/anthropic_provider.py

import os
import json
import asyncio
from typing import Dict, Any, Optional, List, Union
import anthropic

from datapresso.llm_api.provider_factory import BaseLLMProvider, LLMProviderFactory
from datapresso.llm_api.constants import ANTHROPIC_MODELS, ANTHROPIC_PRICING

class AnthropicProvider(BaseLLMProvider):
    """Anthropic API适配器"""
    
    def __init__(self, api_key: Optional[str] = None, model_name: str = "claude-3-5-sonnet-20241022"):
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("未提供Anthropic API密钥")
        
        self.model_name = model_name
        self.client = anthropic.AsyncAnthropic(api_key=self.api_key)
        
    async def generate(self, prompt: str, system_prompt: Optional[str] = None, 
                     temperature: float = 0.7, max_tokens: int = 1000,
                     **kwargs) -> Dict[str, Any]:
        """生成文本响应"""
        messages = [{"role": "user", "content": prompt}]
        
        response = await self.client.messages.create(
            model=self.model_name,
            messages=messages,
            system=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs
        )
        
        usage = {
            "prompt_tokens": response.usage.input_tokens,
            "completion_tokens": response.usage.output_tokens,
            "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
            "cost": self.calculate_cost(response.usage.input_tokens, response.usage.output_tokens)
        }
        
        return {
            "text": response.content[0].text,
            "model": self.model_name,
            "usage": usage,
            "finish_reason": response.stop_reason,
            "raw_response": response
        }
    
    async def generate_with_images(self, prompt: str, images: List[Union[str, bytes]], 
                                system_prompt: Optional[str] = None,
                                **kwargs) -> Dict[str, Any]:
        """生成包含图像的多模态响应"""
        content = []
        content.append({"type": "text", "text": prompt})
        
        for image in images:
            if isinstance(image, str):
                if image.startswith(('http://', 'https://')):
                    content.append({
                        "type": "image",
                        "source": {
                            "type": "url",
                            "url": image
                        }
                    })
                else:
                    # 处理base64图片
                    import base64
                    content.append({
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image
                        }
                    })
            elif isinstance(image, bytes):
                import base64
                image_base64 = base64.b64encode(image).decode('utf-8')
                content.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": image_base64
                    }
                })
        
        messages = [{"role": "user", "content": content}]
        
        response = await self.client.messages.create(
            model=self.model_name,
            messages=messages,
            system=system_prompt,
            **kwargs
        )
        
        usage = {
            "prompt_tokens": response.usage.input_tokens,
            "completion_tokens": response.usage.output_tokens,
            "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
            "cost": self.calculate_cost(response.usage.input_tokens, response.usage.output_tokens)
        }
        
        return {
            "text": response.content[0].text,
            "model": self.model_name,
            "usage": usage,
            "finish_reason": response.stop_reason,
            "raw_response": response
        }
    
    async def get_embeddings(self, text: str) -> list:
        """获取文本嵌入向量"""
        # Anthropic目前不原生支持嵌入，返回空或自动调用其他提供商
        raise NotImplementedError("Anthropic当前不支持嵌入向量生成")
    
    def get_token_count(self, text: str) -> int:
        """计算文本的token数量"""
        from anthropic.tokenizer import get_token_ids
        tokens = get_token_ids(text)
        return len(tokens)
    
    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """计算API调用成本"""
        if self.model_name not in ANTHROPIC_PRICING:
            return 0.0
        
        pricing = ANTHROPIC_PRICING[self.model_name]
        prompt_cost = prompt_tokens * pricing["prompt"] / 1000
        completion_cost = completion_tokens * pricing["completion"] / 1000
        return prompt_cost + completion_cost
    
    @property
    def model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        if self.model_name not in ANTHROPIC_MODELS:
            return {"context_window": 100000, "max_output_tokens": 4096}
        
        return ANTHROPIC_MODELS[self.model_name]

# 注册提供商
LLMProviderFactory.register_provider("anthropic", AnthropicProvider)
```

#### 21.1.4 Gemini适配器实现

```python
# datapresso/llm_api/providers/gemini_provider.py

import os
import json
import asyncio
from typing import Dict, Any, Optional, List, Union
import google.generativeai as genai
from google.generativeai.types import generation_types

from datapresso.llm_api.provider_factory import BaseLLMProvider, LLMProviderFactory
from datapresso.llm_api.constants import GEMINI_MODELS, GEMINI_PRICING

class GeminiProvider(BaseLLMProvider):
    """Google Gemini API适配器"""
    
    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-1.5-flash-001"):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("未提供Gemini API密钥")
        
        self.model_name = model_name
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(model_name=self.model_name)
        
    async def generate(self, prompt: str, system_prompt: Optional[str] = None, 
                     temperature: float = 0.7, max_tokens: int = 1000,
                     **kwargs) -> Dict[str, Any]:
        """生成文本响应"""
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
            "top_p": kwargs.get("top_p", 0.95),
            "top_k": kwargs.get("top_k", 0)
        }
        
        safety_settings = kwargs.get("safety_settings", [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_NONE",
            },
        ])
        
        # 创建对话内容
        chat = self.model.start_chat(history=[])
        if system_prompt:
            response = await asyncio.to_thread(
                chat.send_message,
                system_prompt,
                generation_config=generation_config,
                safety_settings=safety_settings
            )
        
        response = await asyncio.to_thread(
            chat.send_message,
            prompt,
            generation_config=generation_config,
            safety_settings=safety_settings
        )
        
        # 提取token统计信息
        prompt_tokens = response.usage_metadata.prompt_token_count
        completion_tokens = response.usage_metadata.candidates_token_count
        total_tokens = response.usage_metadata.total_token_count
        
        usage = {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "cost": self.calculate_cost(prompt_tokens, completion_tokens)
        }
        
        return {
            "text": response.text,
            "model": self.model_name,
            "usage": usage,
            "finish_reason": "stop" if response.candidates[0].finish_reason == generation_types.FinishReason.STOP else response.candidates[0].finish_reason.name,
            "raw_response": response
        }
    
    async def generate_with_images(self, prompt: str, images: List[Union[str, bytes]], 
                                system_prompt: Optional[str] = None,
                                **kwargs) -> Dict[str, Any]:
        """生成包含图像的多模态响应"""
        generation_config = {
            "temperature": kwargs.get("temperature", 0.7),
            "max_output_tokens": kwargs.get("max_tokens", 1000),
            "top_p": kwargs.get("top_p", 0.95),
            "top_k": kwargs.get("top_k", 0)
        }
        
        safety_settings = kwargs.get("safety_settings", [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_NONE",
            },
        ])
        
        contents = []
        contents.append(prompt)
        
        processed_images = []
        for image in images:
            if isinstance(image, str):
                if image.startswith(('http://', 'https://')):
                    # 对于URL图片，使用genai的helper函数加载
                    img = await asyncio.to_thread(genai.upload_file, image)
                    processed_images.append(img)
                else:
                    # 对于base64图片，先解码再使用
                    import base64
                    import io
                    from PIL import Image
                    
                    img_data = base64.b64decode(image)
                    img = Image.open(io.BytesIO(img_data))
                    processed_images.append(img)
            elif isinstance(image, bytes):
                # 对于字节数据，直接使用
                from PIL import Image
                import io
                
                img = Image.open(io.BytesIO(image))
                processed_images.append(img)
        
        # 创建多模态内容
        contents.extend(processed_images)
        
        response = await asyncio.to_thread(
            self.model.generate_content,
            contents,
            generation_config=generation_config,
            safety_settings=safety_settings
        )
        
        # 提取token统计信息
        prompt_tokens = response.usage_metadata.prompt_token_count
        completion_tokens = response.usage_metadata.candidates_token_count
        total_tokens = response.usage_metadata.total_token_count
        
        usage = {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "cost": self.calculate_cost(prompt_tokens, completion_tokens)
        }
        
        return {
            "text": response.text,
            "model": self.model_name,
            "usage": usage,
            "finish_reason": "stop" if response.candidates[0].finish_reason == generation_types.FinishReason.STOP else response.candidates[0].finish_reason.name,
            "raw_response": response
        }
    
    async def get_embeddings(self, text: str) -> list:
        """获取文本嵌入向量"""
        embedding_model = "models/embedding-001"
        result = await asyncio.to_thread(genai.embed_content, 
                                        model=embedding_model,
                                        content=text,
                                        task_type="RETRIEVAL_QUERY")
        
        return result["embedding"]
    
    def get_token_count(self, text: str) -> int:
        """计算文本的token数量"""
        # Gemini没有官方的token计数工具，使用估算
        return len(text.split()) * 1.3
    
    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """计算API调用成本"""
        if self.model_name not in GEMINI_PRICING:
            return 0.0
        
        pricing = GEMINI_PRICING[self.model_name]
        prompt_cost = prompt_tokens * pricing["prompt"] / 1000
        completion_cost = completion_tokens * pricing["completion"] / 1000
        return prompt_cost + completion_cost
    
    @property
    def model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        if self.model_name not in GEMINI_MODELS:
            return {"context_window": 32000, "max_output_tokens": 8192}
        
        return GEMINI_MODELS[self.model_name]

# 注册提供商
LLMProviderFactory.register_provider("gemini", GeminiProvider)
```

#### 21.1.5 DeepSeek适配器实现

```python
# datapresso/llm_api/providers/deepseek_provider.py

import os
import json
import asyncio
from typing import Dict, Any, Optional, List, Union
from openai import AsyncOpenAI

from datapresso.llm_api.provider_factory import BaseLLMProvider, LLMProviderFactory
from datapresso.llm_api.constants import DEEPSEEK_MODELS, DEEPSEEK_PRICING

class DeepSeekProvider(BaseLLMProvider):
    """DeepSeek API适配器 (OpenAI兼容接口)"""
    
    def __init__(self, api_key: Optional[str] = None, model_name: str = "deepseek-chat", base_url: str = "https://api.deepseek.com/v1"):
        self.api_key = api_key or os.environ.get("DEEPSEEK_API_KEY")
        if not self.api_key:
            raise ValueError("未提供DeepSeek API密钥")
        
        self.model_name = model_name
        self.client = AsyncOpenAI(api_key=self.api_key, base_url=base_url)
        
    async def generate(self, prompt: str, system_prompt: Optional[str] = None, 
                     temperature: float = 0.7, max_tokens: int = 1000,
                     **kwargs) -> Dict[str, Any]:
        """生成文本响应"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        messages.append({"role": "user", "content": prompt})
        
        response = await self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs
        )
        
        usage = {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
            "cost": self.calculate_cost(response.usage.prompt_tokens, response.usage.completion_tokens)
        }
        
        return {
            "text": response.choices[0].message.content,
            "model": self.model_name,
            "usage": usage,
            "finish_reason": response.choices[0].finish_reason,
            "raw_response": response
        }
    
    async def generate_with_images(self, prompt: str, images: List[Union[str, bytes]], 
                                system_prompt: Optional[str] = None,
                                **kwargs) -> Dict[str, Any]:
        """生成包含图像的多模态响应"""
        # DeepSeek目前不支持多模态响应
        raise NotImplementedError("DeepSeek当前不支持多模态生成")
    
    async def get_embeddings(self, text: str) -> list:
        """获取文本嵌入向量"""
        response = await self.client.embeddings.create(
            model="deepseek-embeddings",
            input=text
        )
        return response.data[0].embedding
    
    def get_token_count(self, text: str) -> int:
        """计算文本的token数量"""
        # 使用tiktoken作为估算
        import tiktoken
        encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
        return len(encoding.encode(text))
    
    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """计算API调用成本"""
        if self.model_name not in DEEPSEEK_PRICING:
            return 0.0
        
        pricing = DEEPSEEK_PRICING[self.model_name]
        prompt_cost = prompt_tokens * pricing["prompt"] / 1000
        completion_cost = completion_tokens * pricing["completion"] / 1000
        return prompt_cost + completion_cost
    
    @property
    def model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        if self.model_name not in DEEPSEEK_MODELS:
            return {"context_window": 8192, "max_output_tokens": 4096}
        
        return DEEPSEEK_MODELS[self.model_name]

# 注册提供商
LLMProviderFactory.register_provider("deepseek", DeepSeekProvider)
```

#### 21.1.6 模型信息与价格常量

```python
# datapresso/llm_api/constants.py

# OpenAI模型信息
OPENAI_MODELS = {
    "gpt-4o": {
        "context_window": 128000,
        "max_output_tokens": 4096,
        "capabilities": ["text", "vision", "function_calling"],
    },
    "gpt-4o-mini": {
        "context_window": 128000,
        "max_output_tokens": 4096,
        "capabilities": ["text", "vision", "function_calling"],
    },
    "gpt-4-turbo": {
        "context_window": 128000,
        "max_output_tokens": 4096,
        "capabilities": ["text", "vision", "function_calling"],
    },
    "gpt-3.5-turbo": {
        "context_window": 16385,
        "max_output_tokens": 4096,
        "capabilities": ["text"],
    },
    "text-embedding-3-large": {
        "dimensions": 3072,
    },
    "text-embedding-3-small": {
        "dimensions": 1536,
    },
}

# OpenAI价格信息 (美元/1K tokens)
OPENAI_PRICING = {
    "gpt-4o": {
        "prompt": 0.005,
        "completion": 0.015,
    },
    "gpt-4o-mini": {
        "prompt": 0.0015,
        "completion": 0.0060,
    },
    "gpt-4-turbo": {
        "prompt": 0.01,
        "completion": 0.03,
    },
    "gpt-3.5-turbo": {
        "prompt": 0.0005,
        "completion": 0.0015,
    },
    "text-embedding-3-large": {
        "prompt": 0.00013,
        "completion": 0,
    },
    "text-embedding-3-small": {
        "prompt": 0.00002,
        "completion": 0,
    },
}

# Anthropic模型信息
ANTHROPIC_MODELS = {
    "claude-3-5-sonnet-20241022": {
        "context_window": 200000,
        "max_output_tokens": 4096,
        "capabilities": ["text", "vision"],
    },
    "claude-3-opus-20240229": {
        "context_window": 200000,
        "max_output_tokens": 4096,
        "capabilities": ["text", "vision"],
    },
    "claude-3-sonnet-20240229": {
        "context_window": 200000,
        "max_output_tokens": 4096,
        "capabilities": ["text", "vision"],
    },
    "claude-3-haiku-20240307": {
        "context_window": 200000,
        "max_output_tokens": 4096,
        "capabilities": ["text", "vision"],
    },
    "claude-3-7-sonnet-20250219": {
        "context_window": 200000,
        "max_output_tokens": 16000,
        "capabilities": ["text", "vision", "thinking"],
    },
}

# Anthropic价格信息 (美元/1K tokens)
ANTHROPIC_PRICING = {
    "claude-3-5-sonnet-20241022": {
        "prompt": 0.003,
        "completion": 0.015,
    },
    "claude-3-opus-20240229": {
        "prompt": 0.015,
        "completion": 0.075,
    },
    "claude-3-sonnet-20240229": {
        "prompt": 0.003,
        "completion": 0.015,
    },
    "claude-3-haiku-20240307": {
        "prompt": 0.00025,
        "completion": 0.00125,
    },
    "claude-3-7-sonnet-20250219": {
        "prompt": 0.003,
        "completion": 0.015,
    },
}

# Gemini模型信息
GEMINI_MODELS = {
    "gemini-1.5-flash-001": {
        "context_window": 1000000,
        "max_output_tokens": 8192,
        "capabilities": ["text", "vision", "function_calling"],
    },
    "gemini-1.5-pro-001": {
        "context_window": 1000000,
        "max_output_tokens": 8192,
        "capabilities": ["text", "vision", "function_calling"],
    },
    "gemini-1.0-pro": {
        "context_window": 32000,
        "max_output_tokens": 8192,
        "capabilities": ["text", "vision"],
    },
    "gemini-1.0-pro-vision": {
        "context_window": 16000,
        "max_output_tokens": 4096,
        "capabilities": ["text", "vision"],
    },
}

# Gemini价格信息 (美元/1K tokens)
GEMINI_PRICING = {
    "gemini-1.5-flash-001": {
        "prompt": 0.00035,
        "completion": 0.00105,
    },
    "gemini-1.5-pro-001": {
        "prompt": 0.0007,
        "completion": 0.0021,
    },
    "gemini-1.0-pro": {
        "prompt": 0.0001,
        "completion": 0.0003,
    },
    "gemini-1.0-pro-vision": {
        "prompt": 0.0001,
        "completion": 0.0003,
    },
}

# DeepSeek模型信息
DEEPSEEK_MODELS = {
    "deepseek-chat": {
        "context_window": 8192,
        "max_output_tokens": 4096,
        "capabilities": ["text"],
    },
    "deepseek-coder": {
        "context_window": 8192,
        "max_output_tokens": 4096,
        "capabilities": ["text", "code"],
    },
    "deepseek-embeddings": {
        "dimensions": 1536,
    },
}

# DeepSeek价格信息 (美元/1K tokens)
DEEPSEEK_PRICING = {
    "deepseek-chat": {
        "prompt": 0.0005,
        "completion": 0.0015,
    },
    "deepseek-coder": {
        "prompt": 0.0005,
        "completion": 0.0015,
    },
    "deepseek-embeddings": {
        "prompt": 0.00002,
        "completion": 0,
    },
}
```

#### 21.1.7 批量处理基础类

```python
# datapresso/llm_api/batch_processor.py

import os
import json
import asyncio
import logging
from typing import List, Dict, Any, Optional, Callable
from datetime import datetime
import aiofiles
import uuid

class BatchProcessor:
    """批量处理LLM请求的基类"""
    
    def __init__(self, provider_id: str, model_name: str, max_concurrent_requests: int = 5, 
                output_dir: str = "./batch_results", **provider_kwargs):
        """
        初始化批量处理器
        
        Args:
            provider_id: LLM提供商ID
            model_name: 模型名称
            max_concurrent_requests: 最大并发请求数
            output_dir: 输出目录
            provider_kwargs: 传递给LLM提供商的额外参数
        """
        from datapresso.llm_api.provider_factory import LLMProviderFactory
        
        self.provider_id = provider_id
        self.model_name = model_name
        self.max_concurrent_requests = max_concurrent_requests
        self.output_dir = output_dir
        self.provider_kwargs = provider_kwargs
        
        # 创建输出目录
        os.makedirs(output_dir, exist_ok=True)
        
        # 初始化LLM提供商
        self.provider = LLMProviderFactory.create_provider(
            provider_id=provider_id,
            model_name=model_name,
            **provider_kwargs
        )
        
        # 日志配置
        self.logger = logging.getLogger(f"BatchProcessor-{provider_id}")
        
        # 统计信息
        self.stats = {
            "total_requests": 0,
            "completed_requests": 0,
            "failed_requests": 0,
            "total_tokens": 0,
            "total_cost": 0.0,
        }
    
    async def process_batch(self, items: List[Dict[str, Any]], 
                          prompt_template: str, 
                          system_prompt: Optional[str] = None,
                          pre_process_fn: Optional[Callable] = None,
                          post_process_fn: Optional[Callable] = None,
                          **generate_kwargs) -> str:
        """
        批量处理请求
        
        Args:
            items: 要处理的数据项列表
            prompt_template: 提示词模板，使用{key}表示数据项中的字段
            system_prompt: 系统提示词
            pre_process_fn: 预处理函数，用于在发送到LLM前处理每个提示词
            post_process_fn: 后处理函数，用于处理LLM响应
            generate_kwargs: 传递给generate方法的额外参数
            
        Returns:
            结果文件路径
        """
        # 重置统计信息
        self.stats = {
            "total_requests": len(items),
            "completed_requests": 0,
            "failed_requests": 0,
            "total_tokens": 0,
            "total_cost": 0.0,
            "start_time": datetime.now().isoformat(),
        }
        
        # 创建信号量限制并发数
        semaphore = asyncio.Semaphore(self.max_concurrent_requests)
        
        # 创建结果文件
        batch_id = str(uuid.uuid4())
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        result_file = os.path.join(self.output_dir, f"{self.provider_id}_{timestamp}_{batch_id}.jsonl")
        
        # 定义处理单个请求的函数
        async def process_item(item, index):
            try:
                # 应用提示词模板
                prompt = prompt_template.format(**item)
                
                # 应用预处理函数
                if pre_process_fn:
                    prompt = pre_process_fn(prompt, item)
                
                # 限制并发请求数
                async with semaphore:
                    response = await self.provider.generate(
                        prompt=prompt,
                        system_prompt=system_prompt,
                        **generate_kwargs
                    )
                
                # 应用后处理函数
                if post_process_fn:
                    result = post_process_fn(response, item)
                else:
                    result = {
                        "item": item,
                        "response": response["text"],
                        "usage": response["usage"]
                    }
                
                # 更新统计信息
                self.stats["completed_requests"] += 1
                self.stats["total_tokens"] += response["usage"]["total_tokens"]
                self.stats["total_cost"] += response["usage"]["cost"]
                
                # 写入结果
                async with aiofiles.open(result_file, mode='a') as f:
                    await f.write(json.dumps({
                        "index": index,
                        **result
                    }) + '\n')
                
                return result
                
            except Exception as e:
                self.logger.error(f"处理项 {index} 时出错: {e}")
                self.stats["failed_requests"] += 1
                
                # 写入错误信息
                async with aiofiles.open(result_file, mode='a') as f:
                    await f.write(json.dumps({
                        "index": index,
                        "item": item,
                        "error": str(e)
                    }) + '\n')
                
                return {"index": index, "item": item, "error": str(e)}
        
        # 创建所有任务
        tasks = []
        for i, item in enumerate(items):
            tasks.append(process_item(item, i))
        
        # 执行所有任务并等待完成
        results = await asyncio.gather(*tasks)
        
        # 更新统计信息
        self.stats["end_time"] = datetime.now().isoformat()
        
        # 写入统计信息
        stats_file = os.path.join(self.output_dir, f"{self.provider_id}_{timestamp}_{batch_id}_stats.json")
        async with aiofiles.open(stats_file, mode='w') as f:
            await f.write(json.dumps(self.stats, indent=2))
        
        self.logger.info(f"批处理完成. 总计: {self.stats['total_requests']}, "
                       f"成功: {self.stats['completed_requests']}, "
                       f"失败: {self.stats['failed_requests']}, "
                       f"总Token: {self.stats['total_tokens']}, "
                       f"总成本: ${self.stats['total_cost']:.4f}")
        
        return result_file
```

#### 21.1.8 批量处理扩展 (针对特定提供商)

```python
# datapresso/llm_api/batch_processors/anthropic_batch.py

import os
import json
import asyncio
import logging
from typing import List, Dict, Any, Optional, Callable
from datetime import datetime
import aiofiles
import anthropic
import uuid

from datapresso.llm_api.constants import ANTHROPIC_PRICING

class AnthropicBatchProcessor:
    """Anthropic批量API专用处理器"""
    
    def __init__(self, api_key: Optional[str] = None, model_name: str = "claude-3-5-sonnet-20241022", 
                output_dir: str = "./batch_results"):
        """
        初始化Anthropic批量处理器
        
        Args:
            api_key: Anthropic API密钥
            model_name: 模型名称
            output_dir: 输出目录
        """
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("未提供Anthropic API密钥")
        
        self.model_name = model_name
        self.output_dir = output_dir
        
        # 创建输出目录
        os.makedirs(output_dir, exist_ok=True)
        
        # 初始化Anthropic客户端
        self.client = anthropic.AsyncAnthropic(api_key=self.api_key)
        
        # 日志配置
        self.logger = logging.getLogger("AnthropicBatchProcessor")
        
        # 统计信息
        self.stats = {
            "total_requests": 0,
            "completed_requests": 0,
            "failed_requests": 0,
            "total_tokens": 0,
            "total_cost": 0.0,
        }
    
    def calculate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """计算API调用成本"""
        if self.model_name not in ANTHROPIC_PRICING:
            return 0.0
        
        pricing = ANTHROPIC_PRICING[self.model_name]
        input_cost = input_tokens * pricing["prompt"] / 1000
        output_cost = output_tokens * pricing["completion"] / 1000
        
        # Anthropic批量API提供50%折扣
        return (input_cost + output_cost) * 0.5
    
    async def process_batch(self, items: List[Dict[str, Any]], 
                          prompt_template: str, 
                          system_prompt: Optional[str] = None,
                          pre_process_fn: Optional[Callable] = None,
                          post_process_fn: Optional[Callable] = None,
                          max_tokens: int = 4096,
                          temperature: float = 0.7,
                          **kwargs) -> str:
        """
        使用Anthropic批量API处理请求
        
        Args:
            items: 要处理的数据项列表
            prompt_template: 提示词模板，使用{key}表示数据项中的字段
            system_prompt: 系统提示词
            pre_process_fn: 预处理函数，用于在发送到LLM前处理每个提示词
            post_process_fn: 后处理函数，用于处理LLM响应
            max_tokens: 最大生成token数
            temperature: 温度
            
        Returns:
            结果文件路径
        """
        # 重置统计信息
        self.stats = {
            "total_requests": len(items),
            "completed_requests": 0,
            "failed_requests": 0,
            "total_tokens": 0,
            "total_cost": 0.0,
            "start_time": datetime.now().isoformat(),
        }
        
        # 创建结果文件
        batch_id = str(uuid.uuid4())
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        result_file = os.path.join(self.output_dir, f"anthropic_batch_{timestamp}_{batch_id}.jsonl")
        
        # 准备批量请求
        batch_requests = []
        for i, item in enumerate(items):
            # 应用提示词模板
            prompt = prompt_template.format(**item)
            
            # 应用预处理函数
            if pre_process_fn:
                prompt = pre_process_fn(prompt, item)
            
            # 创建请求
            request = {
                "custom_id": str(i),
                "params": {
                    "model": self.model_name,
                    "max_tokens": max_tokens,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": temperature,
                }
            }
            
            # 添加系统提示词
            if system_prompt:
                request["params"]["system"] = system_prompt
            
            batch_requests.append(request)
        
        try:
            # 提交批量请求
            batch = await self.client.messages.batches.create(
                requests=batch_requests
            )
            
            # 轮询批量作业状态
            while True:
                batch_status = await self.client.messages.batches.retrieve(
                    batch_id=batch.id
                )
                
                # 如果作业已完成或失败，则退出轮询
                if batch_status.status in ["succeeded", "failed", "canceled", "expired"]:
                    break
                
                # 等待一段时间后再次轮询
                await asyncio.sleep(5)
            
            # 获取批量作业结果
            results = await self.client.messages.batches.list_results(
                batch_id=batch.id
            )
            
            # 处理结果
            for result in results.data:
                idx = int(result.custom_id)
                item = items[idx]
                
                if result.type == "succeeded":
                    # 提取响应
                    message = result.message
                    response_text = message.content[0].text
                    
                    # 计算token使用情况
                    usage = {
                        "prompt_tokens": message.usage.input_tokens,
                        "completion_tokens": message.usage.output_tokens,
                        "total_tokens": message.usage.input_tokens + message.usage.output_tokens,
                        "cost": self.calculate_cost(message.usage.input_tokens, message.usage.output_tokens)
                    }
                    
                    # 应用后处理函数
                    if post_process_fn:
                        processed_result = post_process_fn({"text": response_text, "usage": usage}, item)
                    else:
                        processed_result = {
                            "item": item,
                            "response": response_text,
                            "usage": usage
                        }
                    
                    # 更新统计信息
                    self.stats["completed_requests"] += 1
                    self.stats["total_tokens"] += usage["total_tokens"]
                    self.stats["total_cost"] += usage["cost"]
                    
                    # 写入结果
                    async with aiofiles.open(result_file, mode='a') as f:
                        await f.write(json.dumps({
                            "index": idx,
                            **processed_result
                        }) + '\n')
                else:
                    # 处理失败的请求
                    self.stats["failed_requests"] += 1
                    
                    # 写入错误信息
                    async with aiofiles.open(result_file, mode='a') as f:
                        await f.write(json.dumps({
                            "index": idx,
                            "item": item,
                            "error": f"Request failed with type: {result.type}"
                        }) + '\n')
            
            # 更新统计信息
            self.stats["end_time"] = datetime.now().isoformat()
            
            # 写入统计信息
            stats_file = os.path.join(self.output_dir, f"anthropic_batch_{timestamp}_{batch_id}_stats.json")
            async with aiofiles.open(stats_file, mode='w') as f:
                await f.write(json.dumps(self.stats, indent=2))
            
            self.logger.info(f"批处理完成. 总计: {self.stats['total_requests']}, "
                           f"成功: {self.stats['completed_requests']}, "
                           f"失败: {self.stats['failed_requests']}, "
                           f"总Token: {self.stats['total_tokens']}, "
                           f"总成本: ${self.stats['total_cost']:.4f}")
            
            return result_file
            
        except Exception as e:
            self.logger.error(f"批处理请求失败: {e}")
            raise
```

```python
# datapresso/llm_api/batch_processors/openai_batch.py

import os
import json
import asyncio
import logging
from typing import List, Dict, Any, Optional, Callable
from datetime import datetime
import aiofiles
import httpx
import uuid

from datapresso.llm_api.constants import OPENAI_PRICING

class OpenAIBatchProcessor:
    """OpenAI批量API专用处理器"""
    
    def __init__(self, api_key: Optional[str] = None, model_name: str = "gpt-4o-mini", 
                output_dir: str = "./batch_results", base_url: str = "https://api.openai.com/v1"):
        """
        初始化OpenAI批量处理器
        
        Args:
            api_key: OpenAI API密钥
            model_name: 模型名称
            output_dir: 输出目录
            base_url: OpenAI API基础URL
        """
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("未提供OpenAI API密钥")
        
        self.model_name = model_name
        self.output_dir = output_dir
        self.base_url = base_url
        
        # 创建输出目录
        os.makedirs(output_dir, exist_ok=True)
        
        # 日志配置
        self.logger = logging.getLogger("OpenAIBatchProcessor")
        
        # 统计信息
        self.stats = {
            "total_requests": 0,
            "completed_requests": 0,
            "failed_requests": 0,
            "total_tokens": 0,
            "total_cost": 0.0,
        }
    
    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """计算API调用成本"""
        if self.model_name not in OPENAI_PRICING:
            return 0.0
        
        pricing = OPENAI_PRICING[self.model_name]
        prompt_cost = prompt_tokens * pricing["prompt"] / 1000
        completion_cost = completion_tokens * pricing["completion"] / 1000
        
        # OpenAI批量API提供50%折扣
        return (prompt_cost + completion_cost) * 0.5
    
    async def _poll_batch_status(self, client: httpx.AsyncClient, batch_id: str) -> Dict:
        """轮询批量作业状态"""
        url = f"{self.base_url}/batches/{batch_id}"
        
        while True:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            
            status = data.get("status")
            if status in ["completed", "failed", "cancelled", "expired"]:
                return data
            
            # 等待一段时间后再次轮询
            await asyncio.sleep(5)
    
    async def _get_batch_results(self, client: httpx.AsyncClient, batch_id: str) -> List[Dict]:
        """获取批量作业结果"""
        url = f"{self.base_url}/batches/{batch_id}/results"
        
        response = await client.get(url)
        response.raise_for_status()
        data = response.json()
        
        return data.get("data", [])
    
    async def process_batch(self, items: List[Dict[str, Any]], 
                          prompt_template: str, 
                          system_prompt: Optional[str] = None,
                          pre_process_fn: Optional[Callable] = None,
                          post_process_fn: Optional[Callable] = None,
                          max_tokens: int = 1000,
                          temperature: float = 0.7,
                          **kwargs) -> str:
        """
        使用OpenAI批量API处理请求
        
        Args:
            items: 要处理的数据项列表
            prompt_template: 提示词模板，使用{key}表示数据项中的字段
            system_prompt: 系统提示词
            pre_process_fn: 预处理函数，用于在发送到LLM前处理每个提示词
            post_process_fn: 后处理函数，用于处理LLM响应
            max_tokens: 最大生成token数
            temperature: 温度
            
        Returns:
            结果文件路径
        """
        # 重置统计信息
        self.stats = {
            "total_requests": len(items),
            "completed_requests": 0,
            "failed_requests": 0,
            "total_tokens": 0,
            "total_cost": 0.0,
            "start_time": datetime.now().isoformat(),
        }
        
        # 创建结果文件
        batch_id = str(uuid.uuid4())
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        result_file = os.path.join(self.output_dir, f"openai_batch_{timestamp}_{batch_id}.jsonl")
        
        # 准备批量请求
        batch_requests = []
        for i, item in enumerate(items):
            # 应用提示词模板
            prompt = prompt_template.format(**item)
            
            # 应用预处理函数
            if pre_process_fn:
                prompt = pre_process_fn(prompt, item)
            
            # 创建消息
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            
            messages.append({"role": "user", "content": prompt})
            
            # 创建请求
            batch_requests.append({
                "custom_id": str(i),
                "messages": messages,
                "model": self.model_name,
                "max_tokens": max_tokens,
                "temperature": temperature,
                **kwargs
            })
        
        # 创建批量请求
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                client.headers.update({
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "OpenAI-Beta": "batch-v1"
                })
                
                # 创建批量作业
                create_response = await client.post(
                    f"{self.base_url}/batches",
                    json={
                        "requests": batch_requests
                    }
                )
                create_response.raise_for_status()
                batch_data = create_response.json()
                batch_id = batch_data.get("id")
                
                # 轮询批量作业状态
                batch_status = await self._poll_batch_status(client, batch_id)
                
                # 获取批量作业结果
                results = await self._get_batch_results(client, batch_id)
                
                # 处理结果
                for result in results:
                    idx = int(result.get("custom_id", 0))
                    item = items[idx]
                    
                    if "error" not in result:
                        # 提取响应
                        choice = result.get("response", {}).get("choices", [{}])[0]
                        response_text = choice.get("message", {}).get("content", "")
                        
                        # 提取使用情况
                        usage_data = result.get("response", {}).get("usage", {})
                        usage = {
                            "prompt_tokens": usage_data.get("prompt_tokens", 0),
                            "completion_tokens": usage_data.get("completion_tokens", 0),
                            "total_tokens": usage_data.get("total_tokens", 0),
                            "cost": self.calculate_cost(
                                usage_data.get("prompt_tokens", 0),
                                usage_data.get("completion_tokens", 0)
                            )
                        }
                        
                        # 应用后处理函数
                        if post_process_fn:
                            processed_result = post_process_fn({"text": response_text, "usage": usage}, item)
                        else:
                            processed_result = {
                                "item": item,
                                "response": response_text,
                                "usage": usage
                            }
                        
                        # 更新统计信息
                        self.stats["completed_requests"] += 1
                        self.stats["total_tokens"] += usage["total_tokens"]
                        self.stats["total_cost"] += usage["cost"]
                        
                        # 写入结果
                        async with aiofiles.open(result_file, mode='a') as f:
                            await f.write(json.dumps({
                                "index": idx,
                                **processed_result
                            }) + '\n')
                    else:
                        # 处理失败的请求
                        error = result.get("error", {})
                        self.stats["failed_requests"] += 1
                        
                        # 写入错误信息
                        async with aiofiles.open(result_file, mode='a') as f:
                            await f.write(json.dumps({
                                "index": idx,
                                "item": item,
                                "error": error
                            }) + '\n')
                
                # 更新统计信息
                self.stats["end_time"] = datetime.now().isoformat()
                
                # 写入统计信息
                stats_file = os.path.join(self.output_dir, f"openai_batch_{timestamp}_{batch_id}_stats.json")
                async with aiofiles.open(stats_file, mode='w') as f:
                    await f.write(json.dumps(self.stats, indent=2))
                
                self.logger.info(f"批处理完成. 总计: {self.stats['total_requests']}, "
                               f"
