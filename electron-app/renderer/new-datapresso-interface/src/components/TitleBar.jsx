import React, { useEffect } from 'react';
import './TitleBar.css';

// 窗口控制按钮组件
const TitleBar = () => {
  useEffect(() => {
    // 检查electronAPI是否正确暴露
    console.log('TitleBar mounted, electronAPI available:', !!window.electronAPI);
    
    // 诊断窗口控制功能
    if (window.electronAPI?.diagnoseWindowControls) {
      window.electronAPI.diagnoseWindowControls()
        .then(result => console.log('Window controls diagnosis:', result))
        .catch(err => console.error('Diagnosis failed:', err));
    }
  }, []);

  const handleMinimize = () => {
    if (window.electronAPI) window.electronAPI.minimizeWindow();
  };

  const handleMaximize = () => {
    if (window.electronAPI) window.electronAPI.toggleMaximizeWindow();
  };

  const handleClose = () => {
    if (window.electronAPI) window.electronAPI.closeWindow();
  };

  return (
    <div className="title-bar">
      <div className="title">DataPresso</div>
      <div className="window-controls">
        <button className="window-control-button minimize" onClick={handleMinimize}>
          <span className="minimize-icon">_</span>
        </button>
        <button className="window-control-button maximize" onClick={handleMaximize}>
          <span className="maximize-icon">□</span>
        </button>
        <button className="window-control-button close" onClick={handleClose}>
          <span className="close-icon">×</span>
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
