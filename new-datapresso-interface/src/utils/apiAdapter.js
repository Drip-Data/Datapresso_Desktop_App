/**
 * API适配器 - 将前端调用转换为Electron IPC调用或HTTP请求。
 * 负责参数名转换 (camelCase <-> snake_case)。
 */

let currentExecutionMode = 'demo'; // Default to demo mode

// Function to be called by SettingsContext or other parts of the app to set the mode
export function setApiExecutionModeGlobally(mode) {
  if (mode === 'demo' || mode === 'production') {
    currentExecutionMode = mode;
    console.log(`API Adapter Execution Mode set to: ${currentExecutionMode}`);
  } else {
    console.warn(`API Adapter: Invalid execution mode "${mode}" requested.`);
  }
}
// Expose it to window for SettingsContext to call, if not using direct import/export between them
if (typeof window !== 'undefined') {
  window.setApiExecutionModeGlobally = setApiExecutionModeGlobally;
}


// 辅助函数：将对象键从 camelCase 转换为 snake_case
function convertToSnakeCase(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(convertToSnakeCase);
  }
  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    acc[snakeKey] = convertToSnakeCase(obj[key]);
    return acc;
  }, {});
}

// 辅助函数：将对象键从 snake_case 转换为 camelCase
function convertToCamelCase(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(convertToCamelCase);
  }
  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
    acc[camelKey] = convertToCamelCase(obj[key]);
    return acc;
  }, {});
}

// 检测运行环境
const isElectron = window.electronAPI !== undefined;

// 原始API调用函数 (假设这些是您原有的API调用函数或将要实现的)
// import * as httpApi from './originalApi'; // Placeholder

// 统一的请求处理器
async function requestHandler(ipcMethodName, httpMethod, params, mockImplementation) {
  if (currentExecutionMode === 'demo') {
    console.log(`API Adapter (Demo Mode): Simulating call for ${ipcMethodName} with params:`, params);
    if (typeof mockImplementation === 'function') {
      // Ensure mockImplementation is async or handles promises correctly if it needs to simulate async behavior
      const mockResponse = await mockImplementation(params);
      return mockResponse; // Mock implementation should return camelCase if that's what the app expects
    } else {
      // Generic mock response
      return {
        status: 'success',
        message: `Mocked response for ${ipcMethodName}`,
        data: { ...params, mocked: true },
        // Ensure the mock response structure matches what the calling code expects
        // For task creation, it might expect a taskId or similar structure.
        // For get status, it might expect a task object.
      };
    }
  }

  // Production mode: actual API call
  const snakeCaseParams = convertToSnakeCase(params);
  let response;
  if (isElectron) {
    if (typeof window.electronAPI[ipcMethodName] !== 'function') {
      throw new Error(`Electron API method '${ipcMethodName}' not found.`);
    }
    response = await window.electronAPI[ipcMethodName](snakeCaseParams);
  } else {
    console.warn(`HTTP fallback for ${ipcMethodName} not fully implemented. Params:`, snakeCaseParams);
    throw new Error(`HTTP API for ${ipcMethodName} is not available in this environment or not implemented.`);
  }
  return convertToCamelCase(response);
}

// --- 数据过滤 API ---
export const filterData = async (params) => {
  return requestHandler('filterData', null, params, (p) => {
    console.log("DEMO: filterData called with", p);
    const mockFilteredData = (p.data || []).slice(0, Math.max(1, Math.floor((p.data || []).length * 0.5))); // Simulate filtering
    return Promise.resolve({
      status: 'success',
      message: 'Mocked filterData successful',
      filteredData: mockFilteredData,
      totalCount: (p.data || []).length,
      filteredCount: mockFilteredData.length,
      filterSummary: { mockedSummary: true },
      pageInfo: p.limit ? { total: mockFilteredData.length, offset: p.offset || 0, limit: p.limit, hasMore: (p.offset || 0) + p.limit < mockFilteredData.length } : null
    });
  });
};

export const startAsyncFilter = async (params) => {
  return requestHandler('asyncFilterData', null, params, (p) => {
    const taskId = `demo-filter-task-${Date.now()}`;
    console.log("DEMO: startAsyncFilter called with", p, "generated taskId:", taskId);
    // Simulate task creation and background processing for demo
    setTimeout(() => console.log(`DEMO: Filter task ${taskId} would be processing in background.`), 1000);
    return Promise.resolve({ status: 'success', message: `Async filter task started with ID: ${taskId}`, taskId });
  });
};

