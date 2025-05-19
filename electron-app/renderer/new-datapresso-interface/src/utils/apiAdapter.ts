/**
 * API适配器 - 将直接HTTP请求转换为Electron IPC调用
 * 该适配器保持与原始API相同的接口，便于无缝集成
 */

// 导入大小写转换工具
import { keysToSnake, keysToCamel } from './caseConverter';
import type { ExecutionMode } from '@/contexts/SettingsContext'; // Import ExecutionMode

// 原始API调用函数（假设这些是您原有的API调用函数）
import {
  filterData as httpFilterData,
  asyncFilterData as httpAsyncFilterData,
  getFilteringTaskResult as httpGetFilteringTaskResult,
  generateData as httpGenerateData,
  asyncGenerateData as httpAsyncGenerateData,
  getGenerationTaskResult as httpGetGenerationTaskResult,
  invokeLlm as httpInvokeLlm,
  evaluateData as httpEvaluateData,
  asyncEvaluateData as httpAsyncEvaluateData,
  getEvaluationTaskResult as httpGetEvaluationTaskResult,
  assessQuality as httpAssessQuality,
  asyncAssessQuality as httpAsyncAssessQuality,
  getAssessmentTaskResult as httpGetAssessmentTaskResult,
  llamafactoryRun as httpLlamafactoryRun,
  getLlamaFactoryExampleConfig as httpGetLlamaFactoryExampleConfig,
  invokeLlmWithImages as httpInvokeLlmWithImages,
  getLlmEmbeddings as httpGetLlmEmbeddings,
  createLlmBatchTask as httpCreateLlmBatchTask,
  getLlmTaskStatus as httpGetLlmTaskStatus,
  listLlmTasks as httpListLlmTasks,
  getLlmModels as httpGetLlmModels,
  // ...其他API函数
} from './originalApi';

// 定义 window.electronAPI 的接口
// 注意：这应该与 preload.js 中暴露的 API 匹配
interface ElectronAPI {
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  toggleMaximizeWindow: () => Promise<void>;
  isWindowMaximized: () => Promise<boolean>;

  invokeLlm: (params: any) => Promise<any>;
  invokeLlmWithImages: (params: any) => Promise<any>;
  getLlmEmbeddings: (params: any) => Promise<any>;
  createLlmBatchTask: (params: any) => Promise<any>;
  getLlmTaskStatus: (taskId: string) => Promise<any>;
  listLlmTasks: (params?: any) => Promise<any>;
  getLlmModels: (params?: any) => Promise<any>;
  fetchLLMProviders: () => Promise<any>;

  evaluateData: (params: any) => Promise<any>;
  asyncEvaluateData: (params: any) => Promise<any>;
  getEvaluationTaskResult: (taskId: string) => Promise<any>;

  filterData: (params: any) => Promise<any>;
  asyncFilterData: (params: any) => Promise<any>;
  getFilteringTaskResult: (taskId: string) => Promise<any>;

  generateData: (params: any) => Promise<any>;
  asyncGenerateData: (params: any) => Promise<any>;
  getGenerationTaskResult: (taskId: string) => Promise<any>;

  assessQuality: (params: any) => Promise<any>;
  asyncAssessQuality: (params: any) => Promise<any>;
  getAssessmentTaskResult: (taskId: string) => Promise<any>;

  llamafactoryRun: (operationPayload: any) => Promise<any>;
  llamafactoryCreateConfig: (params: any) => Promise<any>;
  llamafactoryStartTask: (params: any) => Promise<any>;
  llamafactoryStopTask: (params: any) => Promise<any>;
  llamafactoryGetTaskStatus: (params: any) => Promise<any>;
  llamafactoryGetTaskLogs: (params: any) => Promise<any>;
  llamafactoryListTasks: (params?: any) => Promise<any>;
  llamafactoryModelTemplates: () => Promise<any>;
  llamafactoryAvailableDatasets: () => Promise<any>;
  getLlamaFactoryExampleConfig?: (examplePath: string) => Promise<any>; // Optional as it was commented out in preload

