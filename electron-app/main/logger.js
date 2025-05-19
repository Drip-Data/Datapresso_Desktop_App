const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const ensureLogDir = () => {
  // 获取日志目录路径
  const logDir = app.isPackaged 
    ? path.join(app.getPath('userData'), 'logs')
    : path.join(__dirname, '../../logs');
  
  // 创建日志目录（如果不存在）
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  return logDir;
};

/**
 * 简单的日志记录器，支持多级别日志
 */
class Logger {
  constructor() {
    this.logLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'info';
    this.logFile = null;
    this.logStream = null;
    this.initialized = false;
  }
  
  initialize() {
    if (this.initialized) return;
    
    const logDir = ensureLogDir();
    const date = new Date().toISOString().split('T')[0];
    this.logFile = path.join(logDir, `datapresso-${date}.log`);
    
    // 创建日志文件写入流
    this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
    this.initialized = true;
    
    // 输出启动信息
    this.info('Logger initialized');
  }
  
  /**
   * 写入日志
   * @param {string} level 日志级别
   * @param {string} message 日志消息
   */
  log(level, message) {
    if (!this.initialized) {
      this.initialize();
    }
    
    const levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    // 检查日志级别是否应该被记录
    if (levels[level] > levels[this.logLevel]) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    
    // 写入到文件
    this.logStream.write(logMessage);
    
    // 开发环境下也输出到控制台
    if (process.env.NODE_ENV === 'development') {
      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](message);
    }
  }
  
  debug(message) {
    this.log('debug', message);
  }
  
  info(message) {
    this.log('info', message);
  }
  
  warn(message) {
    this.log('warn', message);
  }
  
  error(message) {
    this.log('error', message);
  }
}

// 导出单例
module.exports = new Logger();
