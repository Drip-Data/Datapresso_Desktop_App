// ...existing code...

/**
 * 确保窗口控制按钮正确渲染
 * 这个函数会检查和修复窗口控制按钮的样式
 */
function ensureWindowControlsRendered() {
  const buttons = document.querySelectorAll('.window-control-button');
  if (!buttons.length) return;
  
  buttons.forEach(btn => {
    // 确保按钮是可见的
    if (window.getComputedStyle(btn).display === 'none') {
      btn.style.display = 'flex';
    }
  });
}

// 在DOMContentLoaded和window.onload时都尝试确保渲染
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(ensureWindowControlsRendered, 100);
});

window.addEventListener('load', () => {
  setTimeout(ensureWindowControlsRendered, 100);
});

// ...existing code...