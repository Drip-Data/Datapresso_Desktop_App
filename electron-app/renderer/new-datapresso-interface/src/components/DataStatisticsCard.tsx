import React from 'react';
import DataDistributionChart from './DataDistributionChart'; // Assuming same directory or correct path
import { PieChart } from 'lucide-react'; // Icon for the card title

interface StatItemProps {
  value: string | number;
  label: string;
}

const StatItem: React.FC<StatItemProps> = ({ value, label }) => (
  <div className="bg-slate-50 p-4 rounded-lg text-center flex-grow min-w-[120px] shadow-sm">
    {/* Original: stat-card-sm .stat-value { font-size: 1.5rem; } .stat-card-sm .stat-label { font-size: 0.8rem; } */}
    <div className="text-2xl font-bold text-primary-dark mb-1">{value}</div>
    <div className="text-xs text-text-secondary-html font-medium">{label}</div>
  </div>
);

interface DataStatisticsCardProps {
  totalRecords: number;
  totalSize: string;
  fileCount: number;
  distributionData: {
    labels: string[];
    values: number[];
  };
}

const DataStatisticsCard: React.FC<DataStatisticsCardProps> = ({
  totalRecords,
  totalSize,
  fileCount,
  distributionData,
}) => {
  return (
    <div className="bg-bg-card-html rounded-xl shadow-sm-html">
      <div className="px-6 py-5 border-b border-black/5 flex items-center">
        <PieChart size={20} className="mr-3 text-primary-dark" />
        <h3 className="text-lg font-semibold text-text-primary-html">数据统计</h3>
      </div>
      <div className="p-6">
        {/* Original: stats-container */}
        <div className="flex flex-wrap gap-4 justify-around mb-6">
          <StatItem value={totalRecords.toLocaleString()} label="总记录数" />
          <StatItem value={totalSize} label="总数据大小" />
          <StatItem value={fileCount} label="数据文件" />
        </div>
        <div className="mt-6 h-[250px] md:h-[300px]"> {/* Ensure chart container has a defined height */}
          <DataDistributionChart data={distributionData} />
        </div>
      </div>
    </div>
  );
};

export default DataStatisticsCard;