// src/renderer.d.ts
import { ExecutionMode } from './contexts/SettingsContext'; // Import ExecutionMode type

export interface IElectronAPI {
  // Define all methods exposed by preload.js here
  // For example:
  filterData: (params: any) => Promise<any>;
  asyncFilterData: (params: any) => Promise<any>;
  getFilteringTaskResult: (params: { taskId: string }) => Promise<any>;
  generateData: (params: any) => Promise<any>;
  asyncGenerateData: (params: any) => Promise<any>;
  getGenerationTaskResult: (params: { taskId: string }) => Promise<any>;
  invokeLlm: (params: any) => Promise<any>;
  invokeLlmWithImages: (params: any) => Promise<any>;
  createLlmBatchTask: (params: any) => Promise<any>;
  getLlmTaskStatus: (params: { taskId: string }) => Promise<any>;
  fetchLLMProviders: () => Promise<any>;
  // ... other methods from preload.js

  // Method to set execution mode in apiAdapter via preload (if we choose this route)
  setApiExecutionMode?: (mode: ExecutionMode) => void; 
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
    // For the function exposed directly by apiAdapter.js
    setApiExecutionModeGlobally?: (mode: ExecutionMode) => void;
  }
}

// This ensures the file is treated as a module.
export {};