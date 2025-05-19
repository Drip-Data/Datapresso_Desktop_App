import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppRouter from './routing';
import { utils } from './utils/electronBridge';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './styles/global.css';
import { useAppStore } from './store/appStore';

function App() {
  const { themeMode, initSettings } = useAppStore();
  const navigate = useNavigate();

  // 初始化应用设置
  useEffect(() => {
    initSettings();
  }, [initSettings]);

  // 监听菜单事件
  useEffect(() => {
    if (!utils.isElectron) return;
    
    // 处理菜单点击事件
    const handleModuleOpen = (event, module) => {
      navigate(`/${module}`);
    };
    
    // 添加事件监听
    window.addEventListener('menu:open-module', handleModuleOpen);
    
    // 清理函数
    return () => {
      window.removeEventListener('menu:open-module', handleModuleOpen);
    };
  }, [navigate]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: themeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
      }}
    >
      <AppRouter />
    </ConfigProvider>
  );
}

export default App;
