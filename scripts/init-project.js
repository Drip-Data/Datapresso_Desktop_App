const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 获取项目根目录
const rootDir = path.resolve(__dirname, '..');

// 日志函数
function log(message) {
  console.log(`[初始化] ${message}`);
}

// 错误日志函数
function error(message) {
  console.error(`[错误] ${message}`);
}

// 执行命令并打印输出
function runCommand(command, cwd = rootDir) {
  try {
    log(`执行命令: ${command}`);
    const output = execSync(command, { cwd, stdio: 'inherit' });
    return true;
  } catch (err) {
    error(`命令执行失败: ${err.message}`);
    return false;
  }
}

// 创建目录（如果不存在）
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    log(`创建目录: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 写入文件并指定编码
function writeFileWithEncoding(filePath, content, encoding = 'utf8') {
  try {
    fs.writeFileSync(filePath, content, { encoding });
    return true;
  } catch (err) {
    error(`写入文件 ${filePath} 失败: ${err.message}`);
    return false;
  }
}

// 主初始化函数
async function initProject() {
  log('开始初始化Datapresso Desktop项目...');
  
  // 1. 安装主项目依赖
  log('安装主项目依赖...');
  if (!runCommand('npm install')) {
    error('主项目依赖安装失败');
    process.exit(1);
  }
  
  // 2. 设置前端项目
  const reactDir = path.join(rootDir, 'electron-app', 'renderer', 'new-datapresso-interface');
  ensureDir(reactDir);
  
  if (!fs.existsSync(path.join(reactDir, 'package.json'))) {
    log('创建前端React项目...');
    if (!runCommand('npx create-next-app . --typescript --tailwind --eslint', reactDir)) {
      error('前端项目创建失败');
      process.exit(1);
    }
  } else {
    log('安装前端依赖...');
    if (!runCommand('npm install', reactDir)) {
      error('前端依赖安装失败');
      process.exit(1);
    }
  }
  
  // 3. 设置Python后端
  const pythonDir = path.join(rootDir, 'python-backend');
  ensureDir(pythonDir);
  
  // 确保main.py文件存在
  const mainPyPath = path.join(pythonDir, 'main.py');
  if (!fs.existsSync(mainPyPath)) {
    log('创建Python后端主文件...');
    const mainPyContent = `
# Python后端主入口文件
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Datapresso API")

# 允许跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Datapresso Backend API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    print("Starting Datapresso Backend API...")
    uvicorn.run(app, host="127.0.0.1", port=8000)
    print("Application startup complete")
`;
    writeFileWithEncoding(mainPyPath, mainPyContent, 'utf8');
  }
  
  // 创建Python依赖文件
  const requirementsPath = path.join(pythonDir, 'requirements.txt');
  log('创建Python依赖文件...');
  const requirementsContent = `# Datapresso Python 依赖
# 基础依赖
fastapi==0.95.1
uvicorn==0.22.0
pydantic==1.10.7
python-dotenv==1.0.0

# 数据处理库
numpy==1.24.3
pandas==2.0.1
scikit-learn==1.2.2
matplotlib==3.7.1

# HTTP和API库
httpx==0.24.0
requests==2.30.0
aiohttp==3.8.4
aiofiles==23.1.0

# 数据库
sqlalchemy==2.0.12
aiosqlite==0.19.0

# 工具库
PyYAML==6.0
python-multipart==0.0.6
tiktoken==0.4.0
faker==18.9.0

# LLM API客户端
openai==1.1.1
anthropic==0.5.0
google-generativeai==0.3.1
`;
  
  // 确保文件以UTF-8编码写入
  if (writeFileWithEncoding(requirementsPath, requirementsContent, 'utf8')) {
    // 安装Python依赖
    log('安装Python依赖...');
    // 使用带有明确编码的命令
    if (!runCommand('pip install -r requirements.txt', pythonDir)) {
      error('Python依赖安装失败，请手动安装');
      log('您可以尝试手动运行: pip install -r requirements.txt --no-cache-dir');
    }
  }
  
  // 4. 创建必要的目录结构
  const dirsToCreate = [
    path.join(pythonDir, 'services'),
    path.join(pythonDir, 'models'),
    path.join(pythonDir, 'routers'),
    path.join(pythonDir, 'core'),
    path.join(pythonDir, 'db'),
    path.join(pythonDir, 'utils'),
    path.join(pythonDir, 'data')
  ];
  
  dirsToCreate.forEach(dir => ensureDir(dir));
  
  log('项目初始化完成！');
  log('现在可以运行 npm run start 启动应用');
}

// 执行初始化
initProject().catch(err => {
  error(`初始化过程出错: ${err.message}`);
  process.exit(1);
});