  openFile: (options?: any) => Promise<any>;
  saveFile: (content: string, defaultPath?: string) => Promise<any>;
  diagnoseWindowControls: () => Promise<any>;
  setApiExecutionMode?: (mode: ExecutionMode) => void; // Used imported ExecutionMode
}
// 扩展 Window 接口以包含 electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// 检测运行环境
const isElectron = window.electronAPI !== undefined;

// 辅助函数处理API调用和转换
async function callApi(electronFuncKey: keyof ElectronAPI, httpFunc: Function, params?: any): Promise<any> {
  const snakeParams = keysToSnake(params);
  let response;

  if (isElectron && window.electronAPI) {
    const electronFunc = window.electronAPI[electronFuncKey];
    if (typeof electronFunc !== 'function') {
      console.error(`Electron API function ${electronFuncKey} is not defined.`);
      throw new Error(`Electron API function ${electronFuncKey} is not defined.`);
    }
    
    if (electronFuncKey === 'setApiExecutionMode') {
      // Special handling for setApiExecutionMode, params is the mode itself
      response = await electronFunc(params as ExecutionMode);
  } else if (electronFuncKey === 'getFilteringTaskResult' && typeof params === 'string') {
    response = await window.electronAPI.getFilteringTaskResult(params);
  } else if (electronFuncKey === 'getGenerationTaskResult' && typeof params === 'string') {
    response = await window.electronAPI.getGenerationTaskResult(params);
  } else if (electronFuncKey === 'getEvaluationTaskResult' && typeof params === 'string') {
    response = await window.electronAPI.getEvaluationTaskResult(params);
  } else if (electronFuncKey === 'getAssessmentTaskResult' && typeof params === 'string') {
    response = await window.electronAPI.getAssessmentTaskResult(params);
  } else if (electronFuncKey === 'getLlmTaskStatus' && typeof params === 'string') {
    response = await window.electronAPI.getLlmTaskStatus(params);
  } else {
    response = await electronFunc(snakeParams);
  }
} else {
  // HTTP Fallback
  if (typeof httpFunc !== 'function') {
    console.error(`HTTP function for ${electronFuncKey} is not defined or implemented.`);
    throw new Error(`HTTP function for ${electronFuncKey} not available.`);
  }

  if (electronFuncKey === 'setApiExecutionMode') {
    response = await httpFunc(params as ExecutionMode);
  } else if (typeof params === 'string' &&
      (electronFuncKey === 'getFilteringTaskResult' ||
       electronFuncKey === 'getGenerationTaskResult' ||
       electronFuncKey === 'getEvaluationTaskResult' ||
       electronFuncKey === 'getAssessmentTaskResult' ||
       electronFuncKey === 'getLlmTaskStatus')) {
    // For HTTP GET requests with path parameters like taskId, httpFunc is already specific
    response = await httpFunc(params);
  } else {
    response = await httpFunc(snakeParams);
  }
  // IMPORTANT: The return keysToCamel(response) was inside the 'else' (HTTP Fallback) block.
  // It should be outside, after the main if/else, to apply to both Electron and HTTP responses.
}
return keysToCamel(response); // Moved to apply to all responses
}

// 适配后的API调用
export const filterData = async (params: any): Promise<any> => {
  return callApi('filterData', httpFilterData, params);
};

export const asyncFilterData = async (params: any): Promise<any> => {
  return callApi('asyncFilterData', httpAsyncFilterData, params);
};

export const getFilteringTaskResult = async (taskId: string): Promise<any> => {
  return callApi('getFilteringTaskResult', httpGetFilteringTaskResult, taskId);
};

export const generateData = async (params: any): Promise<any> => {
  return callApi('generateData', httpGenerateData, params);
};

export const asyncGenerateData = async (params: any): Promise<any> => {
  return callApi('asyncGenerateData', httpAsyncGenerateData, params);
};

export const getGenerationTaskResult = async (taskId: string): Promise<any> => {
  return callApi('getGenerationTaskResult', httpGetGenerationTaskResult, taskId);
};

export const invokeLlm = async (params: any): Promise<any> => {
  return callApi('invokeLlm', httpInvokeLlm, params);
};

