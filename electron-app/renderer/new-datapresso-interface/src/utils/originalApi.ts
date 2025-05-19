/**
 * Placeholder for original HTTP API calls for web environment.
 * These functions would typically use fetch or axios to interact with the backend API.
 * For the Electron app, these are fallbacks if isElectron is false.
 */

// 导入大小写转换工具
import { keysToSnake, keysToCamel } from './caseConverter';

// Vite uses import.meta.env for environment variables
// Ensure VITE_API_BASE_URL is defined in your .env file (e.g., .env.development)
// For TypeScript, you might need to declare import.meta.env or use a .d.ts file
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  // Add other env variables here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

const API_BASE_URL = (import.meta as ImportMeta).env.VITE_API_BASE_URL || 'http://localhost:8000';


// apiAdapter.js expects to import 'filterData' and 'generateData' from this module
export const filterData = async (params: any): Promise<any> => {
  console.log('Attempting HTTP call for filterData with params:', params);
  const snakeParams = keysToSnake(params);
  try {
    const response = await fetch(`${API_BASE_URL}/data_filtering/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snakeParams),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }
    const responseData = await response.json();
    return keysToCamel(responseData);
  } catch (error) {
    console.error('Error in httpFilterData:', error);
    throw error;
  }
};

export const asyncFilterData = async (params: any): Promise<any> => {
  console.log('Attempting HTTP call for asyncFilterData with params:', params);
  const snakeParams = keysToSnake(params);
  try {
    const response = await fetch(`${API_BASE_URL}/data_filtering/async_filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snakeParams),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }
    const responseData = await response.json();
    return keysToCamel(responseData);
  } catch (error) {
    console.error('Error in httpAsyncFilterData:', error);
    throw error;
  }
};

export const getFilteringTaskResult = async (taskId: string): Promise<any> => {
  console.log(`Attempting HTTP call for getFilteringTaskResult for taskId: ${taskId}`);
  try {
    const response = await fetch(`${API_BASE_URL}/data_filtering/task/${taskId}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }
    const responseData = await response.json();
    return keysToCamel(responseData);
  } catch (error) {
    console.error(`Error in httpGetFilteringTaskResult for taskId ${taskId}:`, error);
    throw error;
  }
};

export const generateData = async (params: any): Promise<any> => {
  console.log('Attempting HTTP call for generateData with params:', params);
  const snakeParams = keysToSnake(params);
  try {
    const response = await fetch(`${API_BASE_URL}/data_generation/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snakeParams),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }
    const responseData = await response.json();
    return keysToCamel(responseData);
  } catch (error) {
    console.error('Error in httpGenerateData:', error);
    throw error;
  }
};

export const asyncGenerateData = async (params: any): Promise<any> => {
  console.log('Attempting HTTP call for asyncGenerateData with params:', params);
  const snakeParams = keysToSnake(params);
  try {
    const response = await fetch(`${API_BASE_URL}/data_generation/async_generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snakeParams),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }
    const responseData = await response.json();
    return keysToCamel(responseData);
  } catch (error) {
    console.error('Error in httpAsyncGenerateData:', error);
    throw error;
  }
};

export const getGenerationTaskResult = async (taskId: string): Promise<any> => {
  console.log(`Attempting HTTP call for getGenerationTaskResult for taskId: ${taskId}`);
  try {
    const response = await fetch(`${API_BASE_URL}/data_generation/task/${taskId}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }
    const responseData = await response.json();
    return keysToCamel(responseData);
  } catch (error) {
    console.error(`Error in httpGetGenerationTaskResult for taskId ${taskId}:`, error);
    throw error;
  }
};

export const invokeLlm = async (params: any): Promise<any> => {
  console.log('Attempting HTTP call for invokeLlm with params:', params);
  const snakeParams = keysToSnake(params);
  try {
    const response = await fetch(`${API_BASE_URL}/llm_api/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(snakeParams),
    });
    if (!response.ok) {
      let errorDetail = response.statusText;
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || errorDetail;
      } catch (e) { /* ignore */ }
      throw new Error(`HTTP error! status: ${response.status} - ${errorDetail}`);
    }
    const responseData = await response.json();
    return keysToCamel(responseData);
  } catch (error) {
    console.error('Error in httpInvokeLlm:', error);
    throw error;
  }
};

export const invokeLlmWithImages = async (params: any): Promise<any> => {
  console.log('Attempting HTTP call for invokeLlmWithImages with params:', params);
  const snakeParams = keysToSnake(params);
  const formData = new FormData();
  formData.append('prompt', snakeParams.prompt);
  formData.append('model', snakeParams.model);
  if (snakeParams.system_message) {
    formData.append('system_message', snakeParams.system_message);
  }
  if (snakeParams.provider) {
    formData.append('provider', snakeParams.provider);
  }
  (snakeParams.images || []).forEach((img: string) => formData.append('image_urls', img));

  try {
    const response = await fetch(`${API_BASE_URL}/llm_api/invoke_with_images`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }
    const responseData = await response.json();
    return keysToCamel(responseData);
  } catch (error) {
    console.error('Error in httpInvokeLlmWithImages:', error);
    throw error;
  }
};

export const getLlmEmbeddings = async (params: any): Promise<any> => {
  console.log('Attempting HTTP call for getLlmEmbeddings with params:', params);
  const snakeParams = keysToSnake(params);
  try {
    const response = await fetch(`${API_BASE_URL}/llm_api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snakeParams),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }
    const responseData = await response.json();
    return keysToCamel(responseData);
  } catch (error) {
    console.error('Error in httpGetLlmEmbeddings:', error);
    throw error;
  }
};

