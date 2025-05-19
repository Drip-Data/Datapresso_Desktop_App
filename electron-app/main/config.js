const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

// 配置文件路径
const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');

// 默认配置
const DEFAULT_CONFIG = {
  window: {
    width: 1280,
    height: 800
  },
  theme: 'light',
  language: 'zh-CN',
  recentProjects: [],
  paths: {
    data: path.join(app.getPath('userData'), 'data'),
    exports: path.join(app.getPath('userData'), 'exports'),
    cache: path.join(app.getPath('userData'), 'cache')
  },
  llm: {
    provider: 'openai',
    model: 'gpt-3.5-turbo'
  },
  backend: {
    port: 8000,
    logLevel: 'info'
  },
  features: {
    autoSave: true,
    checkUpdates: true
  }
};

// 加载配置
function getConfig() {
  try {
    // 确保用户目录存在
    ensureDirectoriesExist();
    
    // 如果配置文件不存在，创建默认配置
    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
      return DEFAULT_CONFIG;
    }
    
    // 读取配置文件
    const configStr = fs.readFileSync(CONFIG_FILE, 'utf8');
    const config = JSON.parse(configStr);
    
    // 合并默认配置，确保所有字段都存在
    return deepMerge(DEFAULT_CONFIG, config);
  } catch (error) {
    log.error(`加载配置文件失败: ${error.message}`);
    return DEFAULT_CONFIG;
  }
}

// 更新配置
function updateConfig(newConfig) {
  try {
    const currentConfig = getConfig();
    const updatedConfig = deepMerge(currentConfig, newConfig);
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updatedConfig, null, 2));
    return true;
  } catch (error) {
    log.error(`更新配置文件失败: ${error.message}`);
    return false;
  }
}

// 确保必要的目录存在
function ensureDirectoriesExist() {
  const dirs = [
    app.getPath('userData'),
    path.join(app.getPath('userData'), 'data'),
    path.join(app.getPath('userData'), 'exports'),
    path.join(app.getPath('userData'), 'cache'),
    path.join(app.getPath('userData'), 'logs')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
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

// 添加最近项目
function addRecentProject(projectPath, projectName) {
  const config = getConfig();
  const recentProjects = config.recentProjects || [];
  
  // 移除已存在的相同项目
  const updatedProjects = recentProjects.filter(p => p.path !== projectPath);
  
  // 添加到头部
  updatedProjects.unshift({
    path: projectPath,
    name: projectName || path.basename(projectPath),
    lastOpened: new Date().toISOString()
  });
  
  // 限制为最近10个项目
  if (updatedProjects.length > 10) {
    updatedProjects.pop();
  }
  
  updateConfig({ recentProjects: updatedProjects });
}

module.exports = {
  getConfig,
  updateConfig,
  addRecentProject
};