export const invokeLlmWithImages = async (params: any): Promise<any> => {
  return callApi('invokeLlmWithImages', httpInvokeLlmWithImages, params);
};

export const getLlmEmbeddings = async (params: any): Promise<any> => {
  return callApi('getLlmEmbeddings', httpGetLlmEmbeddings, params);
};

export const createLlmBatchTask = async (params: any): Promise<any> => {
  return callApi('createLlmBatchTask', httpCreateLlmBatchTask, params);
};

export const getLlmTaskStatus = async (taskId: string): Promise<any> => {
  return callApi('getLlmTaskStatus', httpGetLlmTaskStatus, taskId);
};

export const listLlmTasks = async (params?: any): Promise<any> => {
  return callApi('listLlmTasks', httpListLlmTasks, params);
};

export const getLlmModels = async (params?: any): Promise<any> => {
  return callApi('getLlmModels', httpGetLlmModels, params);
};

// Evaluation API
export const evaluateData = async (params: any): Promise<any> => {
  return callApi('evaluateData', httpEvaluateData, params);
};

export const asyncEvaluateData = async (params: any): Promise<any> => {
  return callApi('asyncEvaluateData', httpAsyncEvaluateData, params);
};

export const getEvaluationTaskResult = async (taskId: string): Promise<any> => {
  return callApi('getEvaluationTaskResult', httpGetEvaluationTaskResult, taskId);
};

// LlamaFactory API Adapters
export const llamafactoryRun = async (operationPayload: any): Promise<any> => {
  return callApi('llamafactoryRun', httpLlamafactoryRun, operationPayload);
};

export const llamafactoryCreateConfig = async (configData: any, configType: string): Promise<any> => {
  return callApi('llamafactoryCreateConfig', httpLlamafactoryRun, { operation: 'save_config', configData, configType });
};

export const llamafactoryStartTask = async (taskType: string, configName: string, args?: any): Promise<any> => {
  return callApi('llamafactoryStartTask', httpLlamafactoryRun, { operation: 'run_task', taskType, configName, arguments: args });
};

export const llamafactoryStopTask = async (taskId: string): Promise<any> => {
  // preload.js expects params to be the taskId for 'api:llamafactory/stop_task'
  // httpLlamafactoryRun is a generic POST /run, so for HTTP we still need to wrap it.
  // The callApi function needs to handle this discrepancy or we need specific http functions.
  // For now, assuming httpLlamafactoryRun can take { operation: 'stop_task', taskId } for web.
  // For Electron, params should be taskId.
  // The callApi function's current logic for string params might handle this if electronFuncKey matches.
  return callApi('llamafactoryStopTask', httpLlamafactoryRun, { operation: 'stop_task', taskId });
  // If preload.js's llamafactoryStopTask expects just taskId:
  // return callApi('llamafactoryStopTask', httpLlamafactoryRun, isElectron ? taskId : { operation: 'stop_task', taskId });
  // Let's assume for now the IPC handler for 'api:llamafactory/stop_task' expects an object { taskId: "..." }
  // or that preload.js's (params) is flexible.
  // Given preload.js: llamafactoryStopTask: (params) => ipcRenderer.invoke('api:llamafactory/stop_task', params),
  // it's better if the IPC handler expects {taskId} or the service layer for /run handles it.
  // To be safe and explicit for IPC, if the handler expects taskId directly:
  // if (isElectron) return callApi('llamafactoryStopTask', httpLlamafactoryRun, taskId);
  // else return callApi('llamafactoryStopTask', httpLlamafactoryRun, { operation: 'stop_task', taskId });
  // For now, keeping it simple and assuming the IPC handler or service can manage the {operation, taskId} structure.
};

export const llamafactoryGetTaskStatus = async (taskId: string): Promise<any> => {
  // Similar to above, preload.js's llamafactoryGetTaskStatus expects 'params' which would be taskId.
  // The httpLlamafactoryRun is a POST to /run.
  // The backend router for /llamafactory/run needs to handle { operation: 'get_task_status', taskId }
  return callApi('llamafactoryGetTaskStatus', httpLlamafactoryRun, { operation: 'get_task_status', taskId });
};