export const createLlmBatchTask = async (params: any): Promise<any> => {
  console.log('Attempting HTTP call for createLlmBatchTask with params:', params);
  const snakeParams = keysToSnake(params);
  try {
    const response = await fetch(`${API_BASE_URL}/llm_api/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snakeParams),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }
    const responseData = await response.json();
    return keysToCamel(responseData);
  } catch (error) {
    console.error('Error in httpCreateLlmBatchTask:', error);
    throw error;
  }
};

export const getLlmTaskStatus = async (taskId: string): Promise<any> => {
  console.log(`Attempting HTTP call for getLlmTaskStatus for taskId: ${taskId}`);
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }
    const responseData = await response.json();
    return keysToCamel(responseData);
  } catch (error) {
    console.error(`Error in httpGetLlmTaskStatus for taskId ${taskId}:`, error);
    throw error;
  }
};

export const listLlmTasks = async (params?: any): Promise<any> => {
  console.log('Attempting HTTP call for listLlmTasks with params:', params);
  const snakeParams = keysToSnake(params);
  const queryParams = new URLSearchParams(snakeParams).toString();
  try {
    const response = await fetch(`${API_BASE_URL}/tasks?${queryParams}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }
    const responseData = await response.json();
    return keysToCamel(responseData);
  } catch (error) {
    console.error('Error in httpListLlmTasks:', error);
    throw error;
  }
};

export const getLlmModels = async (params?: any): Promise<any> => {
  console.log('Attempting HTTP call for getLlmModels with params:', params);
  const snakeParams = keysToSnake(params);
  const queryParams = new URLSearchParams(snakeParams).toString();
  try {
    const response = await fetch(`${API_BASE_URL}/llm_api/models?${queryParams}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }
    const responseData = await response.json();
    return keysToCamel(responseData);
  } catch (error) {
    console.error('Error in httpGetLlmModels:', error);
    throw error;
  }
};

export const evaluateData = async (params: any): Promise<any> => {
  console.log('Attempting HTTP call for evaluateData with params:', params);
  const snakeParams = keysToSnake(params);
  try {
    const response = await fetch(`${API_BASE_URL}/evaluation/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snakeParams),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }
    const responseData = await response.json();
    return keysToCamel(responseData);
  } catch (error) {
    console.error('Error in httpEvaluateData:', error);
    throw error;
  }
};

export const asyncEvaluateData = async (params: any): Promise<any> => {
  console.log('Attempting HTTP call for asyncEvaluateData with params:', params);
  const snakeParams = keysToSnake(params);
  try {
    const response = await fetch(`${API_BASE_URL}/evaluation/async_evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snakeParams),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }
    const responseData = await response.json();
    return keysToCamel(responseData);
  } catch (error) {
    console.error('Error in httpAsyncEvaluateData:', error);
    throw error;
  }
};

export const getEvaluationTaskResult = async (taskId: string): Promise<any> => {
  console.log(`Attempting HTTP call for getEvaluationTaskResult for taskId: ${taskId}`);
  try {
    const response = await fetch(`${API_BASE_URL}/evaluation/task/${taskId}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }
    const responseData = await response.json();
    return keysToCamel(responseData);
  } catch (error) {
    console.error(`Error in httpGetEvaluationTaskResult for taskId ${taskId}:`, error);
    throw error;
  }
};

export const llamafactoryRun = async (operationPayload: any): Promise<any> => {
  console.log('Attempting HTTP call for llamafactoryRun with payload:', operationPayload);
  const snakePayload = keysToSnake(operationPayload);
  try {
    const response = await fetch(`${API_BASE_URL}/llamafactory/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snakePayload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }
    const responseData = await response.json();
    return keysToCamel(responseData);
  } catch (error) {
    console.error('Error in httpLlamafactoryRun:', error);
    throw error;
  }
};

export const getLlamaFactoryExampleConfig = async (examplePath: string): Promise<any> => {
  console.log(`Attempting HTTP call for getLlamaFactoryExampleConfig for path: ${examplePath}`);
  try {
    const response = await fetch(`${API_BASE_URL}/llamafactory/examples/${examplePath}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }
    const responseData = await response.json();
    return keysToCamel(responseData);
  } catch (error) {
    console.error(`Error in httpGetLlamaFactoryExampleConfig for path ${examplePath}:`, error);
    throw error;
  }
};

export const assessQuality = async (params: any): Promise<any> => {
  console.log('Attempting HTTP call for assessQuality with params:', params);
  const snakeParams = keysToSnake(params);
  try {
    const response = await fetch(`${API_BASE_URL}/quality_assessment/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snakeParams),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }
    const responseData = await response.json();
    return keysToCamel(responseData);
  } catch (error) {
    console.error('Error in httpAssessQuality:', error);
    throw error;
  }
};

export const asyncAssessQuality = async (params: any): Promise<any> => {
  console.log('Attempting HTTP call for asyncAssessQuality with params:', params);
  const snakeParams = keysToSnake(params);
  try {
    const response = await fetch(`${API_BASE_URL}/quality_assessment/async_assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snakeParams),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }
    const responseData = await response.json();
    return keysToCamel(responseData);
  } catch (error) {
    console.error('Error in httpAsyncAssessQuality:', error);
    throw error;
  }
};

export const getAssessmentTaskResult = async (taskId: string): Promise<any> => {
  console.log(`Attempting HTTP call for getAssessmentTaskResult for taskId: ${taskId}`);
  try {
    const response = await fetch(`${API_BASE_URL}/quality_assessment/task/${taskId}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.detail}`);
    }
    const responseData = await response.json();
    return keysToCamel(responseData);
  } catch (error) {
    console.error(`Error in httpGetAssessmentTaskResult for taskId ${taskId}:`, error);
    throw error;
  }
};

console.log('originalApi.ts loaded (placeholder for web HTTP calls)');