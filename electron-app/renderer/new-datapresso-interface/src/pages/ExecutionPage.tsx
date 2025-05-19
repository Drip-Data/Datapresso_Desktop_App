import React, { useState, ChangeEvent, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, PlayCircle, FolderOpen, CheckSquare, ListChecks, BarChart3, Activity, LucideIcon } from 'lucide-react';
import PipelineStageItem, { examplePipelineStages, PipelineStage } from '@/components/PipelineStageItem'; // Reusing for display and importing PipelineStage type
import { 
  Chart as ChartJS, 
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// 注册所需的组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Interface definitions
interface ExecutionPipelineStage extends PipelineStage {
  isActive: boolean;
  isCompleted: boolean;
  status: '待执行' | '运行中' | '已完成' | '失败' | '等待中' | string;
}

interface StageExecStatus {
  status: string;
  time: string;
  indicator: 'completed' | 'running' | 'waiting' | 'failed' | string;
}

interface CurrentExecutionStatus {
  seed: StageExecStatus;
  generation: StageExecStatus;
  assessment: StageExecStatus;
  filtering: StageExecStatus;
  overallProgress: number;
  eta: string;
}

interface LogEntry {
  time: string;
  type: 'info' | 'success' | 'warning' | 'error' | string;
  message: string;
}

// Common styles
const cardClass = "bg-white rounded-xl shadow-md border border-gray-200";
const cardHeaderClass = "px-6 py-4 border-b border-gray-200 flex justify-between items-center";
const cardBodyClass = "p-6";
const formGroupClass = "mb-4";
const formLabelClass = "block mb-1.5 text-sm font-medium text-text-primary-html";
const formControlBaseClass = "w-full px-3 py-2 rounded-lg border-gray-300 bg-white text-sm text-text-primary-html placeholder:text-text-light-html focus:border-primary-dark focus:ring-1 focus:ring-primary-dark/50";

// Chart Component (Simplified for inline use, can be extracted)
interface ExecChartProps {
  chartId: string;
  chartType: 'line' | 'bar';
  labels: string[];
  datasetLabel: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  titleText: string;
}
const ExecChart: React.FC<ExecChartProps> = ({ chartId, chartType, labels, datasetLabel, data, borderColor, backgroundColor, titleText }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        chartInstanceRef.current = new ChartJS(ctx, {
          type: chartType,
          data: {
            labels: labels,
            datasets: [{
              label: datasetLabel,
              data: data,
              borderColor: borderColor,
              backgroundColor: backgroundColor,
              fill: true,
              tension: 0.3
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { 
              y: { 
                beginAtZero: true, 
                suggestedMax: chartType === 'line' && datasetLabel.includes('%') ? 100 : undefined 
              }
            },
            plugins: { 
              title: { 
                display: true, 
                text: titleText, 
                color: '#1F2937', 
                font: {size: 14, weight: 500} 
              } 
            }
          }
        });
      }
    }
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [chartId, chartType, labels, datasetLabel, data, borderColor, backgroundColor, titleText]);
  return <canvas ref={chartRef} id={chartId} className="max-h-[200px] w-full"></canvas>;
};


