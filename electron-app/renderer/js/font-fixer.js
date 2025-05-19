/**
 * 字体加载修复工具
 */
(function() {
  function checkAndFixFonts() {
    // 检查Remix图标字体
    const fontLink = document.querySelector('link[href*="remixicon"]');
    if (!fontLink) {
      console.error('未找到Remix图标字体链接');
      return;
    }

    // 尝试使用替代字体CDN
    const alternativeCdn = 'https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css';
    
    console.log('尝试加载替代字体:', alternativeCdn);
    const newLink = document.createElement('link');
    newLink.rel = 'stylesheet';
    newLink.href = alternativeCdn;
    
    // 添加事件监听器检查加载状态
    newLink.onload = () => console.log('替代字体加载成功');
    newLink.onerror = () => console.error('替代字体加载失败');
    
    document.head.appendChild(newLink);
  }

  // 页面加载完成后执行
  if (document.readyState === 'complete') {
    checkAndFixFonts();
  } else {
    window.addEventListener('load', checkAndFixFonts);
  }
})();
