/**
 * 字体加载修复工具
 */
(function() {
  function checkAndFixFonts() {
    console.log('字体加载修复工具启动...');
    
    // 检查MiSans字体
    const misansFonts = [
      '/font/MiSans-Bold.woff2',     // 修正路径：添加font目录
      '/font/MiSans-Semibold.woff2', // 修正路径：添加font目录
      '/font/MiSans-Medium.woff2',   // 修正路径：添加font目录
      '/font/MiSans-Regular.woff2'   // 修正路径：添加font目录
    ];
    
    // 使用字体加载API确保字体可用
    if ('FontFace' in window) {
      misansFonts.forEach(fontUrl => {
        const fontName = fontUrl.split('/').pop().split('-')[0];
        const fontWeight = fontUrl.includes('Bold') ? 'bold' : 
                          fontUrl.includes('Semibold') ? '600' :
                          fontUrl.includes('Medium') ? '500' : 'normal';
        
        const font = new FontFace(fontName, `url(${fontUrl})`, {
          weight: fontWeight,
          style: 'normal'
        });
        
        font.load().then(() => {
          document.fonts.add(font);
          console.log(`字体加载成功: ${fontUrl}`);
        }).catch(err => {
          console.warn(`字体加载失败: ${fontUrl}`, err);
          
          // 尝试备用路径 - 使用相对路径
          const backupPath = fontUrl.substring(1); // 移除开头的斜杠
          const backupFont = new FontFace(fontName, `url(${backupPath})`, {
            weight: fontWeight,
            style: 'normal'
          });
          
          backupFont.load().then(() => {
            document.fonts.add(backupFont);
            console.log(`备用路径字体加载成功: ${backupPath}`);
          }).catch(backupErr => {
            console.warn(`备用路径字体加载失败: ${backupPath}`, backupErr);
            // 使用系统字体作为后备
            document.body.style.fontFamily = 
              "'Segoe UI', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, sans-serif";
          });
        });
      });
    }
    
    // 添加RemixIcon备用方案
    const remixIconLink = document.querySelector('link[href*="remixicon"]');
    if (!remixIconLink) {
      console.log('添加RemixIcon CDN链接...');
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css';
      document.head.appendChild(link);
    }
  }

  // 页面加载完成后执行
  if (document.readyState === 'complete') {
    checkAndFixFonts();
  } else {
    window.addEventListener('load', checkAndFixFonts);
  }
})();
