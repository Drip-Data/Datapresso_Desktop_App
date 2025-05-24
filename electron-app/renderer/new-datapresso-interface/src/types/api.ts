/**
 * 前端API类型定义，与后端schemas.py保持一致
 */

// ===== 基础类型 =====
export interface BaseRequest {
  requestId?: string;
  timestamp?: string;
  clientVersion?: string;
}

export interface BaseResponse {
  status: 'success' | 'error';
  message?: string;
}

// ===== 筛选相关类型 =====
export type FilterOperation = 
  | 'equals'
  | 'not_equals' 
  | 'greater_than'
  | 'greater_than_or_equal_to' // Added
  | 'less_than'
  | 'less_than_or_equal_to' // Added
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'in_range'
  | 'not_in_range'
  | 'regex_match'
  | 'is_null'
  | 'is_not_null';

export interface FilterCondition {
  field: string;
  operation: FilterOperation;
  value?: any;
  caseSensitive?: boolean;
}

export interface DataFilteringRequest extends BaseRequest {
  data: Record<string, any>[];
  filterConditions: FilterCondition[];
  combineOperation?: 'AND' | 'OR';
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

// ===== 数据生成相关类型 =====
export enum GenerationMethod {
  VARIATION = "variation",
  TEMPLATE = "template",
  LLM_BASED = "llm_based",
}

export interface FieldConstraint {
  field: string;
  type: string;
  minValue?: number | string;
  maxValue?: number | string;
  allowedValues?: any[];
  regexPattern?: string;
  nullable?: boolean;
  unique?: boolean;
}

export interface DataGenerationRequest extends BaseRequest {
  seedData?: Record<string, any>[];
  template?: Record<string, any>;
  generationMethod?: GenerationMethod;
  count: number;
  fieldConstraints?: FieldConstraint[];
  variationFactor?: number;
  preserveRelationships?: boolean;
  randomSeed?: number;
  llmPrompt?: string;
  llmModel?: string;
}

// ===== 任务相关类型 =====
export interface Task {
  id: string;
  name: string;
  taskType: string;
  status: string;
  progress: number;
  parameters?: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  projectId?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface TaskCreate {
  id?: string;
  name: string;
  taskType: string;
  status?: string;
  progress?: number;
  parameters?: Record<string, any>;
  projectId?: string;
}

// ===== 种子数据相关类型 =====
export interface SeedData {
  id: string;
  filename: string;
  savedPath: string;
  fileSize: number;
  recordCount: number;
  dataType?: string;
  status: string;
  uploadDate: string;
  updatedAt: string;
}

export interface SeedDataCreate {
  id?: string;
  filename: string;
  savedPath: string;
  fileSize: number;
  recordCount: number;
  dataType?: string;
  status?: string;
  uploadDate?: string;
}

export interface SeedDataListResponse extends BaseResponse {
  data: {
    items: SeedData[];
    totalItems: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
  };
}

// ===== 质量评估相关类型 =====
export type QualityDimension = 
  | 'completeness'
  | 'accuracy'
  | 'consistency'
  | 'validity'
  | 'uniqueness'
  | 'diversity'
  | 'relevance'
  | 'ethical'
  | 'timeliness'
  | 'readability';

export interface QualityAssessmentRequest extends BaseRequest {
  data: Record<string, any>[];
  dimensions: QualityDimension[];
  schemaDefinition?: Record<string, any>;
  referenceData?: Record<string, any>[];
  weights?: Record<string, number>;
  thresholdScores?: Record<string, number>;
  generateReport?: boolean;
  reportFormat?: 'json' | 'html' | 'pdf';
  detailLevel?: 'low' | 'medium' | 'high';
  customRules?: Record<string, any>;
}

// ===== LLM API 相关类型 =====
export interface LlmApiRequest extends BaseRequest {
  prompt: string;
  model?: string;
  systemMessage?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  stream?: boolean;
  timeout?: number;
  provider?: string;
}

export interface LlmProviderInfo {
  models: Record<string, ModelDetail>;
  pricing: Record<string, {
    prompt: number;
    completion: number;
  }>;
  hasApiKey: boolean;
  capabilities: {
    text: boolean;
    images: boolean;
    embeddings: boolean;
    batch: boolean;
  };
}

export interface ModelDetail {
  contextWindow?: number;
  maxOutputTokens?: number;
  capabilities?: string[];
  dimensions?: number;
}

export interface LlmProvidersConfig {
  [providerId: string]: LlmProviderInfo;
}

// ===== 通用分页类型 =====
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  statusFilter?: string;
}

export interface PaginatedResponse<T> extends BaseResponse {
  data: {
    items: T[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

// ===== 任务相关的API响应类型 =====
export interface GenerationTaskResponse extends BaseResponse {
  data: {
    taskId: string;
    status: string;
    progress: number;
    generatedData?: Record<string, any>[];
    count?: number;
  };
}

export interface AssessmentTaskResponse extends BaseResponse {
  data: {
    taskId: string;
    status: string;
    progress: number;
    report?: Record<string, any>;
    scores?: Record<string, number>;
  };
}

export interface FilteringTaskResponse extends BaseResponse {
  data: {
    taskId: string;
    status: string;
    progress: number;
    filteredData?: Record<string, any>[];
    filteredCount?: number;
  };
}

// ===== 系统配置相关类型 =====
export interface AppConfig {
  outputDir: string;
  logLevel: string;
  defaultLlmProviderForGeneration: string;
  defaultGenerationModel: string;
  seedDataPath: string;
  cacheEnabled: boolean;
  maxConcurrentTasks: number;
}

export interface AppConfigResponse extends BaseResponse {
  data: AppConfig;
}

export interface UpdateAppConfigRequest {
  outputDir?: string;
  logLevel?: string;
  maxConcurrentTasks?: number;
  [key: string]: any;
}