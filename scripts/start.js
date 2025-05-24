const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const electron = require('electron');

// 获取项目根目录
const rootDir = path.resolve(__dirname, '..');

// 设置环境变量
process.env.NODE_ENV = 'development';

// 设置日志级别
process.env.LOG_LEVEL = 'debug';

// 日志函数
function log(message) {
  console.log(message);
}

function error(message) {
  console.error(message);
}

// 启动Python后端
log('启动Python FastAPI后端服务器...');
const pythonDir = path.join(rootDir, 'python-backend');
const pythonExecutable = path.join('D:\\Software\\Anaconda\\envs\\datapresso_env', 'python.exe');
const pythonProcess = spawn(pythonExecutable, ['-m', 'uvicorn', 'main:app', '--reload', '--host', '127.0.0.1', '--port', '8000'], {
  cwd: pythonDir,
  shell: true,
  stdio: 'inherit'
});

pythonProcess.on('error', (err) => {
  error(`启动Python后端服务器失败: ${err.message}`);
  process.exit(1);
});

// 启动React前端
log('启动React开发服务器...');
const reactDir = path.join(rootDir, 'electron-app', 'renderer', 'new-datapresso-interface');
const reactProcess = spawn('npm', ['run', 'dev'], {
  cwd: reactDir,
  shell: true,
  stdio: 'inherit'
});

reactProcess.on('error', (err) => {
  error(`启动React开发服务器失败: ${err.message}`);
  process.exit(1);
});

// 等待后端和前端服务器启动
log('等待Python后端和React开发服务器启动...');

// 检查React开发服务器是否启动的函数
function checkServerStarted() {
  return new Promise((resolve) => {
    // 等待5秒，确保React开发服务器有足够时间启动
    setTimeout(() => resolve(), 5000);
  });
}

// 启动Electron应用
async function startElectron() {
  try {
    await checkServerStarted();
    log('启动Electron应用...');
    
    // 设置环境变量
    const env = { ...process.env, NODE_ENV: 'development' };
    
    // 启动Electron应用
    const electronPath = electron;
    const electronProcess = spawn(electronPath, [path.join(rootDir, 'electron-app/main/main.js')], {
      env,
      stdio: 'inherit'
    });
    
    electronProcess.on('error', (err) => {
      error(`启动Electron应用失败: ${err.message}`);
      process.exit(1);
    });
    
    electronProcess.on('close', (code) => {
      log(`Electron应用已退出，代码: ${code}`);
      // 退出Python后端和React开发服务器
      pythonProcess.kill();
      reactProcess.kill();
      process.exit(code);
    });
  } catch (err) {
    error(`启动Electron应用失败: ${err.message}`);
    process.exit(1);
  }
}

// 启动Electron应用
startElectron();

// 处理退出信号
process.on('SIGINT', () => {
  log('收到退出信号，正在关闭所有进程...');
  if (typeof electronProcess !== 'undefined') electronProcess.kill();
  if (typeof pythonProcess !== 'undefined') pythonProcess.kill();
  if (typeof reactProcess !== 'undefined') reactProcess.kill();
  process.exit();
});