const ExecutionPage: React.FC = () => {
  const [executionMode, setExecutionMode] = useState<string>("sequential");
  const [executionName, setExecutionName] = useState<string>(`LIMO流程执行-${new Date().toISOString().split('T')[0]}`);
  const [executionLlm, setExecutionLlm] = useState<string>("gpt4");
  
  // For pipeline display - simplified, assumes stages are loaded/fixed for execution view
  const [pipelineStages, setPipelineStages] = useState<ExecutionPipelineStage[]>(
    examplePipelineStages.map((s: PipelineStage) => ({ ...s, isActive: false, isCompleted: false, status: "待执行" }))
  );

  const handleToggleExecStage = (stageId: string, isEnabled: boolean) => {
    setPipelineStages((prev: ExecutionPipelineStage[]) =>
      prev.map((s: ExecutionPipelineStage) =>
        s.id === stageId ? {...s, isEnabled } : s
      )
    );
  };
  
  // Mock execution state
  const [currentExecStatus, setCurrentExecStatus] = useState<CurrentExecutionStatus>({
    seed: { status: '已完成', time: '1.2s', indicator: 'completed'},
    generation: { status: '运行中 (65/100 条)', time: '', indicator: 'running'},
    assessment: { status: '等待中', time: '', indicator: 'waiting'},
    filtering: { status: '等待中', time: '', indicator: 'waiting'},
    overallProgress: 45, // percentage
    eta: '8分钟'
  });

  const mockLogs: LogEntry[] = [
    { time: '14:32:05', type: 'info', message: '开始执行 LIMO 流程' },
    { time: '14:32:05', type: 'info', message: '加载种子数据库配置' },
    { time: '14:32:06', type: 'info', message: '读取种子数据: example_seed_data.jsonl' },
    { time: '14:32:06', type: 'success', message: '种子数据处理完成，读取1000条记录' },
    { time: '14:32:07', type: 'info', message: '开始数据生成阶段' },
    { time: '14:32:08', type: 'info', message: '使用GPT-4模型生成数据' },
    { time: '14:35:15', type: 'info', message: '生成进度 15/100' },
    { time: '14:38:22', type: 'info', message: '生成进度 30/100' },
    { time: '14:41:35', type: 'info', message: '生成进度 45/100' },
    { time: '14:43:10', type: 'warning', message: 'API请求轻微延迟' },
    { time: '14:45:00', type: 'info', message: '生成进度 65/100' },
  ];
  
  const getStatusIndicatorClass = (indicator: StageExecStatus['indicator']) => {
    if (indicator === 'completed') return 'bg-success-html';
    if (indicator === 'running') return 'bg-primary-dark animate-pulse ring-2 ring-primary-dark/30';
    if (indicator === 'waiting') return 'bg-warning-html';
    if (indicator === 'failed') return 'bg-danger-html';
    return 'bg-gray-400';
  };
  const getLogTypeClass = (type: LogEntry['type']) => {
    if (type === 'success') return 'text-green-400';
    if (type === 'info') return 'text-blue-300';
    if (type === 'warning') return 'text-yellow-300';
    if (type === 'error') return 'text-red-400';
    return 'text-slate-400';
  }

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <div className={cardHeaderClass}>
          <h2 className="text-xl font-semibold text-text-primary-html flex items-center">
            <PlayCircle size={22} className="mr-3 text-primary-dark" />
            执行控制
          </h2>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => alert("加载流程功能待实现")}>
            <FolderOpen size={14} className="mr-1.5" /> 加载流程
          </Button>
        </div>
        <div className={cardBodyClass}>
          <div className="flex items-start p-4 mb-6 rounded-xl bg-info-html/10 text-info-html border border-blue-300">
            <AlertCircle size={20} className="mr-3 mt-0.5 flex-shrink-0" />
            <div>在此页面可以执行已保存的数据处理流程，并实时监控执行进度和结果。</div>
          </div>

          {/* Pipeline Flow Display */}
          <div className="flex overflow-x-auto py-4 px-1 custom-scrollbar mb-6 border rounded-lg bg-slate-50">
            {pipelineStages.map((stage, index) => (
              <PipelineStageItem
                key={stage.id}
                stageId={stage.id}
                icon={stage.icon}
                name={stage.name}
                status={currentExecStatus[stage.id as keyof Omit<CurrentExecutionStatus, 'overallProgress' | 'eta'>]?.status || stage.status}
                isActive={false} // Not clickable for config here
                isCompleted={currentExecStatus[stage.id as keyof Omit<CurrentExecutionStatus, 'overallProgress' | 'eta'>]?.indicator === 'completed'}
                isEnabled={stage.isEnabled}
                showLine={index > 0}
                onToggle={handleToggleExecStage} // Allow toggling for execution
              />
            ))}
          </div>

          {/* Execution Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={formGroupClass}>
              <Label htmlFor="exec-mode" className={formLabelClass}>执行模式</Label>
              <Select value={executionMode} onValueChange={setExecutionMode}>
                <SelectTrigger id="exec-mode" className={formControlBaseClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sequential">顺序执行</SelectItem>
                  <SelectItem value="parallel">并行执行 (如可能)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={formGroupClass}>
              <Label htmlFor="exec-name" className={formLabelClass}>执行名称</Label>
              <Input id="exec-name" value={executionName} onChange={(e: ChangeEvent<HTMLInputElement>) => setExecutionName(e.target.value)} className={formControlBaseClass} />
            </div>
            <div className={formGroupClass}>
              <Label htmlFor="exec-llm" className={formLabelClass}>LLM选择</Label>
              <Select value={executionLlm} onValueChange={setExecutionLlm}>
                <SelectTrigger id="exec-llm" className={formControlBaseClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt4">GPT-4</SelectItem>
                  <SelectItem value="claude3opus">Claude-3-Opus</SelectItem>
                  <SelectItem value="llama3_70b">Llama-3-70B</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mb-8">
            <Button variant="outline" onClick={() => alert("验证配置功能待实现")}>
              <CheckSquare size={16} className="mr-2" /> 验证配置
            </Button>
            <Button variant="outline" onClick={() => alert("执行选中阶段功能待实现")}>
              <ListChecks size={16} className="mr-2" /> 执行选中阶段
            </Button>
            <Button className="bg-gradient-to-r from-primary-dark to-primary-light hover:opacity-90" onClick={() => alert("执行全部流程功能待实现")}>
              <PlayCircle size={16} className="mr-2" /> 执行全部流程
            </Button>
          </div>

          {/* Execution Monitor Section */}
          <div className="space-y-6">
            <div className="flex items-center text-lg font-semibold text-text-primary-html">
              <Activity size={20} className="mr-2 text-primary-dark" />
              执行监控
            </div>
            {/* Status Card */}
            <div className={cardClass}>
              <div className={`${cardHeaderClass} bg-slate-50/70`}>
                <h4 className="font-semibold text-text-primary-html">当前执行状态</h4>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${currentExecStatus.generation.indicator === 'running' ? 'bg-primary-dark/10 text-primary-dark' : 'bg-success-html/10 text-green-700'}`}>
                  {currentExecStatus.generation.indicator === 'running' ? '运行中' : '已完成/空闲'}
                </span>
              </div>
              <div className={cardBodyClass}>
                <div className="space-y-2.5 text-sm mb-4">
                  {Object.entries(currentExecStatus)
                    .filter(([key]) => key !== 'overallProgress' && key !== 'eta')
                    .map(([key, val]) => (
                    <div key={key} className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2.5 ${getStatusIndicatorClass(val.indicator)}`}></div>
                      <span className="font-medium text-text-primary-html capitalize w-28">{key.replace(/([A-Z])/g, ' $1')}:</span>
                      <span className="text-text-secondary-html">{val.status} {val.time && `(${val.time})`}</span>
                    </div>
                  ))}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                  <div className="bg-gradient-to-r from-primary-dark to-primary-light h-2.5 rounded-full transition-all duration-500" style={{ width: `${currentExecStatus.overallProgress}%` }}></div>
                </div>
                <div className="flex justify-between text-xs text-text-secondary-html">
                  <span>总进度: {currentExecStatus.overallProgress}%</span>
                  <span>预计剩余时间: {currentExecStatus.eta}</span>
                </div>
                <div className="mt-4 p-3 bg-slate-800 rounded-md max-h-48 overflow-y-auto custom-scrollbar">
                  {mockLogs.map((log: LogEntry, index: number) => (
                    <div key={index} className="text-xs font-mono mb-0.5">
                      <span className="text-slate-500 mr-2">{log.time}</span>
                      <span className={getLogTypeClass(log.type)}>{log.type.toUpperCase()}:</span>
                      <span className="text-slate-300 ml-1">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Performance Charts Card */}
            <div className={cardClass}>
               <div className={`${cardHeaderClass} bg-slate-50/70`}>
                <h4 className="font-semibold text-text-primary-html">性能指标</h4>
              </div>
              <div className={`${cardBodyClass} grid grid-cols-1 md:grid-cols-2 gap-6`}>
                <ExecChart
                  chartId="execProgressChart"
                  chartType="line"
                  labels={['0min', '5min', '10min', '15min', '20min']}
                  datasetLabel="处理进度 (%)"
                  data={[0, 20, 45, 75, currentExecStatus.overallProgress]}
                  borderColor="hsl(var(--primary))"
                  backgroundColor="hsla(var(--primary), 0.2)"
                  titleText="流程执行进度"
                />
                <ExecChart
                  chartId="execPerformanceChart"
                  chartType="bar"
                  labels={['种子库', '生成', '评估', '筛选']}
                  datasetLabel="处理速度 (条/秒)"
                  data={[500, 25, 15, 120]} // Example data
                  borderColor="hsl(var(--primary-dark))" // Using primary-dark from tailwind config
                  backgroundColor="hsla(var(--primary-dark), 0.2)"
                  titleText="各阶段处理性能"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutionPage;