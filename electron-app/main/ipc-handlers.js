const { ipcMain, dialog, BrowserWindow, shell } = require('electron'); // Added shell
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// 后端 API 地址
const API_BASE_URL = 'http://127.0.0.1:8000';
const logger = console; // Using console for basic logging in main process IPC

// --- Helper function to create handlers for a module ---
function createModuleHandlers(moduleName, handlersConfig) {
  console.log(`Registering IPC handlers for ${moduleName}...`);
  for (const { channel, method, pathParams = [] } of handlersConfig) {
    const fullChannel = `api:${moduleName}/${channel}`;
    ipcMain.handle(fullChannel, async (event, payload) => {
      try {
        let url = `${API_BASE_URL}/${moduleName}/${channel}`;
        let requestData = payload;

        if (pathParams.length > 0) {
          // If payload is not an object, it's assumed to be the path parameter itself (e.g., taskId)
          // This is a common pattern for GET by ID.
          if (typeof payload !== 'object' || payload === null) {
             if (pathParams.length === 1) { // Simple case: one path param
                url = `${API_BASE_URL}/${moduleName}/${channel}/${payload}`;
                requestData = undefined; // No body for GET with path param
             } else {
                console.error(`IPC Error for ${fullChannel}: Payload for path params is not an object as expected.`);
                return { status: 'error', message: 'Invalid payload for path parameters.'};
             }
          } else { // Payload is an object, extract path params
            const pathValues = pathParams.map(param => {
              const val = payload[param];
              delete payload[param]; // Remove from body/query params
              return val;
            });
            url = `${API_BASE_URL}/${moduleName}/${channel}/${pathValues.join('/')}`;
            requestData = Object.keys(payload).length > 0 ? payload : undefined;
          }
        }
        
        console.log(`IPC: Handling ${fullChannel} with method ${method.toUpperCase()}`);
        let response;
        if (method.toUpperCase() === 'GET') {
          response = await axios.get(url, { params: requestData });
        } else if (method.toUpperCase() === 'POST') {
          // Special handling for FormData for invoke_with_images
          if (fullChannel === 'api:llm_api/invoke_with_images' && payload instanceof FormData) {
             response = await axios.post(url, payload, { headers: payload.getHeaders() });
          } else {
             response = await axios.post(url, requestData);
          }
        } else {
          throw new Error(`Unsupported HTTP method: ${method}`);
        }
        return response.data;
      } catch (error) {
        const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || 'Unknown error';
        console.error(`Error in IPC ${fullChannel}:`, errorMessage, error.response?.data);
        return { status: 'error', message: errorMessage, error_code: error.response?.data?.error_code };
      }
    });
  }
  console.log(`IPC handlers for ${moduleName} registered.`);
}

// --- Module-specific handler registration functions ---

function registerLlmApiHandlers() {
  createModuleHandlers('llm_api', [
    { channel: 'invoke', method: 'POST' },
    { channel: 'invoke_with_images', method: 'POST' }, // FormData handled in createModuleHandlers
    { channel: 'embeddings', method: 'POST' },
    { channel: 'batch', method: 'POST' }, // For creating batch tasks
    { channel: 'models', method: 'GET' },
    { channel: 'providers', method: 'GET' },
    // Note: invoke_async was previously mapped to /batch. createLlmBatchTask in preload uses 'api:llm_api/batch'.
  ]);

  // Add specific handler for test_connection
  ipcMain.handle('api:llm_api/providers/test_connection', async (event, providerName) => {
    try {
      const url = `${API_BASE_URL}/llm_api/providers/${providerName}/test`;
      console.log(`IPC: Handling api:llm_api/providers/test_connection for ${providerName} with POST to ${url}`);
      const response = await axios.post(url, {}); // Send empty body as per backend
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || 'Unknown error';
      console.error(`Error in IPC api:llm_api/providers/test_connection for ${providerName}:`, errorMessage, error.response?.data);
      return { status: 'error', message: errorMessage, error_code: error.response?.data?.error_code };
    }
  });

  // Generic task handlers are separate
  createModuleHandlers('tasks', [
      { channel: 'get', method: 'GET', pathParams: ['taskId'] }, // Corresponds to /tasks/{taskId}
      { channel: 'list', method: 'GET' }
  ]);
}

function registerDataFilteringHandlers() {
  createModuleHandlers('data_filtering', [
    { channel: 'filter', method: 'POST' },
    { channel: 'async_filter', method: 'POST' },
    { channel: 'task', method: 'GET', pathParams: ['taskId'] }
  ]);
}

function registerDataGenerationHandlers() {
  createModuleHandlers('data_generation', [
    { channel: 'generate', method: 'POST' },
    { channel: 'async_generate', method: 'POST' },
    { channel: 'task', method: 'GET', pathParams: ['taskId'] }
  ]);
}

function registerEvaluationHandlers() {
  createModuleHandlers('evaluation', [
    { channel: 'evaluate', method: 'POST' },
    { channel: 'async_evaluate', method: 'POST' },
    { channel: 'task', method: 'GET', pathParams: ['taskId'] }
  ]);
}

