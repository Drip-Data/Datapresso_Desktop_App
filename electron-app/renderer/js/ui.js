// ...existing code...

// 窗口控制按钮事件绑定
function initWindowControls() {
  // 窗口最小化
  const minimizeButton = document.getElementById('minimize-button');
  if (minimizeButton) {
    minimizeButton.addEventListener('click', () => {
      window.electronAPI.minimizeWindow();
    });
  }

  // 窗口最大化/还原
  const maximizeButton = document.getElementById('maximize-button');
  if (maximizeButton) {
    maximizeButton.addEventListener('click', () => {
      window.electronAPI.toggleMaximizeWindow();
      // 切换最大化图标
      const icon = maximizeButton.querySelector('i');
      window.electronAPI.isWindowMaximized().then(isMaximized => {
        if (isMaximized) {
          icon.classList.remove('ri-fullscreen-line');
          icon.classList.add('ri-fullscreen-exit-line');
        } else {
          icon.classList.remove('ri-fullscreen-exit-line');
          icon.classList.add('ri-fullscreen-line');
        }
      });
    });
  }

  // 窗口关闭
  const closeButton = document.getElementById('close-button');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      window.electronAPI.closeWindow();
    });
  }
}

// 在文档加载完成后初始化UI
document.addEventListener('DOMContentLoaded', () => {
  // ...existing code...
  
  // 初始化窗口控制按钮
  initWindowControls();
});

// ...existing code...