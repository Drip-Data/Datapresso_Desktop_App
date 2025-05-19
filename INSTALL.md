# Datapresso 桌面应用安装指南

## 环境要求

- Node.js 16+
- Python 3.8+
- npm 8+

## 初次安装

### 自动安装 (推荐)

使用初始化脚本自动安装所有依赖：

```bash
npm run init
```

这个命令会：
- 安装Node.js依赖
- 初始化前端项目
- 创建Python后端结构
- 安装Python依赖

### 手动安装

如果自动安装过程中遇到问题，可以按以下步骤手动安装：

1. **安装Node.js依赖**

   ```bash
   npm install
   ```

2. **安装前端依赖**

   ```bash
   cd electron-app/renderer/new-datapresso-interface
   npm install
   cd ../../../
   ```

3. **安装Python依赖**

   ```bash
   cd python-backend
   pip install -r requirements.txt --no-cache-dir
   cd ../
   ```

   如果遇到编码问题，可以尝试：
   
   ```bash
   # Windows上指定编码
   set PYTHONIOENCODING=utf-8
   pip install -r requirements.txt --no-cache-dir
   
   # 或者手动安装主要依赖
   pip install fastapi uvicorn pydantic python-dotenv numpy pandas
   ```

## 启动应用

```bash
npm run start
```

## 常见问题

### 依赖安装失败

如果 `requirements.txt` 安装失败，通常是编码问题，可以：

1. 确保文件以UTF-8编码保存
2. 手动安装主要依赖
3. 使用 `--no-cache-dir` 选项尝试重新安装

### 应用启动失败

1. 检查端口8000是否被占用
2. 确保已安装所有必需的依赖
3. 查看日志文件获取详细错误信息
