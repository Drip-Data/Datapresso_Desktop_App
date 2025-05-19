import React from 'react';
import LLMInteractionPanel from '@/components/LLMInteractionPanel';
import { MessageSquare } from 'lucide-react';

const LLMPlaygroundPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-bg-card-html rounded-xl shadow-sm-html">
        <div className="px-6 py-5 border-b border-black/5 flex items-center">
          <MessageSquare size={22} className="mr-3 text-primary-dark" />
          <h2 className="text-xl font-semibold text-text-primary-html">
            LLM 交互实验场
          </h2>
        </div>
        <div className="p-6">
          <LLMInteractionPanel />
        </div>
      </div>
      <div className="text-center text-sm text-gray-500">
        <p>这是一个用于直接与配置的语言模型进行交互和测试的界面。</p>
        <p>您可以在此尝试不同的提示、模型和参数组合。</p>
      </div>
    </div>
  );
};

export default LLMPlaygroundPage;