const { app, Menu, shell, dialog } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

function createMenu(mainWindow) {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建项目',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu:new-project');
          }
        },
        {
          label: '打开...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu:open-file');
          }
        },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu:save-file');
          }
        },
        {
          label: '另存为...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow.webContents.send('menu:save-file-as');
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'delete', label: '删除' },
        { type: 'separator' },
        { role: 'selectAll', label: '全选' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        ...(isDev ? [{ role: 'toggleDevTools', label: '开发者工具' }] : []),
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '切换全屏' }
      ]
    },
    {
      label: '工具',
      submenu: [
        {
          label: '数据过滤',
          click: () => {
            mainWindow.webContents.send('menu:open-module', 'data-filtering');
          }
        },
        {
          label: '数据生成',
          click: () => {
            mainWindow.webContents.send('menu:open-module', 'data-generation');
          }
        },
        {
          label: '数据评估',
          click: () => {
            mainWindow.webContents.send('menu:open-module', 'evaluation');
          }
        },
        {
          label: 'LLM工具',
          click: () => {
            mainWindow.webContents.send('menu:open-module', 'llm-api');
          }
        },
        {
          label: '质量评估',
          click: () => {
            mainWindow.webContents.send('menu:open-module', 'quality-assessment');
          }
        }
      ]
    },
    {
      label: '帮助',
      role: 'help',
      submenu: [
        {
          label: '文档',
          click: async () => {
            await shell.openExternal('https://github.com/yourusername/datapresso/wiki');
          }
        },
        {
          label: '报告问题',
          click: async () => {
            await shell.openExternal('https://github.com/yourusername/datapresso/issues');
          }
        },
        { type: 'separator' },
        {
          label: '关于',
          click: () => {
            const { version } = require('../package.json');
            dialog.showMessageBox(mainWindow, {
              title: '关于 Datapresso',
              message: `Datapresso Desktop\n版本 ${version}`,
              detail: '© 2023-2024 Datapresso 团队\n数据处理与生成的智能工具',
              buttons: ['确定'],
              icon: path.join(__dirname, '../assets/icons/icon.png')
            });
          }
        }
      ]
    }
  ];

  return Menu.buildFromTemplate(template);
}

module.exports = { createMenu };
