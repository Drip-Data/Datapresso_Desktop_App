import React from 'react';
import { NavLink } from 'react-router-dom';
import { Zap, Database, Brain, KeyRound, Settings, HelpCircle, BarChart3, Filter } from 'lucide-react'; // Added more icons

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { to: '/workflow', label: '流程管理', icon: Zap },
  { to: '/data', label: '数据管理', icon: Database },
  { to: '/data-quality', label: '数据质量', icon: BarChart3 }, // Assuming a route and icon
  { to: '/training', label: '模型训练', icon: Brain },
  { to: '/api-keys', label: 'API密钥管理', icon: KeyRound },
  // { to: '/settings', label: '系统设置', icon: Settings }, // Settings might be elsewhere or part of user menu
  // { to: '/help', label: '帮助中心', icon: HelpCircle }, // Help might be elsewhere
];

const MainContentNavbar: React.FC = () => {
  return (
    <nav className="bg-white px-6 py-3 border-b border-gray-200">
      <ul className="flex items-center space-x-2">
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-primary-html/10 text-primary-html' // Light purple background, purple text
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                }`
              }
            >
              <item.icon size={16} className="mr-2" />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default MainContentNavbar;