const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制API
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:toggle-maximize'),
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // LLM API
  invokeLlm: (params) => ipcRenderer.invoke('api:llm_api/invoke', params), // Added for standard LLM calls
  invokeLlmWithImages: (params) => ipcRenderer.invoke('api:llm_api/invoke_with_images', params),
  getLlmEmbeddings: (params) => ipcRenderer.invoke('api:llm_api/embeddings', params),
  createLlmBatchTask: (params) => ipcRenderer.invoke('api:llm_api/batch', params),
  getLlmTaskStatus: (taskId) => ipcRenderer.invoke('api:tasks/get', taskId),
  listLlmTasks: (params) => ipcRenderer.invoke('api:tasks/list', params),
  getLlmModels: (params) => ipcRenderer.invoke('api:llm_api/models', params),
  // fetchLLMProviders is defined below
  // LLM Providers API
  fetchLLMProviders: () => ipcRenderer.invoke('api:llm_api/providers'),
  testLlmProviderConnection: (providerName) => ipcRenderer.invoke('api:llm_api/providers/test_connection', providerName),
  fetchProviderModels: (providerName) => ipcRenderer.invoke('api:llm_api/providers/models', providerName),
  updateLlmProviderConfig: (providerName, configData) => ipcRenderer.invoke('api:llm_api/providers/update_config', { providerName, configData }),

  // Seed Data API
  uploadSeedData: (fileBuffer, fileName, dataType) => ipcRenderer.invoke('api:seed_data/upload', { fileBuffer, fileName, dataType }),
  listSeedData: (params) => ipcRenderer.invoke('api:seed_data/list', params),

  // Evaluation API
  evaluateData: (params) => ipcRenderer.invoke('api:evaluation/evaluate', params),
  asyncEvaluateData: (params) => ipcRenderer.invoke('api:evaluation/async_evaluate', params),
  getEvaluationTaskResult: (taskId) => ipcRenderer.invoke('api:evaluation/task', taskId),

  // Data Filtering API
  filterData: (params) => ipcRenderer.invoke('api:data_filtering/filter', params),
  asyncFilterData: (params) => ipcRenderer.invoke('api:data_filtering/async_filter', params),
  getFilteringTaskResult: (taskId) => ipcRenderer.invoke('api:data_filtering/task', taskId),

  // Data Generation API
  generateData: (params) => ipcRenderer.invoke('api:data_generation/generate', params),
  asyncGenerateData: (params) => ipcRenderer.invoke('api:data_generation/async_generate', params),
  getGenerationTaskResult: (taskId) => ipcRenderer.invoke('api:data_generation/task', taskId),

  // Quality Assessment API
  assessQuality: (params) => ipcRenderer.invoke('api:quality_assessment/assess', params),
  asyncAssessQuality: (params) => ipcRenderer.invoke('api:quality_assessment/async_assess', params),
  getAssessmentTaskResult: (taskId) => ipcRenderer.invoke('api:quality_assessment/task', taskId),

  // LlamaFactory API
  // For operations going through the single /run endpoint
  llamafactoryRun: (operationPayload) => ipcRenderer.invoke('api:llamafactory/run', operationPayload),
  // Specific handlers if they are routed differently or for clarity, though /run is the main one
  llamafactoryCreateConfig: (params) => ipcRenderer.invoke('api:llamafactory/create_config', params),
  llamafactoryStartTask: (params) => ipcRenderer.invoke('api:llamafactory/start_task', params),
  llamafactoryStopTask: (params) => ipcRenderer.invoke('api:llamafactory/stop_task', params),
  llamafactoryGetTaskStatus: (params) => ipcRenderer.invoke('api:llamafactory/get_task_status', params),
  llamafactoryGetTaskLogs: (params) => ipcRenderer.invoke('api:llamafactory/get_task_logs', params),
  llamafactoryListTasks: (params) => ipcRenderer.invoke('api:llamafactory/list_tasks', params),
  llamafactoryModelTemplates: () => ipcRenderer.invoke('api:llamafactory/model_templates'),
  llamafactoryAvailableDatasets: () => ipcRenderer.invoke('api:llamafactory/available_datasets'),
  getLlamaFactoryExampleConfig: (examplePath) => ipcRenderer.invoke('api:llamafactory/example', examplePath), // For /examples/{example_path}
  
  // 诊断功能
  diagnoseWindowControls: () => {
    ipcRenderer.send('diagnose-window-controls');
    return new Promise(resolve => {
      ipcRenderer.once('diagnose-window-controls-result', (_, result) => {
        resolve(result);
      });
    });
  }
});

console.log('Preload script loaded, window control APIs exposed');
