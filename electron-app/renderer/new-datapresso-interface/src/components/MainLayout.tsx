import React, { useState } from 'react'; // Restored useState for potential future use, useLocation for titles
import { Outlet, useLocation } from 'react-router-dom';
import WorkflowSidebar from '@/components/WorkflowSidebar';
import WorkflowTopbar from '@/components/WorkflowTopbar'; // Restored WorkflowTopbar

// Define page titles, can be moved to a constants file or derived differently
const PAGE_TITLES: { [key: string]: string } = {
  '/': '流程管理',
  '/workflow': '流程管理', // Alias for root
  '/data': '数据管理',
  '/data-quality': '数据质量评估',
  '/training': '模型训练',
  '/execution': '执行控制',
  '/settings': '系统设置',
  '/api-keys': 'API密钥管理',
  '/help': '帮助中心',
  '/llm-playground': 'LLM 实验场', // Added title for LLM Playground
  '/module-test': '模块测试', // Added title for Module Test
  '/end-to-end-test': '端到端测试', // Added title for End-to-End Test
};

const MainLayout: React.FC = () => {
  const location = useLocation();
  // const [sidebarPageKey, setSidebarPageKey] = useState('workflow'); // This might not be needed if sidebar handles its own active state

  // Determine page title based on current route
  const getPageTitle = (pathname: string): string => {
    if (PAGE_TITLES[pathname]) {
      return PAGE_TITLES[pathname];
    }
    const baseRoute = '/' + pathname.split('/')[1];
    return PAGE_TITLES[baseRoute] || 'Datapresso'; // Fallback title
  };

  const currentPageTitle = getPageTitle(location.pathname);

  return (
    // Using bg-bg-main-html as it was the original light theme background for the main area
    // This color is defined in tailwind.config.ts as #F9FAFB
    <div className="flex min-h-screen bg-bg-main-html"> 
      <WorkflowSidebar />
      <div className="flex flex-col flex-1 overflow-x-hidden">
        <WorkflowTopbar pageTitle={currentPageTitle} />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {/* The Outlet will render the specific page component based on the route */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;