import React, { useState, ChangeEvent, useEffect, useRef, useCallback } from 'react';
import WorkflowBuilderCard from '@/components/WorkflowBuilderCard';
import WorkflowActionsCard from '@/components/WorkflowActionsCard';
// WorkflowConfigProvider and ProjectProvider will be moved to App.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, PlayCircle, FolderOpen, CheckSquare, ListChecks, Activity } from 'lucide-react';
import PipelineStageItem, { examplePipelineStages, PipelineStage } from '@/components/PipelineStageItem';
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

// Register ChartJS components
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
);

// Common styles
const cardClass = "bg-white rounded-xl shadow-md border border-gray-200";
const cardHeaderClass = "px-6 py-4 border-b border-gray-200 flex justify-between items-center";
const cardBodyClass = "p-6";
const formGroupClass = "mb-4";
const formLabelClass = "block mb-1.5 text-sm font-medium text-text-primary-html";
const formControlBaseClass = "w-full px-3 py-2 rounded-lg border-gray-300 bg-white text-sm text-text-primary-html placeholder:text-text-light-html focus:border-primary-dark focus:ring-1 focus:ring-primary-dark/50";

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

// Chart Component (copied from ExecutionPage)
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
                suggestedMax: chartType === 'line' && datasetLabel.includes('%') ? 100 : undefined,
                grid: {
                  color: 'rgba(200, 200, 200, 0.2)', // Lighter grid lines
                  // borderColor: 'rgba(200, 200, 200, 0.3)', // Removed, not a valid property here
                },
                ticks: {
                  color: '#6B7280', // text-secondary-html
                  font: {
                    size: 10,
                  }
                }
              },
              x: {
                grid: {
                  display: false, // Hide x-axis grid lines for a cleaner look
                },
                ticks: {
                  color: '#6B7280', // text-secondary-html
                  font: {
                    size: 10,
                  }
                }
              }
            },
            plugins: {
              title: {
                display: true,
                text: titleText,
                color: '#1F2937', // text-primary-html
                font: { size: 14, weight: '500' as unknown as number },
                padding: {
                  bottom: 10 // Add some padding below title
                }
              },
              legend: {
                display: true,
                position: 'top',
                labels: {
                  color: '#374151', // text-gray-700, slightly darker than ticks
                  font: {
                    size: 11
                  },
                  boxWidth: 12,
                  padding: 10
                }
              },
              tooltip: {
                enabled: true,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                titleFont: { size: 13, weight: 'bold' },
                bodyFont: { size: 12 },
                padding: 10,
                cornerRadius: 4,
                displayColors: false, // Hide color box in tooltip for cleaner look
                callbacks: {
                  label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) {
                      label += ': ';
                    }
                    if (context.parsed.y !== null) {
                      label += context.parsed.y;
                      if (datasetLabel.includes('%')) {
                        label += '%';
                      }
                    }
                    return label;
                  }
                }
              }
            },
            elements: {
              line: {
                borderWidth: 2, // Slightly thicker line
              },
              point: {
                radius: 3,
                hoverRadius: 5,
                hitRadius: 10,
              },
              bar: {
                borderRadius: 4, // Rounded corners for bars
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


const ExecutionMonitorSection = () => {
  const [executionMode, setExecutionMode] = useState<string>("sequential");
  const [executionName, setExecutionName] = useState<string>(`LIMO流程执行-${new Date().toISOString().split('T')[0]}`);
  const [executionLlm, setExecutionLlm] = useState<string>("not_specified");

  const [pipelineStagesForExec, setPipelineStagesForExec] = useState<ExecutionPipelineStage[]>(
    examplePipelineStages.map((s: PipelineStage) => ({ 
        ...s, isActive: false, isCompleted: false, status: "待执行" 
    }))
  );

  const [currentExecStatus, setCurrentExecStatus] = useState<CurrentExecutionStatus>({ // Now full, not partial
    seed: { status: '待执行', time: '', indicator: 'waiting'},
    generation: { status: '待执行', time: '', indicator: 'waiting'},
    assessment: { status: '待执行', time: '', indicator: 'waiting'},
    filtering: { status: '待执行', time: '', indicator: 'waiting'},
    overallProgress: 0,
    eta: 'N/A'
  });
  
  const [logs, setLogs] = useState<LogEntry[]>([]); // State for logs

  const handleToggleExecStage = (stageId: string, isEnabled: boolean) => {
    setPipelineStagesForExec((prev) => prev.map((s) => s.id === stageId ? {...s, isEnabled } : s ));
    console.log(`Stage ${stageId} toggled for execution: ${isEnabled}`);
  };
  
  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs(prevLogs => [...prevLogs, {time: new Date().toLocaleTimeString(), type, message}]);
  }, []);

  const startMockExecution = useCallback(() => {
    alert("开始模拟执行！");
    setLogs([]); // Clear previous logs
    addLog('info', '开始执行 LIMO 流程...');
    
    let progress = 0;
    const stagesOrder: (keyof Omit<CurrentExecutionStatus, 'overallProgress' | 'eta'>)[] = ['seed', 'generation', 'assessment', 'filtering'];
    let currentStageIndex = 0;

    const initialStatusUpdate: Partial<CurrentExecutionStatus> = {};
    stagesOrder.forEach(key => {
        initialStatusUpdate[key] = { status: '等待中', time: '', indicator: 'waiting' };
    });
    initialStatusUpdate[stagesOrder[0]] = { status: '运行中', time: '', indicator: 'running' };
    initialStatusUpdate.overallProgress = 5;
    initialStatusUpdate.eta = '10分钟';

    setCurrentExecStatus(prev => ({...prev, ...initialStatusUpdate } as CurrentExecutionStatus));
    addLog('info', `阶段 ${stagesOrder[0]} 开始运行...`);
    
    const intervalId = setInterval(() => {
      progress += 5; 
      const stageKey = stagesOrder[currentStageIndex];

      if (progress >= (currentStageIndex + 1) * 25 && currentStageIndex < stagesOrder.length -1) {
          const stageTime = (Math.random()*2 + 1).toFixed(1);
          addLog('success', `阶段 ${stageKey} 已完成，耗时 ${stageTime}s`);
          setCurrentExecStatus(prev => ({
              ...prev,
              [stageKey]: { status: '已完成', time: `${stageTime}s`, indicator: 'completed'},
              overallProgress: progress,
          } as CurrentExecutionStatus));
          currentStageIndex++;
          const nextStageKey = stagesOrder[currentStageIndex];
          addLog('info', `阶段 ${nextStageKey} 开始运行...`);
          setCurrentExecStatus(prev => ({
              ...prev,
              [nextStageKey]: { ...(prev[nextStageKey] || {}), status: '运行中', time: '', indicator: 'running'},
          } as CurrentExecutionStatus));

      } else if (progress < 100) {
         setCurrentExecStatus(prev => ({
            ...prev,
            [stageKey]: { ...(prev[stageKey] || {}), status: `运行中 (${Math.floor((progress % 25) / 25 * 100)}%)`, time: '', indicator: 'running'},
            overallProgress: progress,
            eta: `${10 - Math.floor(progress/10)} 分钟`
        } as CurrentExecutionStatus));
      } else {
        const stageTime = (Math.random()*2 + 1).toFixed(1);
        addLog('success', `阶段 ${stageKey} 已完成，耗时 ${stageTime}s`);
        setCurrentExecStatus(prev => ({
            ...prev,
            [stageKey]: { status: '已完成', time: `${stageTime}s`, indicator: 'completed'},
            overallProgress: 100,
            eta: '0 分钟'
        } as CurrentExecutionStatus));
        clearInterval(intervalId);
        addLog('success', '所有阶段执行完成!');
        alert("模拟执行完成！");
      }
    }, 500);
  }, [addLog]);

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
          <h2 className="text-xl font-semibold text-text-primary-html flex items-center"><PlayCircle size={22} className="mr-3 text-primary-dark" />执行参数与操作</h2>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => alert("加载已保存流程配置功能待实现")}><FolderOpen size={14} className="mr-1.5" /> 加载已保存流程</Button>
        </div>
        <div className={cardBodyClass}>
          <div className="flex items-start p-4 mb-6 rounded-xl bg-info-html/10 text-info-html border border-blue-300"><AlertCircle size={20} className="mr-3 mt-0.5 flex-shrink-0" /><div>在此配置并启动流程执行，并监控其进度。</div></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={formGroupClass}><Label htmlFor="exec-mode" className={formLabelClass}>执行模式</Label><Select value={executionMode} onValueChange={setExecutionMode}><SelectTrigger id="exec-mode" className={formControlBaseClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sequential">顺序执行</SelectItem><SelectItem value="parallel" disabled>并行执行 (暂不可用)</SelectItem></SelectContent></Select></div>
            <div className={formGroupClass}><Label htmlFor="exec-name" className={formLabelClass}>执行名称</Label><Input id="exec-name" value={executionName} onChange={(e: ChangeEvent<HTMLInputElement>) => setExecutionName(e.target.value)} className={formControlBaseClass} /></div>
            <div className={formGroupClass}><Label htmlFor="exec-llm" className={formLabelClass}>全局LLM覆盖 (可选)</Label><Select value={executionLlm} onValueChange={setExecutionLlm}><SelectTrigger id="exec-llm" className={formControlBaseClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="not_specified">不覆盖 (使用各阶段配置)</SelectItem><SelectItem value="gpt4">GPT-4</SelectItem><SelectItem value="claude3opus">Claude-3-Opus</SelectItem><SelectItem value="llama3_70b">Llama-3-70B</SelectItem></SelectContent></Select><p className="text-xs text-gray-500 mt-1">若指定，将覆盖流程中各阶段的独立模型配置。</p></div>
          </div>
          <div className="mb-6"><Label className={`${formLabelClass} mb-2`}>流程步骤概览 (可勾选要执行的阶段)</Label><div className="flex justify-center overflow-x-auto py-4 px-1 custom-scrollbar">{pipelineStagesForExec.map((stage, index) => (<PipelineStageItem key={stage.id} stageId={stage.id} icon={stage.icon} name={stage.name} status={currentExecStatus[stage.id as keyof Omit<CurrentExecutionStatus, 'overallProgress' | 'eta'>]?.status || stage.status} isActive={currentExecStatus[stage.id as keyof Omit<CurrentExecutionStatus, 'overallProgress' | 'eta'>]?.indicator === 'running'} isCompleted={currentExecStatus[stage.id as keyof Omit<CurrentExecutionStatus, 'overallProgress' | 'eta'>]?.indicator === 'completed'} isEnabled={stage.isEnabled} showLine={index > 0} onToggle={handleToggleExecStage} />))}</div></div>
          <div className="flex justify-end space-x-3 mb-8"><Button variant="outline" onClick={() => alert("验证配置功能待实现")}><CheckSquare size={16} className="mr-2" /> 验证当前流程配置</Button><Button className="bg-gradient-to-r from-primary-dark to-primary-light hover:opacity-90" onClick={startMockExecution}><PlayCircle size={16} className="mr-2" /> 执行已勾选阶段</Button></div>
          
          {/* Execution Monitor Section */}
          <div className="space-y-6">
            <div className="flex items-center text-lg font-semibold text-text-primary-html"><Activity size={20} className="mr-2 text-primary-dark" />执行监控</div>
            <div className={cardClass}>
              <div className={`${cardHeaderClass} bg-slate-50/70`}><h4 className="font-semibold text-text-primary-html">当前执行状态</h4><span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${(currentExecStatus.overallProgress ?? 0) < 100 && (currentExecStatus.overallProgress ?? 0) > 0 ? 'bg-primary-dark/10 text-primary-dark animate-pulse' : 'bg-green-100 text-green-700'}`}>{ (currentExecStatus.overallProgress ?? 0) < 100 && (currentExecStatus.overallProgress ?? 0) > 0 ? '运行中' : '空闲/已完成'}</span></div>
              <div className={cardBodyClass}>
                <div className="space-y-2.5 text-sm mb-4">
                  {Object.entries(currentExecStatus)
                    .filter(([key]) => !['overallProgress', 'eta'].includes(key))
                    .map(([key, val]) => 'status' in val && 'indicator' in val ? ( // Type guard
                      <div key={key} className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2.5 ${getStatusIndicatorClass(val.indicator)}`}></div>
                        <span className="font-medium text-text-primary-html capitalize w-28">{key.replace(/([A-Z])/g, ' $1')}:</span>
                        <span className="text-text-secondary-html">{val.status} {val.time && `(${val.time})`}</span>
                      </div>
                    ) : null)}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1"><div className="bg-gradient-to-r from-primary-dark to-primary-light h-2.5 rounded-full transition-all duration-500" style={{ width: `${currentExecStatus.overallProgress ?? 0}%` }}></div></div>
                <div className="flex justify-between text-xs text-text-secondary-html"><span>总进度: {currentExecStatus.overallProgress ?? 0}%</span><span>预计剩余时间: {currentExecStatus.eta}</span></div>
                <div className="mt-4 p-3 bg-slate-800 rounded-md max-h-60 overflow-y-auto custom-scrollbar">{logs.length === 0 ? <p className="text-slate-400 text-xs italic">暂无日志...</p> : logs.map((log: LogEntry, index: number) => (<div key={index} className="text-xs font-mono mb-0.5"><span className="text-slate-500 mr-2">{log.time}</span><span className={getLogTypeClass(log.type)}>{log.type.toUpperCase()}:</span><span className="text-slate-300 ml-1">{log.message}</span></div>))}</div>
              </div>
            </div>
            <div className={cardClass}>
               <div className={`${cardHeaderClass} bg-slate-50/70`}><h4 className="font-semibold text-text-primary-html">性能指标</h4></div>
              <div className={`${cardBodyClass} grid grid-cols-1 md:grid-cols-2 gap-6`}>
                <ExecChart chartId="execProgressChart" chartType="line" labels={['0min', '2min', '4min', '6min', '8min', '10min']} datasetLabel="处理进度 (%)" data={[0, 10, 25, 50, 75, currentExecStatus.overallProgress ?? 0]} borderColor="hsl(var(--primary-html-hsl))" backgroundColor="hsla(var(--primary-html-hsl), 0.2)" titleText="流程执行进度" />
                <ExecChart chartId="execPerformanceChart" chartType="bar" labels={['种子库', '生成', '评估', '筛选']} datasetLabel="处理速度 (条/秒)" data={[500, 25, 15, 120]} borderColor="hsl(var(--info-html-hsl))" backgroundColor="hsla(var(--info-html-hsl), 0.2)" titleText="各阶段处理性能" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const DatapressoWorkflowPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("design"); 

  return (
    // <WorkflowConfigProvider> // Moved to App.tsx
    //   <ProjectProvider>       // Moved to App.tsx
        <div className="space-y-6 lg:space-y-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
              <TabsTrigger value="design" className="py-3 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary-html data-[state=active]:text-primary-html rounded-none">Pipeline 设计与配置</TabsTrigger>
              <TabsTrigger value="execute" className="py-3 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary-html data-[state=active]:text-primary-html rounded-none">执行与监控</TabsTrigger>
            </TabsList>
            <TabsContent value="design" className="mt-0">
              <div className="space-y-6 lg:space-y-8">
                <WorkflowBuilderCard />
                <WorkflowActionsCard onSwitchToExecuteTab={() => setActiveTab('execute')} />
              </div>
            </TabsContent>
            <TabsContent value="execute" className="mt-0"><ExecutionMonitorSection /></TabsContent>
          </Tabs>
        </div>
    //   </ProjectProvider>
    // </WorkflowConfigProvider>
  );
};

export default DatapressoWorkflowPage;