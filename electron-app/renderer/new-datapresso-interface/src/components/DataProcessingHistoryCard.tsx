import React from 'react';
import { ListChecks } from 'lucide-react'; // Icon for the card title

interface HistoryItem {
  id: string;
  action: string;
  date: string;
  status: '完成' | '进行中' | '失败';
  statusType: 'success' | 'info' | 'danger';
}

// Mock data for history, replace with actual data later
const mockHistoryData: HistoryItem[] = [
  { id: '1', action: '基础数据清洗', date: '2024-05-10', status: '完成', statusType: 'success' },
  { id: '2', action: '去重处理', date: '2024-05-09', status: '完成', statusType: 'success' },
  { id: '3', action: '格式转换 (JSONL)', date: '2024-05-08', status: '完成', statusType: 'success' },
  { id: '4', action: '评估模型API调用', date: '2024-05-11', status: '失败', statusType: 'danger' },
];

interface DataProcessingHistoryCardProps {
  historyItems?: HistoryItem[]; // Optional prop, defaults to mock data
}

const DataProcessingHistoryCard: React.FC<DataProcessingHistoryCardProps> = ({
  historyItems = mockHistoryData,
}) => {
  const getStatusTagClass = (statusType: HistoryItem['statusType']) => {
    switch (statusType) {
      case 'success': return 'bg-success-html/10 text-green-700';
      case 'info': return 'bg-info-html/10 text-blue-700';
      case 'danger': return 'bg-danger-html/10 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-bg-card-html rounded-xl shadow-sm-html">
      <div className="px-6 py-5 border-b border-black/5 flex items-center">
        <ListChecks size={20} className="mr-3 text-primary-dark" />
        <h3 className="text-lg font-semibold text-text-primary-html">数据处理历史</h3>
      </div>
      <div className="p-6 space-y-3">
        {historyItems.length > 0 ? (
          historyItems.map((item) => (
            // Original: .data-item style="padding: 0.75rem; border-radius: 8px;"
            // Simplified here, can be enhanced if needed
            <div 
              key={item.id} 
              className="flex justify-between items-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="text-sm text-text-primary-html font-medium">{item.action}</div>
              <div className="text-xs text-text-secondary-html">{item.date}</div>
              <div>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusTagClass(item.statusType)}`}>
                  {item.status}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-text-secondary-html text-center py-4">暂无处理历史。</p>
        )}
      </div>
    </div>
  );
};

export default DataProcessingHistoryCard;