export const llamafactoryGetTaskLogs = async (taskId: string, nLines?: number): Promise<any> => {
  // Backend /llamafactory/run needs to handle { operation: 'get_task_logs', taskId, n: nLines }
  return callApi('llamafactoryGetTaskLogs', httpLlamafactoryRun, { operation: 'get_task_logs', taskId, n: nLines });
};

export const llamafactoryListTasks = async (limit?: number, status?: string): Promise<any> => {
  return callApi('llamafactoryListTasks', httpLlamafactoryRun, { operation: 'list_tasks', limit, status });
};

export const llamafactoryModelTemplates = async (): Promise<any> => {
  return callApi('llamafactoryModelTemplates', httpLlamafactoryRun, { operation: 'get_model_templates' });
};

export const llamafactoryAvailableDatasets = async (): Promise<any> => {
  return callApi('llamafactoryAvailableDatasets', httpLlamafactoryRun, { operation: 'get_available_datasets' });
};

export const getLlamaFactoryExampleConfig = async (examplePath: string): Promise<any> => {
  if (isElectron && window.electronAPI?.getLlamaFactoryExampleConfig) {
     const result = await window.electronAPI.getLlamaFactoryExampleConfig(examplePath);
     return keysToCamel(result);
  } else if (isElectron) {
    console.warn("getLlamaFactoryExampleConfig IPC not available, trying generic run (might not work for GET)");
    return callApi('llamafactoryRun', httpGetLlamaFactoryExampleConfig, {operation: 'get_example_config', examplePath: examplePath});
  } else {
    const result = await httpGetLlamaFactoryExampleConfig(examplePath);
    return keysToCamel(result);
  }
};

// Quality Assessment API
export const assessQuality = async (params: any): Promise<any> => {
  return callApi('assessQuality', httpAssessQuality, params);
};

export const asyncAssessQuality = async (params: any): Promise<any> => {
  return callApi('asyncAssessQuality', httpAsyncAssessQuality, params);
};

export const getAssessmentTaskResult = async (taskId: string): Promise<any> => {
  return callApi('getAssessmentTaskResult', httpGetAssessmentTaskResult, taskId);
};

// Base URL for backend API when not in Electron
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

const API_BASE_URL = (import.meta as ImportMeta).env.VITE_API_BASE_URL || 'http://localhost:8000';


export const fetchLLMProviders = async (): Promise<any> => {
  let rawResponse;
  if (isElectron && window.electronAPI) {
    if (typeof window.electronAPI.fetchLLMProviders !== 'function') {
      console.error('electronAPI.fetchLLMProviders is not defined.');
      throw new Error('electronAPI.fetchLLMProviders is not defined.');
    }
    rawResponse = await window.electronAPI.fetchLLMProviders();
  } else {
    const response = await fetch(`${API_BASE_URL}/llm_api/providers`);
    if (!response.ok) {
      let errorDetail = response.statusText;
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || errorDetail;
      } catch (e) { /* ignore */ }
      throw new Error(`Failed to fetch LLM providers: ${response.status} ${errorDetail}`);
    }
    rawResponse = await response.json();
  }

  if (rawResponse && rawResponse.providers) {
    return keysToCamel(rawResponse.providers);
  } else if (rawResponse && rawResponse.status === 'success' && rawResponse.hasOwnProperty('providers')) {
     return keysToCamel(rawResponse.providers);
  }
  return keysToCamel(rawResponse);
};

// 添加Electron特有功能的API
export const openFile = async (options?: any): Promise<any> => {
  if (isElectron && window.electronAPI) {
    return window.electronAPI.openFile(options);
  } else {
    throw new Error('File dialog is only available in desktop app');
  }
}

export const saveFile = async (content: string, defaultPath?: string): Promise<any> => {
  if (isElectron && window.electronAPI) {
    return window.electronAPI.saveFile(content, defaultPath);
  } else {
    // Web环境下的文件保存替代方案
    const blob = new Blob([content], { type: 'application/json' }); // Or appropriate content type
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultPath ? defaultPath.split('/').pop() || 'download' : 'download.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { saved: true, path: a.download };
  }
};