export const getFilterTaskStatus = async (params) => { // params will be { taskId }
  return requestHandler('getFilteringTaskResult', null, params, (p) => {
    console.log("DEMO: getFilterTaskStatus called for", p.taskId);
    // Simulate different task statuses for demo
    const r = Math.random();
    if (r < 0.3) return Promise.resolve({ status: 'pending', message: `Task ${p.taskId} is pending. Progress: 0%`, requestId: p.taskId });
    if (r < 0.7) return Promise.resolve({ status: 'pending', message: `Task ${p.taskId} is running. Progress: 50%`, requestId: p.taskId });
    return Promise.resolve({
      status: 'success',
      message: 'Mocked task completed successfully',
      requestId: p.taskId,
      filteredData: [{id:1, mocked:true}], // Example data
      totalCount: 10,
      filteredCount: 1,
      filterSummary: {mocked:true},
      pageInfo: null
      // This structure should match DataFilteringResponse
    });
  });
};

// --- 数据生成 API ---
export const generateData = async (params) => {
  return requestHandler('generateData', null, params, (p) => {
    console.log("DEMO: generateData called with", p);
    const mockGeneratedData = Array(p.count || 5).fill(null).map((_,i) => ({id: `gen-${i}`, value: Math.random()*100, mocked:true}));
    return Promise.resolve({
      status: 'success',
      message: 'Mocked generateData successful',
      generatedData: mockGeneratedData,
      generationMethod: p.generationMethod,
      count: mockGeneratedData.length,
      stats: { mockedStats: true },
      seedUsed: p.randomSeed
    });
  });
};

export const startAsyncGeneration = async (params) => {
   return requestHandler('asyncGenerateData', null, params, (p) => {
    const taskId = `demo-gen-task-${Date.now()}`;
    console.log("DEMO: startAsyncGeneration called with", p, "generated taskId:", taskId);
    setTimeout(() => console.log(`DEMO: Generation task ${taskId} would be processing.`), 1000);
    return Promise.resolve({ status: 'success', message: `Async generation task started with ID: ${taskId}`, taskId });
  });
};

export const getGenerationTaskStatus = async (params) => { // params will be { taskId }
  return requestHandler('getGenerationTaskResult', null, params, (p) => {
    console.log("DEMO: getGenerationTaskStatus called for", p.taskId);
    const r = Math.random();
    if (r < 0.3) return Promise.resolve({ status: 'pending', message: `Task ${p.taskId} is pending. Progress: 0%`, requestId: p.taskId });
    if (r < 0.7) return Promise.resolve({ status: 'pending', message: `Task ${p.taskId} is running. Progress: 60%`, requestId: p.taskId });
    return Promise.resolve({
      status: 'success',
      message: 'Mocked generation task completed',
      requestId: p.taskId,
      generatedData: [{id:'gen-mock', value: 'mocked'}], // Example data
      generationMethod: "llm_based",
      count: 1,
      stats: {mocked:true}
      // This structure should match DataGenerationResponse
    });
  });
};

// --- LLM API ---
export const invokeLlm = async (params) => {
  return requestHandler('invokeLlm', null, params, (p) => {
    console.log("DEMO: invokeLlm called with", p);
    return Promise.resolve({
      result: `Mocked LLM response for prompt: "${p.prompt}" using model ${p.model}.`,
      model: p.model,
      tokensUsed: (p.prompt || "").length * 2, // Rough estimate
      provider: p.provider || 'openai',
      status: 'success',
      message: 'Mocked LLM invocation successful'
    });
  });
};

export const invokeLlmWithImages = async (params) => {
  return requestHandler('invokeLlmWithImages', null, params, (p) => {
    console.log("DEMO: invokeLlmWithImages called with", p);
    return Promise.resolve({
      result: `Mocked Multimodal LLM response for prompt: "${p.prompt}" with ${p.images?.length || 0} images.`,
      model: p.model,
      tokensUsed: (p.prompt || "").length * 3,
      provider: p.provider || 'openai',
      status: 'success',
      message: 'Mocked Multimodal LLM invocation successful'
    });
  });
};

export const startLlmBatchTask = async (params) => {
  return requestHandler('createLlmBatchTask', null, params, (p) => {
    const taskId = `demo-llm-batch-${Date.now()}`;
    console.log("DEMO: startLlmBatchTask called with", p, "generated taskId:", taskId);
    setTimeout(() => console.log(`DEMO: LLM Batch task ${taskId} would be processing.`), 1000);
    return Promise.resolve({ status: 'success', message: `LLM Batch task created with ID: ${taskId}`, taskId });
  });
};

