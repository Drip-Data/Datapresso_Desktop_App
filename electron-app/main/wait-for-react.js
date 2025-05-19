const { spawn } = require('child_process');
const waitOn = require('wait-on');
const electron = require('electron');
const path = require('path');

// 等待React开发服务器启动
console.log('等待React开发服务器启动...');
waitOn({
  resources: ['http://localhost:3000'],
  timeout: 30000 // 30秒超时
})
.then(() => {
  console.log('React开发服务器已启动，启动Electron应用...');
  
  // 启动Electron
  const electronPath = electron;
  const appPath = path.join(__dirname, '../..');
  
  const electronProcess = spawn(electronPath, [appPath], {
    stdio: 'inherit'
  });
  
  electronProcess.on('close', (code) => {
    console.log(`Electron进程已退出，代码: ${code}`);
    process.exit(code);
  });
})
.catch((err) => {
  console.error('等待React开发服务器超时:', err);
  process.exit(1);
});
