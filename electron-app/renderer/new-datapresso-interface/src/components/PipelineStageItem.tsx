import React from 'react';
import { cn } from '@/lib/utils'; // Assuming you have this utility for classnames
import { LucideIcon, Database, GitBranch, ClipboardCheck, Filter } from 'lucide-react'; // Fixed icon name

export interface PipelineStage {
  id: string;
  icon: LucideIcon;
  name: string;
  status: string;
  isEnabled: boolean;
  showLine?: boolean;
}

interface PipelineStageItemProps {
  stageId: string;
  icon: LucideIcon;
  name: string;
  status: string; // e.g., "已配置", "待配置", "已禁用"
  isActive?: boolean; // For highlighting the currently selected/configured stage
  isCompleted?: boolean; // For stages that are successfully run
  isEnabled?: boolean; // For the toggle switch state
  showLine?: boolean; // To show/hide the connecting line for the first item
  onStageClick?: (stageId: string) => void;
  onToggle?: (stageId:string, isEnabled: boolean) => void;
}

const PipelineStageItem: React.FC<PipelineStageItemProps> = ({
  stageId,
  icon: Icon,
  name,
  status,
  isActive = false,
  isCompleted = false,
  isEnabled = true,
  showLine = true,
  onStageClick,
  onToggle,
}) => {
  const handleStageClick = () => {
    if (onStageClick && isEnabled) {
      onStageClick(stageId);
    }
  };

  const handleToggleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onToggle) {
      onToggle(stageId, event.target.checked);
    }
  };

  const stageIconClasses = cn(
    "w-20 h-20 rounded-[24px] bg-white shadow-sm-html flex justify-center items-center mx-auto mb-5 text-2xl relative z-[2] transition-all duration-300 ease-in-out", // Using shadow-sm-html, rounded-3xl is 24px
    {
      // Original active: background: var(--gradient-primary-diagonal); color: white; box-shadow: 0 0 0 5px rgba(105, 65, 255, 0.3);
      // --gradient-primary-diagonal: linear-gradient(to bottom right, #6941FF, #89FFE6); (primary-dark, primary-light)
      "bg-gradient-to-br from-primary-dark to-primary-light text-white ring-4 ring-primary-dark/30 ring-offset-2 ring-offset-bg-main-html": isActive && isEnabled,
      // Original completed: background: linear-gradient(to bottom right, #10B981, #059669); color: white; box-shadow: 0 0 0 5px rgba(16, 185, 129, 0.3);
      // #10B981 is success-html, #059669 is a darker green
      "bg-gradient-to-br from-success-html to-[#059669] text-white ring-4 ring-success-html/30 ring-offset-2 ring-offset-bg-main-html": isCompleted && isEnabled,
      "bg-gray-100 text-text-light-html opacity-70 cursor-not-allowed": !isEnabled, // Original: background-color: #F3F4F6; color: #9CA3AF;
      "hover:shadow-md-html hover:scale-105": isEnabled && !isActive && !isCompleted, // Using shadow-md-html for hover
      "cursor-pointer": isEnabled,
    }
  );

  const lineClasses = cn(
    "absolute top-10 left-[-50%] w-full h-1 bg-gray-200 z-[1]", // Original line: height: 4px; background-color: #E5E7EB; (gray-200)
    {
        // Original completed line: background: linear-gradient(to right, #10B981, #059669);
        "bg-gradient-to-r from-success-html to-[#059669]": isCompleted && isEnabled,
        // Original active line: background: linear-gradient(to right, #10B981, var(--primary-light));
        "bg-gradient-to-r from-success-html to-primary-light": isActive && isEnabled && !isCompleted,
    }
  );

  return (
    <div
      className={cn(
        "min-w-[180px] md:min-w-[200px] mx-3 text-center relative transition-all duration-300 ease-in-out",
        // Original selected: transform: scale(1.05);
        // Original selected icon: box-shadow: 0 0 0 5px rgba(105, 65, 255, 0.3), var(--shadow-md);
        // The isActive && isEnabled already handles scale and ring which simulates the shadow effect.
        { "opacity-60": !isEnabled }
      )}
      data-stage-id={stageId}
      onClick={handleStageClick}
    >
      {showLine && <div className={lineClasses} style={{ height: '4px' }}></div>} {/* Explicit height for line */}
      <div className={stageIconClasses}>
        {/* Original icon font-size: 1.75rem */}
        <Icon className={cn("w-9 h-9", isEnabled && (isActive || isCompleted) ? "text-white" : "text-text-secondary-html")} />
      </div>
      {/* Original stage-name: font-weight: 600; font-size: 1.125rem; margin-bottom: 0.5rem; color: var(--text-primary); */}
      <div className={cn("font-semibold text-lg mb-1", !isEnabled ? "text-text-light-html" : "text-text-primary-html")}>{name}</div>
      {/* Original stage-status: color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.75rem; */}
      <div className={cn("text-xs mb-2", !isEnabled ? "text-text-light-html" : "text-text-secondary-html")}>{isEnabled ? status : '已禁用'}</div>
      
      {/* Toggle Switch Styling to match original */}
      {onToggle && (
        // Original stage-toggle: margin-top: 0.75rem;
        <div className="mt-3 flex justify-center items-center">
          {/* Original toggle-switch: width: 48px; height: 24px; */}
          <label htmlFor={`toggle-${stageId}`} className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                id={`toggle-${stageId}`}
                className="sr-only peer" // Added peer for peer-checked styling
                checked={isEnabled}
                onChange={handleToggleChange}
              />
              {/* Original toggle-slider: background-color: #E5E7EB; border-radius: 24px; */}
              {/* Original checked: background: var(--gradient-primary); */}
              <div className={cn(
                "block w-12 h-6 rounded-full transition-colors duration-300",
                "peer-checked:bg-gradient-to-r peer-checked:from-primary-dark peer-checked:to-primary-light",
                !isEnabled && "bg-gray-300" // bg-gray-300 is close to #E5E7EB
              )}></div>
              {/* Original toggle-slider:before: height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; border-radius: 50%; */}
              {/* Original checked:before: transform: translateX(24px); */}
              <div className={cn(
                "absolute left-1 top-1 bg-white w-[18px] h-[18px] rounded-full transition-transform duration-300 ease-in-out",
                "peer-checked:transform peer-checked:translate-x-[24px]" // 24px is 48px (width) - 18px (knob) - 3px*2 (padding)
              )}></div>
            </div>
            {/* Original toggle-label: margin-left: 0.5rem; font-size: 0.875rem; font-weight: 500; color: var(--text-secondary); */}
            <span className="ml-2 text-xs font-medium text-text-secondary-html">{isEnabled ? '启用' : '禁用'}</span>
          </label>
        </div>
      )}
    </div>
  );
};

// Example usage data (can be moved to the parent component)
export const examplePipelineStages = [
  { id: 'seed', icon: Database, name: '种子数据库', status: '已配置', isEnabled: true, showLine: false },
  { id: 'generation', icon: GitBranch, name: '数据生成', status: '已配置', isEnabled: true },
  { id: 'assessment', icon: ClipboardCheck, name: '质量评估', status: '待配置', isEnabled: true },
  { id: 'filtering', icon: Filter, name: '数据筛选', status: '待配置', isEnabled: true },
];

export default PipelineStageItem;