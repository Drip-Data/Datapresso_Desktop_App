import React, { useState } from 'react'; // Added useState
import { Link, useLocation } from 'react-router-dom';
import { Zap, Database, Filter, Brain, Settings, KeyRound, HelpCircle, ChevronLeft, ChevronRight, MessageSquare, TestTube, PlayCircle } from 'lucide-react'; // Added TestTube and PlayCircle icons
import { Button } from '@/components/ui/button'; // Added Button import

// Original SVG Logo component, adjusted size for collapsed state via className
const DatapressoLogo = ({ isCollapsed }: { isCollapsed: boolean }) => (
  <svg
    viewBox="0 0 80 100"
    fill="none"
    className={`transition-all duration-300 ${isCollapsed ? 'w-8 h-8' : 'w-9 h-9 mr-2'}`} // Adjusted sizes and margin
  >
    <defs>
      <linearGradient id="logo-gradient-main" x1="40" y1="0" x2="40" y2="80" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6941FF" />
        <stop offset="1" stopColor="#89FFE6" />
      </linearGradient>
      <linearGradient id="logo-gradient-accent" x1="40" y1="20" x2="40" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6941FF" />
        <stop offset="1" stopColor="#89FFE6" />
      </linearGradient>
    </defs>
    <circle cx="40" cy="40" r="40" fill="url(#logo-gradient-main)" />
    <path d="M40 100C28.149 88.149 0 86.5672 0 60C0 33.4328 28.149 31.851 40 20C51.851 31.851 80 33.4328 80 60L80 60C80 86.5672 51.851 88.149 40 100Z" fill="url(#logo-gradient-accent)" />
  </svg>
);

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  to: string;
  currentPath: string;
  isCollapsed: boolean; // Added isCollapsed prop
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, to, currentPath, isCollapsed }) => {
  const isActive = currentPath === to || (to === '/workflow' && currentPath === '/');

  return (
    <Link
      to={to}
      title={isCollapsed ? label : undefined}
      className={`flex items-center py-2.5 mb-0.5 rounded-lg cursor-pointer transition-colors duration-200
                  text-gray-700 hover:bg-gray-100 hover:text-primary-html
                  ${isActive ? 'bg-primary-html/10 text-primary-html font-medium' : 'font-normal'}
                  ${isCollapsed ? 'px-3 justify-center' : 'px-4'}`} // Adjusted padding for collapsed state
    >
      <Icon className={`w-5 h-5 opacity-90 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} /> {/* Ensure icon doesn't shrink, keep margin for expanded */}
      <span
        className={`text-sm transition-all duration-200 ease-in-out origin-left ${
          isCollapsed
            ? 'opacity-0 scale-90 pointer-events-none w-0 overflow-hidden whitespace-nowrap'
            : 'opacity-100 scale-100 pointer-events-auto delay-100' // Added delay, ensure no ml-3 if icon has mr-3
        }`}
      >
        {label}
      </span>
    </Link>
  );
};

const WorkflowSidebar: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [isCollapsed, setIsCollapsed] = useState(false); // Added state for collapsing

  // Adjusted H1 class for "Datapresso" text for light theme and collapse
  const logoH1Class = `text-xl font-bold text-gray-800 transition-all duration-300 ease-in-out origin-left ${isCollapsed ? 'opacity-0 scale-90 pointer-events-none w-0 ml-0' : 'opacity-100 scale-100 ml-2 delay-100'}`;

  return (
    <div
      className={`relative sticky top-0 h-screen flex flex-col bg-white border-r border-gray-200 shadow-sm transition-all duration-300 ease-in-out rounded-3xl
                  ${isCollapsed ? 'w-20 px-2 py-4' : 'w-64 px-4 py-6'}`} // Changed to rounded-3xl for all corners with larger radius
    >
      {/* Collapse Toggle Button - Positioned on the right edge, vertically centered */}
      <Button
        variant="outline"
        size="icon" // This will be effectively overridden by w- and h- classes
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute top-1/2 -translate-y-1/2 bg-white hover:bg-gray-50 border shadow-md z-10
                    flex items-center justify-center
                    w-4 h-10 rounded-md px-0 right-[-8px]`} // Further Adjusted: w-4 (1rem), h-10, no horizontal padding, right-[-8px]
        aria-label={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
      >
        {/* Adjusted icon size slightly for new button dimensions */}
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </Button>

      <div className={`flex items-center mb-8 transition-all duration-300 ${isCollapsed ? 'justify-center h-10' : 'h-10'}`}>
        <DatapressoLogo isCollapsed={isCollapsed} /> {/* Pass isCollapsed to SVG for dynamic sizing if needed */}
        <h1 className={logoH1Class}>Datapresso</h1>
      </div>

      <nav className="flex-grow overflow-y-auto">
        <div
          className={`uppercase text-xs font-semibold text-gray-500 mb-2 px-1 tracking-wider transition-all duration-200 ease-in-out origin-left ${
            isCollapsed ? 'opacity-0 scale-90 pointer-events-none h-0 py-0 my-0 leading-none' : 'opacity-100 scale-100 delay-100'
          }`}
        >
          核心功能
        </div>
        <NavItem icon={Database} label="数据管理" to="/data" currentPath={currentPath} isCollapsed={isCollapsed} />
        <NavItem icon={Zap} label="流程管理" to="/workflow" currentPath={currentPath} isCollapsed={isCollapsed} />
        <NavItem icon={Filter} label="高级筛选" to="/data-quality" currentPath={currentPath} isCollapsed={isCollapsed} />
        <NavItem icon={Brain} label="模型训练" to="/training" currentPath={currentPath} isCollapsed={isCollapsed} />
        <NavItem icon={MessageSquare} label="LLM 实验场" to="/llm-playground" currentPath={currentPath} isCollapsed={isCollapsed} />
        
        <div
          className={`uppercase text-xs font-semibold text-gray-500 mt-6 mb-2 px-1 tracking-wider transition-all duration-200 ease-in-out origin-left ${
            isCollapsed ? 'opacity-0 scale-90 pointer-events-none h-0 py-0 my-0 leading-none' : 'opacity-100 scale-100 delay-100 mt-6' // ensure mt-6 is applied when expanded
          }`}
        >
          测试工具
        </div>
        <NavItem icon={TestTube} label="模块测试" to="/module-test" currentPath={currentPath} isCollapsed={isCollapsed} />
        <NavItem icon={PlayCircle} label="端到端测试" to="/end-to-end-test" currentPath={currentPath} isCollapsed={isCollapsed} />
        
        <div
          className={`uppercase text-xs font-semibold text-gray-500 mt-6 mb-2 px-1 tracking-wider transition-all duration-200 ease-in-out origin-left ${
            isCollapsed ? 'opacity-0 scale-90 pointer-events-none h-0 py-0 my-0 leading-none' : 'opacity-100 scale-100 delay-100 mt-6' // ensure mt-6 is applied when expanded
          }`}
        >
          系统
        </div>
        <NavItem icon={Settings} label="系统设置" to="/settings" currentPath={currentPath} isCollapsed={isCollapsed} />
        <NavItem icon={KeyRound} label="API密钥管理" to="/api-keys" currentPath={currentPath} isCollapsed={isCollapsed} />
        <NavItem icon={HelpCircle} label="帮助中心" to="/help" currentPath={currentPath} isCollapsed={isCollapsed} />
      </nav>
      
      {/* Collapse Toggle Button's original position (now moved to be absolutely positioned) */}
      {/*
      <div className={`mt-auto pt-4 ${isCollapsed ? '' : 'border-t border-gray-200'}`}>
        <Button
          variant="ghost"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 py-3"
          aria-label={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>
      */}
    </div>
  );
};

export default WorkflowSidebar;