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
  testLlmProviderConnection: (providerName: string) => Promise<any>; // Added
  testLLMConnection: (testData: any) => Promise<any>; // Added for new API key testing
  fetchProviderModels: (providerName: string) => Promise<any>; // Added
  updateLlmProviderConfig: (providerName: string, configData: any) => Promise<any>; // Added
  uploadSeedData: (fileBuffer: number[], fileName: string, dataType?: string) => Promise<any>; // Added
  listSeedData: (params?: { page?: number; pageSize?: number; statusFilter?: string }) => Promise<any>; // Added

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
async function callApi(electronFuncKey: keyof ElectronAPI, httpFunc: Function | null, params?: any): Promise<any> {
  console.log(`callApi: Invoking ${String(electronFuncKey)} with params:`, params); // Added general log
  const snakeParams = keysToSnake(params);
  let response;

  if (isElectron && window.electronAPI) {
    const electronFunc = window.electronAPI[electronFuncKey];
    // All Electron API functions should be explicitly handled or throw an error if not found.
    // No generic 'else' branch for electronFunc calls.
    if (electronFuncKey === 'minimizeWindow') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['minimizeWindow'])();
    } else if (electronFuncKey === 'maximizeWindow') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['maximizeWindow'])();
    } else if (electronFuncKey === 'closeWindow') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['closeWindow'])();
    } else if (electronFuncKey === 'toggleMaximizeWindow') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['toggleMaximizeWindow'])();
    } else if (electronFuncKey === 'isWindowMaximized') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['isWindowMaximized'])();
    } else if (electronFuncKey === 'invokeLlm') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['invokeLlm'])(snakeParams);
    } else if (electronFuncKey === 'invokeLlmWithImages') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['invokeLlmWithImages'])(snakeParams);
    } else if (electronFuncKey === 'getLlmEmbeddings') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['getLlmEmbeddings'])(snakeParams);
    } else if (electronFuncKey === 'createLlmBatchTask') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['createLlmBatchTask'])(snakeParams);
    } else if (electronFuncKey === 'getLlmTaskStatus') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['getLlmTaskStatus'])(params); // taskId is string
    } else if (electronFuncKey === 'listLlmTasks') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['listLlmTasks'])(snakeParams);
    } else if (electronFuncKey === 'getLlmModels') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['getLlmModels'])(snakeParams);    } else if (electronFuncKey === 'fetchLLMProviders') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['fetchLLMProviders'])();
    } else if (electronFuncKey === 'testLlmProviderConnection') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['testLlmProviderConnection'])(params); // providerName is string
    } else if (electronFuncKey === 'updateLlmProviderConfig') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['updateLlmProviderConfig'])(params.providerName, keysToSnake(params.configData));
    } else if (electronFuncKey === 'uploadSeedData') {
      const file = params.file;
      const dataType = params.dataType;
      const fileBuffer = await file.arrayBuffer();
      if (electronFunc) response = await (electronFunc as ElectronAPI['uploadSeedData'])(Array.from(new Uint8Array(fileBuffer)), file.name, dataType);
    } else if (electronFuncKey === 'listSeedData') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['listSeedData'])(snakeParams);
    } else if (electronFuncKey === 'evaluateData') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['evaluateData'])(snakeParams);
    } else if (electronFuncKey === 'asyncEvaluateData') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['asyncEvaluateData'])(snakeParams);
    } else if (electronFuncKey === 'getEvaluationTaskResult') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['getEvaluationTaskResult'])(params); // taskId is string
    } else if (electronFuncKey === 'filterData') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['filterData'])(snakeParams);
    } else if (electronFuncKey === 'asyncFilterData') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['asyncFilterData'])(snakeParams);
    } else if (electronFuncKey === 'getFilteringTaskResult') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['getFilteringTaskResult'])(params); // taskId is string
    } else if (electronFuncKey === 'generateData') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['generateData'])(snakeParams);
    } else if (electronFuncKey === 'asyncGenerateData') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['asyncGenerateData'])(snakeParams);
    } else if (electronFuncKey === 'getGenerationTaskResult') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['getGenerationTaskResult'])(params); // taskId is string
    } else if (electronFuncKey === 'assessQuality') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['assessQuality'])(snakeParams);
    } else if (electronFuncKey === 'asyncAssessQuality') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['asyncAssessQuality'])(snakeParams);
    } else if (electronFuncKey === 'getAssessmentTaskResult') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['getAssessmentTaskResult'])(params); // taskId is string
    } else if (electronFuncKey === 'llamafactoryRun') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['llamafactoryRun'])(snakeParams);
    } else if (electronFuncKey === 'llamafactoryCreateConfig') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['llamafactoryCreateConfig'])(snakeParams);
    } else if (electronFuncKey === 'llamafactoryStartTask') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['llamafactoryStartTask'])(snakeParams);
    } else if (electronFuncKey === 'llamafactoryStopTask') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['llamafactoryStopTask'])(params);
    } else if (electronFuncKey === 'llamafactoryGetTaskStatus') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['llamafactoryGetTaskStatus'])(params);
    } else if (electronFuncKey === 'llamafactoryGetTaskLogs') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['llamafactoryGetTaskLogs'])(params);
    } else if (electronFuncKey === 'llamafactoryListTasks') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['listLlmTasks'])(snakeParams);
    } else if (electronFuncKey === 'llamafactoryModelTemplates') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['llamafactoryModelTemplates'])();
    } else if (electronFuncKey === 'llamafactoryAvailableDatasets') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['llamafactoryAvailableDatasets'])();
    } else if (electronFuncKey === 'getLlamaFactoryExampleConfig') {
      if (electronFunc && typeof electronFunc === 'function') response = await (electronFunc as NonNullable<ElectronAPI['getLlamaFactoryExampleConfig']>)(params);
    } else if (electronFuncKey === 'openFile') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['openFile'])(params);
    } else if (electronFuncKey === 'saveFile') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['saveFile'])(params.content, params.defaultPath);
    } else if (electronFuncKey === 'diagnoseWindowControls') {
      if (electronFunc) response = await (electronFunc as ElectronAPI['diagnoseWindowControls'])();
    } else if (electronFuncKey === 'setApiExecutionMode') {
      if (electronFunc && typeof electronFunc === 'function') response = await (electronFunc as NonNullable<ElectronAPI['setApiExecutionMode']>)(params as ExecutionMode);
    } else {
      // If we reach here, it means an ElectronAPI function was called that is not explicitly handled.
      // This indicates a missing case in the callApi function or an incorrect ElectronAPI interface definition.
      throw new Error(`Electron API function ${electronFuncKey} is not explicitly handled in callApi.`);
    }
  } else {
    // HTTP Fallback
    if (httpFunc === null) { // Check if httpFunc is explicitly null
      console.error(`HTTP function for ${electronFuncKey} is not defined or implemented, and no fallback provided.`);
      throw new Error(`HTTP function for ${electronFuncKey} not available.`);
    }
    if (typeof httpFunc !== 'function') { // Fallback for cases where it's not null but not a function
      console.error(`HTTP function for ${electronFuncKey} is not a callable function.`);
      throw new Error(`HTTP function for ${electronFuncKey} not available.`);
    }

    if (electronFuncKey === 'setApiExecutionMode') {
      response = await httpFunc(params as ExecutionMode);
    } else if (electronFuncKey === 'uploadSeedData') {
      const formData = new FormData();
      formData.append('file', params.file);
      if (params.dataType) {
        formData.append('data_type', params.dataType);
      }
      response = await fetch(`${API_BASE_URL}/seed_data/upload`, {
        method: 'POST',
        body: formData,
      }).then(res => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      });
    } else if (electronFuncKey === 'listSeedData') {
      const queryParams = new URLSearchParams(snakeParams).toString();
      response = await fetch(`${API_BASE_URL}/seed_data?${queryParams}`).then(res => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      });
    } else if (electronFuncKey === 'testLlmProviderConnection') {
      response = await fetch(`${API_BASE_URL}/llm_api/providers/${params}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).then(res => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      });
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
  if (isElectron && window.electronAPI && typeof window.electronAPI.fetchLLMProviders === 'function') {
    console.log("apiAdapter: Attempting to fetch LLM providers via Electron IPC.");
    try {
      rawResponse = await window.electronAPI.fetchLLMProviders();
      console.log("apiAdapter: Received Electron IPC response for fetchLLMProviders:", rawResponse);
    } catch (error) {
      console.error("apiAdapter: IPC call failed, falling back to HTTP:", error);
      // Fall through to HTTP fallback
    }
  }
  
  if (!rawResponse) {
    console.log("apiAdapter: Attempting to fetch LLM providers via HTTP fallback.");
    console.log("apiAdapter: Using API_BASE_URL:", API_BASE_URL);
    
    try {
      const response = await fetch(`${API_BASE_URL}/llm_api/providers`);
      console.log("apiAdapter: HTTP response status:", response.status);
      
      if (!response.ok) {
        let errorDetail = response.statusText;
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorDetail;
        } catch (e) { /* ignore */ }
        console.error(`apiAdapter: HTTP fetch failed: ${response.status} ${errorDetail}`);
        throw new Error(`Failed to fetch LLM providers: ${response.status} ${errorDetail}`);
      }
      rawResponse = await response.json();
      console.log("apiAdapter: Received HTTP response for fetchLLMProviders:", rawResponse);
    } catch (error) {
      console.error("apiAdapter: Network error during HTTP fetch:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Network error fetching LLM providers: ${errorMessage}`);
    }
  }

  if (rawResponse && rawResponse.providers) {
    console.log("apiAdapter: Returning camelCased providers from 'providers' key.");
    return keysToCamel(rawResponse.providers);
  } else if (rawResponse && rawResponse.status === 'success' && rawResponse.hasOwnProperty('providers')) {
     console.log("apiAdapter: Returning camelCased providers from 'providers' key (success status).");
     return keysToCamel(rawResponse.providers);
  }
  console.log("apiAdapter: Returning raw camelCased response.");
  return keysToCamel(rawResponse);
};