export const getLlmBatchTaskStatus = async (params) => { // params will be { taskId }
  return requestHandler('getLlmTaskStatus', null, params, (p) => {
    console.log("DEMO: getLlmBatchTaskStatus called for", p.taskId);
     const r = Math.random();
    if (r < 0.3) return Promise.resolve({ id: p.taskId, status: 'pending', progress: 0.1, taskType: 'llm_batch' });
    if (r < 0.7) return Promise.resolve({ id: p.taskId, status: 'running', progress: 0.5, taskType: 'llm_batch' });
    return Promise.resolve({
      id: p.taskId,
      status: 'completed',
      progress: 1.0,
      taskType: 'llm_batch',
      result: { resultFile: '/mock/path/to/results.jsonl', stats: { totalRequests: 10, completedRequests: 10 } }
      // This structure should match schemas.Task
    });
  });
};

export const getLlmProviders = async () => {
  return requestHandler('fetchLLMProviders', null, {}, () => {
    console.log("DEMO: getLlmProviders called");
    return Promise.resolve({
      status: 'success',
      providers: {
        openai: { models: {"gpt-4o-mini": {capabilities: ["text"]}}, pricing: {}, hasApiKey: true, capabilities: {text:true, batch:true} },
        anthropic: { models: {"claude-3-haiku-20240307":{capabilities: ["text"]}}, pricing: {}, hasApiKey: false, capabilities: {text:true, batch:true} },
        mockProvider: { models: {"mock-model":{capabilities: ["text"]}}, pricing: {}, hasApiKey: true, capabilities: {text:true, batch:false} }
      }
    });
  });
};


// --- 评估 API (示例, 需要后端实现) ---
// export const evaluateData = async (params) => {
//   return requestHandler('evaluateData', httpApi.evaluateData, params);
// };
// export const startAsyncEvaluation = async (params) => {
//   return requestHandler('startEvaluationTask', httpApi.startAsyncEvaluation, params);
// };
// export const getEvaluationTaskStatus = async (taskId) => {
//   return requestHandler('getEvaluationTaskStatus', httpApi.getEvaluationTaskStatus, { taskId });
// };

// --- LlamaFactory API (示例, 需要后端实现) ---
// export const llamaFactoryRun = async (params) => {
//   return requestHandler('llamaFactoryRun', httpApi.llamaFactoryRun, params);
// };
// export const startAsyncLlamaFactory = async (params) => {
//   return requestHandler('startLlamaFactoryTask', httpApi.startAsyncLlamaFactory, params);
// };
// export const getLlamaFactoryTaskStatus = async (taskId) => {
//   return requestHandler('getLlamaFactoryTaskStatus', httpApi.getLlamaFactoryTaskStatus, { taskId });
// };

// --- 质量评估 API (示例, 需要后端实现) ---
// export const qualityAssessmentAssess = async (params) => {
//   return requestHandler('qualityAssessmentAssess', httpApi.qualityAssessmentAssess, params);
// };
// export const startAsyncQualityAssessment = async (params) => {
//   return requestHandler('startQualityAssessmentTask', httpApi.startAsyncQualityAssessment, params);
// };
// export const getQualityAssessmentTaskStatus = async (taskId) => {
//   return requestHandler('getQualityAssessmentTaskStatus', httpApi.getQualityAssessmentTaskStatus, { taskId });
// };


// --- Electron 特有功能 ---
export const openFile = async (options) => {
  if (isElectron) {
    // 参数名转换可能也适用于 options
    return window.electronAPI.openFile(convertToSnakeCase(options));
  } else {
    throw new Error('File dialog is only available in desktop app');
  }
};

export const saveFile = async (content, defaultPath) => {
  if (isElectron) {
    // defaultPath 通常是字符串，不需要转换
    return window.electronAPI.saveFile(content, defaultPath);
  } else {
    // Web环境下的文件保存替代方案
    const blob = new Blob([typeof content === 'string' ? content : JSON.stringify(content)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultPath ? defaultPath.split(/[/\\]/).pop() : 'export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { saved: true, path: a.download };
  }
};

// 确保所有通过 window.electronAPI 调用的方法名
// (如 filterData, startDataFilteringTask, getDataFilteringTaskStatus 等)
// 都在 preload.js 中正确暴露，并对应到 main/ipc-handlers.js 中的处理器，
// 这些处理器再调用后端的相应 API。
