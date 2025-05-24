/**
 * Electron 桥接层
 * 提供统一接口处理 Web 浏览器环境和 Electron 环境
 */

// 检测是否在 Electron 环境中运行
const isElectron = window.electronAPI !== undefined;

// API 函数映射
export const api = {
  // 数据过滤API
  filterData: async (params) => {
    if (isElectron) {
      return window.electronAPI.filterData(params);
    } else {
      // 浏览器环境中使用普通的fetch API
      const response = await fetch('/api/data_filtering/filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return response.json();
    }
  },
  
  asyncFilterData: async (params) => {
    if (isElectron) {
      return window.electronAPI.asyncFilterData(params);
    } else {
      const response = await fetch('/api/data_filtering/async_filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return response.json();
    }
  },

  getFilterTaskResult: async (taskId) => {
    if (isElectron) {
      return window.electronAPI.getFilterTaskResult(taskId);
    } else {
      const response = await fetch(`/api/data_filtering/task/${taskId}`);
      return response.json();
    }
  },
  
  // 数据生成API
  generateData: async (params) => {
    if (isElectron) {
      return window.electronAPI.generateData(params);
    } else {
      const response = await fetch('/api/data_generation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return response.json();
    }
  },
  
  asyncGenerateData: async (params) => {
    if (isElectron) {
      return window.electronAPI.asyncGenerateData(params);
    } else {
      const response = await fetch('/api/data_generation/async_generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return response.json();
    }
  },

  getGenerateTaskResult: async (taskId) => {
    if (isElectron) {
      return window.electronAPI.getGenerateTaskResult(taskId);
    } else {
      const response = await fetch(`/api/data_generation/task/${taskId}`);
      return response.json();
    }
  },
  
  // 评估API
  evaluateData: async (params) => {
    if (isElectron) {
      return window.electronAPI.evaluateData(params);
    } else {
      const response = await fetch('/api/evaluation/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return response.json();
    }
  },
  
  // LLM API
  fetchLLMProviders: async () => { // Renamed from getLlmProviders to match preload
    if (isElectron) {
      return window.electronAPI.fetchLLMProviders();
    } else {
      // Web environment fallback
      const response = await fetch('/api/llm_api/providers');
      return response.json();
    }
  },

  invokeLlm: async (params) => {
    if (isElectron) {
      return window.electronAPI.invokeLlm(params);
    } else {
      const response = await fetch('/api/llm_api/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return response.json();
    }
  },
  
  // 质量评估API
  assessQuality: async (params) => {
    if (isElectron) {
      return window.electronAPI.assessQuality(params);
    } else {
      const response = await fetch('/api/quality_assessment/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return response.json();
    }
  },
  
  // 文件操作
  openFile: async (options) => {
    if (isElectron) {
      return window.electronAPI.openFile(options);
    } else {
      // Web环境中使用文件选择器
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        
        if (options?.filters) {
          // 转换过滤器为accept属性
          const accept = options.filters
            .flatMap(filter => filter.extensions.map(ext => `.${ext}`))
            .join(',');
          input.accept = accept;
        }
        
        input.onchange = (event) => {
          const file = event.target.files[0];
          if (!file) {
            resolve({ canceled: true });
            return;
          }
          
          const reader = new FileReader();
          reader.onload = (readerEvent) => {
            resolve({
              canceled: false,
              filePath: file.name,
              content: readerEvent.target.result
            });
          };
          reader.readAsText(file);
        };
        
        input.click();
      });
    }
  },
  
  saveFile: async (content, defaultPath) => {
    if (isElectron) {
      return window.electronAPI.saveFile(content, defaultPath);
    } else {
      // Web环境中使用下载
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultPath ? path.basename(defaultPath) : 'datapresso-export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return {
        canceled: false,
        filePath: a.download
      };
    }
  },
  
  // 应用信息
  getAppVersion: async () => {
    if (isElectron) {
      return window.electronAPI.getAppVersion();
    } else {
      // Web环境中返回预设版本或从环境变量获取
      return process.env.REACT_APP_VERSION || '1.0.0';
    }
  },
  
  // 窗口控制
  minimizeWindow: () => {
    if (isElectron) {
      return window.electronAPI.minimizeWindow();
    } else {
      console.warn('Window minimize is only available in desktop app');
    }
  },
  
  maximizeWindow: () => {
    if (isElectron) {
      return window.electronAPI.maximizeWindow();
    } else {
      console.warn('Window maximize is only available in desktop app');
    }
  },
  
  closeWindow: () => {
    if (isElectron) {
      return window.electronAPI.closeWindow();
    } else {
      console.warn('Window close is only available in desktop app');
    }
  },
  
  // 事件监听
  onProgressUpdate: (callback) => {
    if (isElectron) {
      return window.electronAPI.onProgressUpdate(callback);
    } else {
      // Web环境中无法实现相同功能，返回空函数
      return () => {};
    }
  },
  
  onBackendStatus: (callback) => {
    if (isElectron) {
      return window.electronAPI.onBackendStatus(callback);
    } else {
      // Web环境中无法实现相同功能，返回空函数
      return () => {};
    }
  }
};

// 导出一些有用的工具函数
export const utils = {
  isElectron,
  
  // 根据环境获取适当的路径分隔符
  getPathSeparator: () => {
    return isElectron ? (window.navigator.platform.includes('Win') ? '\\' : '/') : '/';
  },
  
  // 基本的路径操作
  path: {
    basename: (path) => {
      if (!path) return '';
      return path.split(/[\\/]/).pop();
    },
    
    dirname: (path) => {
      if (!path) return '';
      const lastSlashIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
      return lastSlashIndex >= 0 ? path.substring(0, lastSlashIndex) : path;
    },
    
    join: (...parts) => {
      const separator = utils.getPathSeparator();
      return parts.filter(Boolean).join(separator);
    },
    
    extname: (path) => {
      if (!path) return '';
      const basename = utils.path.basename(path);
      const dotIndex = basename.lastIndexOf('.');
      return dotIndex >= 0 ? basename.substring(dotIndex) : '';
    }
  }
};

export default { api, utils };