export const testLlmProviderConnection = async (providerName: string): Promise<any> => {
  if (isElectron && window.electronAPI) {
    if (typeof window.electronAPI.testLlmProviderConnection !== 'function') {
      console.error('electronAPI.testLlmProviderConnection is not defined.');
      throw new Error('electronAPI.testLlmProviderConnection is not defined.');
    }
    const rawResponse = await window.electronAPI.testLlmProviderConnection(providerName);
    return keysToCamel(rawResponse);
  } else {
    // HTTP fallback
    try {
      const response = await fetch(`${API_BASE_URL}/llm_api/providers/${providerName}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Empty body as per backend definition for now
      });
      if (!response.ok) {
        let errorDetail = response.statusText;
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorDetail;
        } catch (e) { /* ignore */ }
        throw new Error(`HTTP error! status: ${response.status} - ${errorDetail}`);
      }
      const rawResponse = await response.json();
      return keysToCamel(rawResponse);
    } catch (error) {
      console.error('Error in httpTestLlmProviderConnection:', error);
      throw error;
    }
  }
};

export const fetchProviderModels = async (providerName: string): Promise<any> => {
  if (isElectron && window.electronAPI) {
    if (typeof window.electronAPI.fetchProviderModels !== 'function') {
      console.warn('electronAPI.fetchProviderModels is not defined, falling back to HTTP.');
      // Fall through to HTTP fallback
    } else {
      try {
        const rawResponse = await window.electronAPI.fetchProviderModels(providerName);
        return keysToCamel(rawResponse);
      } catch (error) {
        console.error('electronAPI.fetchProviderModels failed, falling back to HTTP:', error);
        // Fall through to HTTP fallback
      }
    }
  }
  
  // HTTP fallback
  try {
    const response = await fetch(`${API_BASE_URL}/llm_api/providers/${providerName}/models`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      let errorDetail = response.statusText;
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || errorDetail;
      } catch (e) { /* ignore */ }
      throw new Error(`HTTP error! status: ${response.status} - ${errorDetail}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  } catch (error) {
    console.error('Error in fetchProviderModels:', error);
    throw error;
  }
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

export const uploadSeedData = async (file: File, dataType?: string): Promise<any> => {
  // The callApi function will handle the Electron vs HTTP logic.
  // We need to pass the file object and dataType as a single 'params' object to callApi.
  return callApi('uploadSeedData', null, { file, dataType }); // httpFunc is null as it's handled inside callApi
};

export const listSeedData = async (params?: { page?: number; pageSize?: number; statusFilter?: string }): Promise<any> => {
  // The callApi function will handle the Electron vs HTTP logic.
  return callApi('listSeedData', null, params); // httpFunc is null as it's handled inside callApi
};

// ===== 系统与配置管理 API =====
export const getAppConfig = async (): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('getAppConfig not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/config`);
    if (!response.ok) {
      throw new Error(`Failed to get app config: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

export const updateAppConfig = async (configUpdates: any): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('updateAppConfig not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keysToSnake(configUpdates)),
    });
    if (!response.ok) {
      throw new Error(`Failed to update app config: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

export const validateConfig = async (configContent: string): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('validateConfig not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/config/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config_content: configContent }),
    });
    if (!response.ok) {
      throw new Error(`Failed to validate config: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

// ===== 扩展的 LLM Provider 管理 API =====
export const getLlmProviderConfig = async (providerName: string): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('getLlmProviderConfig not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/llm/providers/${providerName}/config`);
    if (!response.ok) {
      throw new Error(`Failed to get LLM provider config: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

export const updateLlmProviderConfig = async (providerName: string, configData: any): Promise<any> => {
  return callApi('updateLlmProviderConfig', null, { providerName, configData });
};

// ===== 系统提示模板管理 API =====
export const getSystemPromptTemplates = async (stageName: string): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('getSystemPromptTemplates not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/llm/stages/${stageName}/system-prompt-templates`);
    if (!response.ok) {
      throw new Error(`Failed to get system prompt templates: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

export const getSystemPromptTemplate = async (stageName: string, templateId: string): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('getSystemPromptTemplate not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/llm/stages/${stageName}/system-prompt-templates/${templateId}`);
    if (!response.ok) {
      throw new Error(`Failed to get system prompt template: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

// ===== 输出模式模板管理 API =====
export const getOutputSchemaTemplates = async (stageName: string): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('getOutputSchemaTemplates not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/llm/stages/${stageName}/output-schema-templates`);
    if (!response.ok) {
      throw new Error(`Failed to get output schema templates: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

export const getOutputSchemaTemplate = async (stageName: string, templateId: string): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('getOutputSchemaTemplate not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/llm/stages/${stageName}/output-schema-templates/${templateId}`);
    if (!response.ok) {
      throw new Error(`Failed to get output schema template: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

// ===== 种子数据扩展管理 API =====
export const validateSeedData = async (fileId: string): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('validateSeedData not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/seed_data/${fileId}/validate`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to start seed data validation: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

export const indexSeedData = async (fileId: string): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('indexSeedData not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/seed_data/${fileId}/index`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to start seed data indexing: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

export const deleteSeedData = async (fileId: string): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('deleteSeedData not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/seed_data/${fileId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete seed data: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

// ===== 数据生成任务管理 API =====
export const createGenerationTask = async (taskConfig: any): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('createGenerationTask not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/generation/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keysToSnake(taskConfig)),
    });
    if (!response.ok) {
      throw new Error(`Failed to create generation task: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

export const listGenerationTasks = async (params?: { page?: number; pageSize?: number; statusFilter?: string }): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('listGenerationTasks not yet implemented in Electron API');
  } else {
    const queryParams = new URLSearchParams(keysToSnake(params || {})).toString();
    const response = await fetch(`${API_BASE_URL}/generation/tasks?${queryParams}`);
    if (!response.ok) {
      throw new Error(`Failed to list generation tasks: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

export const getGenerationTask = async (taskId: string): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('getGenerationTask not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/generation/tasks/${taskId}`);
    if (!response.ok) {
      throw new Error(`Failed to get generation task: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

export const getGenerationTaskResults = async (taskId: string, params?: { format?: string; page?: number; pageSize?: number; download?: boolean }): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('getGenerationTaskResults not yet implemented in Electron API');
  } else {
    const queryParams = new URLSearchParams(keysToSnake(params || {})).toString();
    const response = await fetch(`${API_BASE_URL}/generation/tasks/${taskId}/results?${queryParams}`);
    if (!response.ok) {
      throw new Error(`Failed to get generation task results: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

export const controlGenerationTask = async (taskId: string, action: 'pause' | 'resume' | 'cancel'): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('controlGenerationTask not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/generation/tasks/${taskId}/${action}`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to ${action} generation task: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

// ===== 质量评估任务管理 API =====
export const createAssessmentTask = async (taskConfig: any): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('createAssessmentTask not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/assessment/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keysToSnake(taskConfig)),
    });
    if (!response.ok) {
      throw new Error(`Failed to create assessment task: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

export const listAssessmentTasks = async (params?: { page?: number; pageSize?: number; statusFilter?: string }): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('listAssessmentTasks not yet implemented in Electron API');
  } else {
    const queryParams = new URLSearchParams(keysToSnake(params || {})).toString();
    const response = await fetch(`${API_BASE_URL}/assessment/tasks?${queryParams}`);
    if (!response.ok) {
      throw new Error(`Failed to list assessment tasks: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

export const getAssessmentTask = async (taskId: string): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('getAssessmentTask not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/assessment/tasks/${taskId}`);
    if (!response.ok) {
      throw new Error(`Failed to get assessment task: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

export const getAssessmentReport = async (taskId: string, format: string = 'json'): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('getAssessmentReport not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/assessment/tasks/${taskId}/report?format=${format}`);
    if (!response.ok) {
      throw new Error(`Failed to get assessment report: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

// ===== 数据筛选任务管理 API =====
export const applyDataFiltering = async (taskConfig: any): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('applyDataFiltering not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/filtering/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keysToSnake(taskConfig)),
    });
    if (!response.ok) {
      throw new Error(`Failed to apply data filtering: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

export const listFilteringTasks = async (params?: { page?: number; pageSize?: number; statusFilter?: string }): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('listFilteringTasks not yet implemented in Electron API');
  } else {
    const queryParams = new URLSearchParams(keysToSnake(params || {})).toString();
    const response = await fetch(`${API_BASE_URL}/filtering/tasks?${queryParams}`);
    if (!response.ok) {
      throw new Error(`Failed to list filtering tasks: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

export const getFilteringTask = async (taskId: string): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('getFilteringTask not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/filtering/tasks/${taskId}`);
    if (!response.ok) {
      throw new Error(`Failed to get filtering task: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

export const getFilteredData = async (taskId: string, params?: { format?: string; page?: number; pageSize?: number; download?: boolean }): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('getFilteredData not yet implemented in Electron API');
  } else {
    const queryParams = new URLSearchParams(keysToSnake(params || {})).toString();
    const response = await fetch(`${API_BASE_URL}/filtering/tasks/${taskId}/results?${queryParams}`);
    if (!response.ok) {
      throw new Error(`Failed to get filtered data: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

// ===== 通用任务管理 API =====
export const getTaskStatus = async (taskId: string): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('getTaskStatus not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/status`);
    if (!response.ok) {
      throw new Error(`Failed to get task status: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

export const getTaskLogs = async (taskId: string, params?: { nLines?: number; since?: string }): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('getTaskLogs not yet implemented in Electron API');
  } else {
    const queryParams = new URLSearchParams(keysToSnake(params || {})).toString();
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/logs?${queryParams}`);
    if (!response.ok) {
      throw new Error(`Failed to get task logs: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

export const retryTask = async (taskId: string): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('retryTask not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/retry`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to retry task: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

export const deleteTask = async (taskId: string): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('deleteTask not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete task: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

export const getSystemResourceUsage = async (): Promise<any> => {
  if (isElectron && window.electronAPI) {
    throw new Error('getSystemResourceUsage not yet implemented in Electron API');
  } else {
    const response = await fetch(`${API_BASE_URL}/system/resource-usage`);
    if (!response.ok) {
      throw new Error(`Failed to get system resource usage: ${response.status} ${response.statusText}`);
    }
    const rawResponse = await response.json();
    return keysToCamel(rawResponse);
  }
};

// 模块联调测试函数
export const testDataGenerationModule = async (): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/data_generation/test`);
    if (!response.ok) {
      throw new Error(`Data generation module test failed: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Data generation module test error:', error);
    throw error;
  }
};

export const testQualityAssessmentModule = async (): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/quality_assessment/test`);
    if (!response.ok) {
      throw new Error(`Quality assessment module test failed: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Quality assessment module test error:', error);
    throw error;
  }
};

export const testDataFilteringModule = async (): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/data_filtering/test`);
    if (!response.ok) {
      throw new Error(`Data filtering module test failed: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Data filtering module test error:', error);
    throw error;
  }
};

export const testLlamaFactoryModule = async (): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/llamafactory/test`);
    if (!response.ok) {
      throw new Error(`LlamaFactory module test failed: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('LlamaFactory module test error:', error);
    throw error;
  }
};