function registerQualityAssessmentHandlers() {
  createModuleHandlers('quality_assessment', [
    { channel: 'assess', method: 'POST' },
    { channel: 'async_assess', method: 'POST' },
    { channel: 'task', method: 'GET', pathParams: ['taskId'] }
  ]);
}

function registerLlamaFactoryHandlers() {
  const moduleName = 'llamafactory';
  // Most LlamaFactory operations go through a single /run POST endpoint
  const commonLlamaFactoryHandler = async (operationNameFromHandler, paramsForBackend) => {
    try {
      // If operationNameFromHandler is provided, it's a specific action.
      // If not (e.g., for the generic /run endpoint), operation should be in paramsForBackend.
      const operation = operationNameFromHandler || paramsForBackend.operation;
      if (!operation) {
        throw new Error("LlamaFactory operation name is missing.");
      }
      
      // Construct the data to send to the backend /run endpoint
      // It always expects an 'operation' field and other params.
      const dataToSend = { ...paramsForBackend, operation };
      
      console.log(`IPC: Handling ${moduleName}/${operation} via /run with data:`, dataToSend);
      const response = await axios.post(`${API_BASE_URL}/${moduleName}/run`, dataToSend);
      return response.data;
    } catch (error) {
      const operationForError = operationNameFromHandler || paramsForBackend?.operation || "unknown_operation";
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message;
      console.error(`Error in IPC ${moduleName}/${operationForError}:`, errorMessage, error.response?.data);
      return { status: 'error', message: errorMessage };
    }
  };

  // Handler for the generic api:llamafactory/run channel
  // Expects payload to contain { operation: 'actual_op_name', ...other_params }
  ipcMain.handle(`api:${moduleName}/run`, (event, payload) => commonLlamaFactoryHandler(null, payload));
  
  // Specific action handlers, passing the operation name explicitly
  ipcMain.handle(`api:${moduleName}/create_config`, (event, payload) => commonLlamaFactoryHandler('save_config', payload));
  ipcMain.handle(`api:${moduleName}/start_task`, (event, payload) => commonLlamaFactoryHandler('run_task', payload));
  // For stop_task, get_task_status, get_task_logs, list_tasks, the 'payload' from preload.js might be just the task_id or simple params.
  // The commonLlamaFactoryHandler expects 'paramsForBackend' to be an object.
  // We need to ensure the payload structure matches or adapt here.
  // Assuming payload is an object like { taskId: "..." } or { limit: 10 }
  ipcMain.handle(`api:${moduleName}/stop_task`, (event, payload) => commonLlamaFactoryHandler('stop_task', payload)); // payload should be {taskId: "..."}
  ipcMain.handle(`api:${moduleName}/get_task_status`, (event, payload) => commonLlamaFactoryHandler('get_task_status', payload)); // payload should be {taskId: "..."}
  ipcMain.handle(`api:${moduleName}/get_task_logs`, (event, payload) => commonLlamaFactoryHandler('get_task_logs', payload)); // payload should be {taskId: "...", n: ...}
  ipcMain.handle(`api:${moduleName}/list_tasks`, (event, payload) => commonLlamaFactoryHandler('list_tasks', payload)); // payload can be {limit, status} or undefined
  ipcMain.handle(`api:${moduleName}/model_templates`, (event) => commonLlamaFactoryHandler('get_model_templates', {}));
  ipcMain.handle(`api:${moduleName}/available_datasets`, (event) => commonLlamaFactoryHandler('get_available_datasets', {}));
  
  ipcMain.handle(`api:${moduleName}/example`, async (event, examplePath) => {
    try {
      console.log(`IPC: Handling ${moduleName}/example for path: ${examplePath}`);
      const response = await axios.get(`${API_BASE_URL}/${moduleName}/examples/${examplePath}`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message;
      console.error(`Error in IPC ${moduleName}/example/${examplePath}:`, errorMessage);
      return { status: 'error', message: errorMessage };
    }
  });
  console.log(`IPC handlers for ${moduleName} registered.`);
}

function registerSeedDataHandlers() {
  const moduleName = 'seed_data';
  console.log(`Registering IPC handlers for ${moduleName}...`);

  ipcMain.handle(`api:${moduleName}/upload`, async (event, { fileBuffer, fileName, dataType }) => {
    try {
      const formData = new FormData();
      // Reconstruct file from buffer. FormData expects a Blob or Node.js Buffer.
      // Using Buffer.from(fileBuffer) directly is for Node.js environment.
      formData.append('file', Buffer.from(fileBuffer), fileName);
      if (dataType) {
        formData.append('data_type', dataType);
      }

      console.log(`IPC: Handling ${moduleName}/upload for file: ${fileName}`);
      // axios automatically sets Content-Type for FormData when passing it directly
      const response = await axios.post(`${API_BASE_URL}/${moduleName}/upload`, formData, {
        headers: formData.getHeaders() // Important for FormData to set boundary
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || 'Unknown error';
      console.error(`Error in IPC ${moduleName}/upload:`, errorMessage, error.response?.data);
      return { status: 'error', message: errorMessage, error_code: error.response?.data?.error_code };
    }
  });

  ipcMain.handle(`api:${moduleName}/list`, async (event, params) => {
    try {
      const queryParams = new URLSearchParams(params).toString();
      console.log(`IPC: Handling ${moduleName}/list with params: ${queryParams}`);
      const response = await axios.get(`${API_BASE_URL}/${moduleName}?${queryParams}`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || 'Unknown error';
      console.error(`Error in IPC ${moduleName}/list:`, errorMessage, error.response?.data);
      return { status: 'error', message: errorMessage, error_code: error.response?.data?.error_code };
    }
  });

  console.log(`IPC handlers for ${moduleName} registered.`);
}

let windowControlsRegistered = false;
function registerWindowControlHandlers() {
  if (windowControlsRegistered) {
    console.log('Window control IPC handlers already attempted registration.');
    return;
  }
  console.log('Registering window control IPC handlers...');
  
  const handlers = {
    'window:minimize': () => BrowserWindow.getFocusedWindow()?.minimize(),
    'window:maximize': () => { // This specific handler might not be used if toggle is preferred
        const win = BrowserWindow.getFocusedWindow();
        if (win && !win.isMaximized()) win.maximize();
    },
    'window:toggle-maximize': () => {
      const win = BrowserWindow.getFocusedWindow();
      if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
    },
    'window:is-maximized': () => BrowserWindow.getFocusedWindow()?.isMaximized() || false,
    'window:close': () => BrowserWindow.getFocusedWindow()?.close()
  };

  for (const channel in handlers) {
    // ipcMain.removeHandler(channel); // Removing this to see if it resolves double registration error source
    ipcMain.handle(channel, handlers[channel]);
  }
  windowControlsRegistered = true;
  console.log('Window control IPC handlers registration attempt complete.');
}

// --- File and App System Handlers (can be grouped or kept separate) ---
function registerUtilityHandlers() {
    console.log('Registering utility IPC handlers...');
    ipcMain.handle('file:open', async (_, options) => {
        try {
            const { canceled, filePaths } = await dialog.showOpenDialog(options);
            if (canceled || filePaths.length === 0) return { canceled: true };
            const filePath = filePaths[0];
            const content = fs.readFileSync(filePath, 'utf8');
            return { canceled: false, filePath, content };
        } catch (error) {
            console.error('Error opening file:', error);
            return { canceled: true, error: error.message };
        }
    });

    ipcMain.handle('file:save', async (_, content, defaultPath) => {
        try {
            const { canceled, filePath } = await dialog.showSaveDialog({
                defaultPath,
                filters: [ { name: 'JSON', extensions: ['json'] }, { name: 'All Files', extensions: ['*'] } ]
            });
            if (canceled) return { canceled: true };
            fs.writeFileSync(filePath, content);
            return { canceled: false, filePath };
        } catch (error) {
            console.error('Error saving file:', error);
            return { canceled: true, error: error.message };
        }
    });

    ipcMain.handle('app:version', () => {
        try {
            // Assuming this file is in electron-app/main, and package.json is in electron-app/
            return require('../package.json').version;
        } catch (error) {
            console.error('Error getting app version:', error);
            return 'N/A';
        }
    });

    ipcMain.handle('openDirectoryDialog', async (event, options) => {
        try {
            return await dialog.showOpenDialog({ properties: ['openDirectory'], ...options });
        } catch (error) {
            console.error('Error opening directory dialog:', error);
            return { canceled: true, error: error.message };
        }
    });

    ipcMain.handle('openFileDialog', async (event, options) => {
        try {
            return await dialog.showOpenDialog({ properties: ['openFile'], ...options });
        } catch (error) {
            console.error('Error opening file dialog:', error);
            return { canceled: true, error: error.message };
        }
    });

    ipcMain.handle('openDirectory', async (event, dirPath) => { // Renamed 'path' to 'dirPath'
        try {
            await shell.openPath(dirPath); // Use shell module
            return { success: true };
        } catch (error) {
            console.error('Error opening directory:', error);
            return { success: false, error: error.message };
        }
    });
    console.log('Utility IPC handlers registered.');
}


// --- Main Registration Function ---
function registerIpcHandlers() {
  console.log('Attempting to register all IPC handlers...');
  registerLlmApiHandlers();
  registerDataFilteringHandlers();
  registerDataGenerationHandlers();
  registerEvaluationHandlers();
  registerQualityAssessmentHandlers();
  registerLlamaFactoryHandlers();
  registerSeedDataHandlers(); // Added call for seed data handlers
  registerWindowControlHandlers();
  registerUtilityHandlers(); // Added call for utility handlers
  console.log('All IPC handlers registration process initiated.');
}

module.exports = {
  registerIpcHandlers
};
