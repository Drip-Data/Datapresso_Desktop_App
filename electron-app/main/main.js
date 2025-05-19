const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { registerIpcHandlers } = require('./ipc-handlers'); // Import IPC handlers
const isDev = process.env.NODE_ENV === 'development';

// 窗口引用
let mainWindow;
let splashWindow;

// 创建启动页面窗口
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false // 内容准备好再显示
  });

  // 加载启动页面
  const splashPath = path.join(__dirname, '../renderer/splash.html');
  splashWindow.loadFile(splashPath);

  // 窗口准备好时显示
  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });

  // 防止启动页面被关闭
  splashWindow.on('close', (e) => {
    if (mainWindow && !mainWindow.isDestroyed() && !app.isQuitting) {
      e.preventDefault();
      splashWindow.hide();
    }
  });
}

// 创建主窗口
function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false, // 使用无框架模式
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#ffffff',
    show: false, // 等待内容加载完成后显示
  });

  // 窗口准备好时显示，避免白屏闪烁
  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      // 添加短暂延迟确保平滑过渡
      setTimeout(() => {
        mainWindow.show();
        splashWindow.destroy();
      }, 800);
    } else {
      mainWindow.show();
    }
  });

  // 加载前端页面
  if (isDev) {
    try {
      // 修复: 加载React开发服务器地址
      mainWindow.loadURL('http://localhost:5173/');
      console.log('Loading React dev server at http://localhost:5173/');
      
      // 开发模式下打开开发者工具
      mainWindow.webContents.openDevTools();
    } catch (err) {
      console.error('Error loading React dev server:', err);
      // 如果无法连接到开发服务器，尝试加载本地文件
      const fallbackPath = path.join(__dirname, '../renderer/new-datapresso-interface/dist/index.html');
      mainWindow.loadFile(fallbackPath);
      console.log('Fallback to:', fallbackPath);
    }
  } else {
    // 生产模式下加载打包后的React应用
    const prodPath = path.join(__dirname, '../renderer/new-datapresso-interface/dist/index.html');
    mainWindow.loadFile(prodPath);
    console.log('Production mode loading:', prodPath);
  }

  // 添加：注入窗口控制样式和脚本
  mainWindow.webContents.on('did-finish-load', () => {
    // 注入标题栏样式
    mainWindow.webContents.insertCSS(`
      /* 全局滚动条样式 */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      
      ::-webkit-scrollbar-track {
        background: transparent;
        margin: 3px;
        margin-top: 39px; /* 增加顶部边距，确保在标题栏下方 */
        border-radius: 4px;
      }
      
      ::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        transition: background 0.2s ease;
      }
      
      /* 确保内容区域的滚动条正确放置 */
      .main-content::-webkit-scrollbar-track,
      .content-area::-webkit-scrollbar-track,
      .sidebar::-webkit-scrollbar-track {
        margin-top: 3px; /* 内容区域已经有标题栏的偏移，所以这里使用正常边距 */
      }

      /* 其他滚动区域的滚动条 */
      div[style*="overflow: auto"]::-webkit-scrollbar-track, 
      div[style*="overflow-y: auto"]::-webkit-scrollbar-track,
      div[style*="overflow: scroll"]::-webkit-scrollbar-track, 
      div[style*="overflow-y: scroll"]::-webkit-scrollbar-track {
        margin-top: 3px; /* 针对特定区域的滚动条使用正常边距 */
      }
      
      /* 为所有可滚动内容添加右侧内边距 */
      body, .main-content, .content-area, .sidebar, 
      div[style*="overflow: auto"], div[style*="overflow-y: auto"],
      div[style*="overflow: scroll"], div[style*="overflow-y: scroll"] {
        padding-right: 8px;
        box-sizing: border-box;
        scrollbar-width: thin;
        scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
      }
      
      /* 标题栏容器 */
      .window-titlebar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 36px;
        background: #ffffff; /* 纯白色背景 */
        display: flex;
        align-items: center;
        justify-content: space-between;
        -webkit-app-region: drag;
        z-index: 1000; /* 降低z-index使其更融合 */
        padding: 0 12px;
        /* 移除阴影和分割线 */
        border-bottom: none;
      }
      
      /* 窗口标题左侧区域 */
      .window-title-area {
        display: flex;
        align-items: center;
      }
      
      /* 窗口图标 */
      .window-icon {
        width: 18px;
        height: 18px;
        margin-right: 10px;
      }
      
      /* 窗口标题 */
      .window-title {
        font-size: 13px;
        font-weight: 500;
        color: #333333; /* 改为深色文字 */
        font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
        letter-spacing: 0.3px;
      }
      
      /* 窗口控制按钮容器 */
      .window-controls {
        display: flex;
        -webkit-app-region: no-drag;
        margin-right: -8px;
      }
      
      /* 窗口控制按钮 */
      .window-button {
        width: 40px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        -webkit-app-region: no-drag;
        background: transparent;
        border: none;
        outline: none;
        cursor: pointer;
        opacity: 0.7;
        transition: all 0.2s ease;
      }
      
      /* 按钮悬停效果 */
      .window-button:hover {
        opacity: 1;
        background-color: rgba(0, 0, 0, 0.05);
      }
      
      .window-button.close:hover {
        background-color: #e81123;
      }
      
      /* 最小化按钮样式 */
      .window-button.minimize::before {
        content: "";
        width: 11px;
        height: 1px;
        background-color: #333; /* 改为深色 */
        position: relative;
        top: 2px;
      }
      
      /* 最大化按钮样式 */
      .window-button.maximize::before {
        content: "";
        width: 10px;
        height: 10px;
        border: 1px solid #333; /* 改为深色 */
        position: relative;
      }
      
      /* 恢复按钮样式 */
      .window-button.restore {
        position: relative;
      }
      
      .window-button.restore::before {
        content: "";
        width: 8px;
        height: 8px;
        border: 1px solid #333; /* 改为深色 */
        position: absolute;
        top: 10px;
        left: 14px;
      }
      
      .window-button.restore::after {
        content: "";
        width: 8px;
        height: 8px;
        border: 1px solid #333; /* 改为深色 */
        border-bottom: none;
        border-right: none;
        position: absolute;
        top: 13px;
        left: 17px;
        background-color: #ffffff; /* 改为白色背景 */
        z-index: 1;
      }
      
      /* 关闭按钮样式 */
      .window-button.close {
        position: relative;
      }
      
      .window-button.close::before,
      .window-button.close::after {
        content: "";
        width: 12px;
        height: 1px;
        background-color: #333; /* 改为深色 */
        position: absolute;
      }
      
      .window-button.close::before {
        transform: rotate(45deg);
      }
      
      .window-button.close::after {
        transform: rotate(-45deg);
      }
      
      /* 内容边距调整 */
      .main-content {
        margin-top: 36px;
        padding-left: 15px;
        padding-right: 15px;
      }
      
      /* 导航菜单样式 */
      .sidebar {
        position: relative; /* 改为相对定位，成为页面流的一部分 */
        margin-top: 10px; /* 与标题栏保持一定距离 */
        margin-left: 15px; /* 左侧边距 */
        width: 200px; /* 略微调整宽度 */
        border-radius: 8px; /* 添加圆角 */
        background-color: rgba(250, 250, 250, 0.9); /* 半透明背景 */
        backdrop-filter: blur(5px); /* 增加模糊效果 */
        border: 1px solid rgba(0, 0, 0, 0.05); /* 完整边框 */
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05); /* 添加阴影 */
        overflow-y: auto;
        max-height: calc(100vh - 70px); /* 限制最大高度 */
        transition: all 0.3s ease;
        float: left; /* 允许内容在其右侧流动 */
      }
      
      /* 应用内容布局调整 */
      .app-container {
        display: flex;
        flex-direction: column;
      }
      
      /* 主内容区域布局 */
      .main-container {
        display: flex;
        margin-top: 36px; /* 标题栏高度 */
        height: calc(100vh - 36px);
        overflow: hidden;
      }
      
      /* 内容区调整，使其在侧边栏右侧 */
      .content-area {
        flex: 1;
        padding: 15px;
        overflow-y: auto;
      }
      
      /* 导航项样式 */
      .nav-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      
      .nav-item {
        padding: 10px 15px;
        margin: 2px 8px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        transition: background-color 0.2s;
      }
      
      .nav-item:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }
      
      .nav-item.active {
        background-color: rgba(96, 82, 179, 0.1);
        color: #6052b3;
      }
      
      .nav-item i {
        margin-right: 10px;
        font-size: 18px;
      }
    `);
    
    // 注入标题栏HTML和事件处理
    mainWindow.webContents.executeJavaScript(`
      // 创建标题栏元素
      const titlebar = document.createElement('div');
      titlebar.className = 'window-titlebar';
      
      // 创建标题区域
      const titleArea = document.createElement('div');
      titleArea.className = 'window-title-area';
      
      // 添加应用图标
      const icon = document.createElement('img');
      icon.className = 'window-icon';
      icon.src = './assets/images/logo.png';
      icon.onerror = () => {
        icon.style.display = 'none'; // 如果图像加载失败，隐藏图标
      };
      titleArea.appendChild(icon);
      
      // 添加标题
      const title = document.createElement('div');
      title.className = 'window-title';
      title.textContent = 'Datapresso';
      titleArea.appendChild(title);
      
      titlebar.appendChild(titleArea);
      
      // 添加窗口控制按钮
      const controls = document.createElement('div');
      controls.className = 'window-controls';
      
      // 最小化按钮
      const minButton = document.createElement('button');
      minButton.className = 'window-button minimize';
      minButton.title = '最小化';
      minButton.addEventListener('click', () => window.electronAPI.minimizeWindow());
      controls.appendChild(minButton);
      
      // 最大化/恢复按钮
      const maxButton = document.createElement('button');
      maxButton.className = 'window-button maximize';
      maxButton.title = '最大化';
      
      // 检查窗口是否已经最大化并设置正确的样式
      if(window.electronAPI.isWindowMaximized) {
        window.electronAPI.isWindowMaximized().then(isMaximized => {
          if(isMaximized) {
            maxButton.classList.replace('maximize', 'restore');
            maxButton.title = '还原';
          }
        });
      }
      
      // 处理最大化/还原事件
      maxButton.addEventListener('click', () => {
        window.electronAPI.toggleMaximizeWindow().then(() => {
          window.electronAPI.isWindowMaximized().then(isMaximized => {
            if(isMaximized) {
              maxButton.classList.replace('maximize', 'restore');
              maxButton.title = '还原';
            } else {
              maxButton.classList.replace('restore', 'maximize');
              maxButton.title = '最大化';
            }
          });
        });
      });
      controls.appendChild(maxButton);
      
      // 关闭按钮
      const closeButton = document.createElement('button');
      closeButton.className = 'window-button close';
      closeButton.title = '关闭';
      closeButton.addEventListener('click', () => window.electronAPI.closeWindow());
      controls.appendChild(closeButton);
      
      titlebar.appendChild(controls);
      
      // 添加到文档
      document.body.insertBefore(titlebar, document.body.firstChild);
      
      // 为内容添加上边距
      const mainContent = document.querySelector('.main-content') || document.body.children[1];
      if (mainContent) {
        mainContent.classList.add('main-content');
      }
      
      console.log('美化后的自定义窗口控制栏已注入');
    `);
  });

  // 设置CSP
  mainWindow.webContents.on('dom-ready', () => {
    const csp = isDev 
      // 开发环境CSP - 允许React开发服务器资源和eval (开发需要)
      ? "default-src 'self'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173; font-src 'self' https://cdn.jsdelivr.net data: http://localhost:5173; img-src 'self' data: http://localhost:5173; connect-src 'self' http://localhost:5173 ws://localhost:5173"
      // 生产环境CSP - 更严格
      : "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self' data:; img-src 'self' data:";
    
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [csp]
        }
      });
    });
  });

  // Window control IPC handlers are now managed in ipc-handlers.js
  // setupWindowControlHandlers(); // Removed call
}

// Removed setupWindowControlHandlers function as its functionality is now expected to be in ipc-handlers.js

// IPC处理器诊断
ipcMain.on('diagnose-window-controls', (event) => {
  console.log('收到窗口控制诊断请求');
  event.reply('diagnose-window-controls-result', {
    isMaximized: mainWindow.isMaximized(),
    isMinimized: mainWindow.isMinimized(),
    isFullScreen: mainWindow.isFullScreen(),
    bounds: mainWindow.getBounds()
  });
});

// 关闭所有窗口时退出应用（Windows & Linux）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  // Removed registerIpcHandlers() from here, it's called in app.whenReady()
});

// macOS中点击dock图标时重新创建窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 应用准备就绪时创建窗口
app.whenReady().then(() => {
registerIpcHandlers(); // Register all IPC handlers once app is ready
  createSplashWindow();
  createWindow();
});