import { HashRouter, BrowserRouter, Routes, Route } from 'react-router-dom';

// 在Electron中使用HashRouter避免路径问题
const isElectron = window.electronAPI !== undefined;
const Router = isElectron ? HashRouter : BrowserRouter;

export function AppRouter() {
  return (
    <Router>
      <Routes>
        {/* 您的路由配置 */}
        <Route path="/" element={<HomePage />} />
        <Route path="/data-filtering" element={<DataFilteringPage />} />
        {/* ...其他路由 */}
      </Routes>
    </Router>
  );
}
