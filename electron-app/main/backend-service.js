const { spawn } = require('child_process');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');
const logger = require('./logger');

// Python后端进程引用
let pythonProcess = null;
let isBackendRunning = false;
const API_PORT = 8000;

/**
 * 启动Python后端服务
 */
async function startBackendService() {
  logger.info('正在启动Python后端服务...');
  
  try {
    // 确定Python脚本路径
    const isDev = process.env.NODE_ENV === 'development';
    let scriptPath;
    
    if (isDev) {
      // 开发环境路径
      scriptPath = path.join(
        path.dirname(path.dirname(__dirname)),
        'Datapresso_Desktop_App', // 添加这一层目录
        'python-backend',
        'main.py'
      );
    } else {
      // 生产环境路径（打包后）
      scriptPath = path.join(
        process.resourcesPath,
        'python-backend',
        'main.py'
      );
    }
    
    logger.info(`Python脚本路径: ${scriptPath}`);
    
    // 检查脚本是否存在
    if (!fs.existsSync(scriptPath)) {
      const error = `Python脚本不存在: ${scriptPath}`;
      logger.error(error);
      throw new Error(error);
    }
    
    // 启动Python进程
    pythonProcess = spawn('python', [scriptPath]);
    
    // 处理标准输出
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      logger.info(`Python后端输出: ${output.trim()}`);
      
      // 检测服务是否启动完成
      if (output.includes('Application startup complete')) {
        isBackendRunning = true;
        logger.info('Python后端服务启动成功');
      }
    });
    
    // 处理标准错误
    pythonProcess.stderr.on('data', (data) => {
      logger.error(`Python后端错误: ${data.toString().trim()}`);
    });
    
    // 处理进程关闭
    pythonProcess.on('close', (code) => {
      logger.info(`Python后端进程已退出，代码: ${code}`);
      pythonProcess = null;
      isBackendRunning = false;
    });
    
    // 等待服务启动（最多30秒）
    await waitForBackendReady(30000);
    
    return true;
  } catch (error) {
    logger.error(`启动Python后端服务失败: ${error.message}`);
    throw error;
  }
}

/**
 * 等待后端服务就绪
 * @param {number} timeout 超时时间（毫秒）
 */
function waitForBackendReady(timeout) {
  return new Promise((resolve, reject) => {
    // 如果服务已经在运行，直接返回
    if (isBackendRunning) {
      resolve(true);
      return;
    }
    
    // 设置超时
    const timeoutId = setTimeout(() => {
      reject(new Error('等待后端服务就绪超时'));
    }, timeout);
    
    // 定期检查服务是否就绪
    const checkInterval = setInterval(() => {
      if (isBackendRunning) {
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
        resolve(true);
      }
    }, 500);
    
    // 如果进程异常退出，取消等待
    if (pythonProcess) {
      pythonProcess.on('error', (err) => {
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
        reject(err);
      });
    }
  });
}

/**
 * 停止Python后端服务
 */
function stopBackendService() {
  if (pythonProcess) {
    logger.info('正在停止Python后端服务...');
    
    // Windows系统需要特殊处理
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', pythonProcess.pid, '/f', '/t']);
    } else {
      pythonProcess.kill();
    }
    
    pythonProcess = null;
    isBackendRunning = false;
  }
}

/**
 * 检查后端服务状态
 * @returns {boolean} 是否正在运行
 */
function isBackendServiceRunning() {
  return isBackendRunning;
}

module.exports = {
  startBackendService,
  stopBackendService,
  isBackendServiceRunning
};
