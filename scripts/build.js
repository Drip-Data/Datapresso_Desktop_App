const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 项目根目录
const ROOT_DIR = path.resolve(__dirname, '..');
const ELECTRON_DIR = path.join(ROOT_DIR, 'electron-app');
const BACKEND_DIR = path.join(ROOT_DIR, 'python-backend');

// 颜色输出辅助函数
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function logStep(message) {
  console.log(`${colors.green}[BUILD] ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}[WARNING] ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}[ERROR] ${message}${colors.reset}`);
}

try {
  // 第1步：构建前端
  logStep('Building frontend...');
  process.chdir(path.join(ELECTRON_DIR, 'renderer'));
  execSync('npm run build', { stdio: 'inherit' });
  
  // 第2步：打包Python后端
  logStep('Packaging Python backend...');
  process.chdir(BACKEND_DIR);
  execSync('python -m pip install pyinstaller', { stdio: 'inherit' });
  execSync('pyinstaller --onedir --name datapresso_backend main.py', { stdio: 'inherit' });
  
  // 第3步：构建Electron应用
  logStep('Building Electron app...');
  process.chdir(ELECTRON_DIR);
  execSync('npm run build', { stdio: 'inherit' });
  
  // 第4步：将Python后端复制到Electron资源目录
  logStep('Copying Python backend to Electron resources...');
  const electronDistDir = path.join(ELECTRON_DIR, 'dist');
  const backendDistDir = path.join(BACKEND_DIR, 'dist', 'datapresso_backend');
  const resourcesDir = path.join(electronDistDir, 'win-unpacked', 'resources', 'backend');
  
  // 确保目录存在
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
  }
  
  // 复制后端文件
  execSync(`xcopy "${backendDistDir}" "${resourcesDir}" /E /I /Y`, { stdio: 'inherit' });
  
  logStep('Build completed successfully!');
} catch (error) {
  logError(`Build failed: ${error.message}`);
  process.exit(1);
}
