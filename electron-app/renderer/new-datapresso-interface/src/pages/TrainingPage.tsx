import React, { useState, ChangeEvent, useCallback, useEffect } from 'react';
import TrainingConfigPanel, { TrainingConfigPayload } from '@/components/TrainingConfigPanel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Brain, Plus, Play, CheckSquare, BarChart2, Download, ListChecks, StopCircle, LucideIcon, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { 
  llamafactoryRun as apiLlamafactoryRun,
  llamafactoryGetTaskStatus as apiLlamafactoryGetTaskStatus,
  llamafactoryGetTaskLogs as apiLlamafactoryGetTaskLogs,
  llamafactoryStopTask as apiLlamafactoryStopTask
} from '@/utils/apiAdapter';
import { toast } from "sonner";

// Common styles
const formGroupClass = "mb-4";
const formLabelClass = "block mb-1.5 text-sm font-medium text-text-primary-html";
const formControlBaseClass = "w-full px-3 py-2 rounded-lg border-gray-300 bg-white text-sm text-text-primary-html placeholder:text-text-light-html focus:border-primary-dark focus:ring-1 focus:ring-primary-dark/50";
const cardClass = "bg-white rounded-xl shadow-md border border-gray-200";
const cardHeaderClass = "px-6 py-4 border-b border-gray-200 flex justify-between items-center";
const cardBodyClass = "p-6";

interface TrainingTaskCardProps {
  id: string;
  title: string;
  status: '已完成' | '运行中' | '待开始' | '已停止' | '失败';
  statusType: 'success' | 'primary' | 'warning' | 'danger' | 'info';
  modelInfo: string; 
  date: string;
  epochs?: string; 
  progress?: number; 
  sampleCount?: string; 
  duration?: string; 
  onViewResults?: () => void;
  onDownloadModel?: () => void;
  onViewLogs?: () => void;
  onStopTask?: () => void;
}

const TrainingTaskCard: React.FC<TrainingTaskCardProps> = ({
  title, status, statusType, modelInfo, date, epochs, progress, sampleCount, duration,
  onViewResults, onDownloadModel, onViewLogs, onStopTask
}) => {
  const getStatusTagColor = () => {
    if (statusType === 'success') return 'bg-success-html/10 text-green-700';
    if (statusType === 'primary') return 'bg-primary-dark/10 text-primary-dark';
    if (statusType === 'danger') return 'bg-danger-html/10 text-red-700';
    if (statusType === 'info') return 'bg-blue-500/10 text-blue-700';
    return 'bg-warning-html/10 text-yellow-700';
  };
  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-2"><h4 className="font-semibold text-text-primary-html">{title}</h4><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusTagColor()}`}>{status}</span></div>
      <p className="text-xs text-text-secondary-html mb-1">{modelInfo}</p><p className="text-xs text-text-secondary-html mb-3">日期: {date}</p>
      {progress !== undefined && (<><div className="w-full bg-gray-200 rounded-full h-1.5 mb-1"><div className="bg-primary-html h-1.5 rounded-full" style={{ width: `${progress}%` }}></div></div>{epochs && <p className="text-xs text-text-secondary-html text-right mb-1">{epochs} • {progress}%</p>}</>)}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary-html mt-2 mb-3">{sampleCount && <span><ListChecks size={12} className="inline mr-1"/>{sampleCount}</span>}{duration && <span><Play size={12} className="inline mr-1"/>{duration}</span>}</div>
      <div className="flex justify-end space-x-2 mt-2">
        {onViewLogs && <Button variant="outline" size="xs" onClick={onViewLogs}><ListChecks size={14} className="mr-1"/>日志</Button>}
        {onViewResults && <Button variant="outline" size="xs" onClick={onViewResults}><BarChart2 size={14} className="mr-1"/>结果</Button>}
        {onDownloadModel && status === '已完成' && <Button variant="outline" size="xs" onClick={onDownloadModel}><Download size={14} className="mr-1"/>下载</Button>}
        {onStopTask && status === '运行中' && <Button variant="destructive" size="xs" onClick={onStopTask}><StopCircle size={14} className="mr-1"/>停止</Button>}
      </div>
    </div>
  );
};

const TrainingPage: React.FC = () => {
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState<boolean>(false);
  const [currentTrainingConfig, setCurrentTrainingConfig] = useState<TrainingConfigPayload | null>(null);
  const [isSubmittingTraining, setIsSubmittingTraining] = useState<boolean>(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState<boolean>(false);
  const [currentLogs, setCurrentLogs] = useState<string>("");
  const [currentLogTaskId, setCurrentLogTaskId] = useState<string | null>(null);
  const [activePollers, setActivePollers] = useState<Record<string, NodeJS.Timeout>>({});

  const [trainingTasks, setTrainingTasks] = useState<TrainingTaskCardProps[]>([
    { id: "mock-sft-1", title: "指令遵循SFT", status: "已完成", statusType: "success", modelInfo: "Llama-3-8B SFT", date: "2024-05-09", epochs: "3/3 轮次", progress: 100, sampleCount: "642 样本", duration: "1.5 小时", onViewResults: () => toast.info("查看SFT结果功能待实现"), onDownloadModel: () => toast.info("下载SFT模型功能待实现") },
    { id: "mock-dpo-1", title: "DPO优化", status: "运行中", statusType: "primary", modelInfo: "Llama-3-8B DPO", date: "2024-05-14", epochs: "3/4 轮次", progress: 75, sampleCount: "580 对比", duration: "2.2 小时", onViewLogs: () => toast.info("查看DPO日志功能待实现"), onStopTask: () => toast.info("停止DPO任务功能待实现") },
  ]);

  const handleCreateNewTask = () => {
    setIsNewTaskModalOpen(true);
  };

  const handleTrainingConfigChange = useCallback((config: TrainingConfigPayload) => {
    setCurrentTrainingConfig(config);
  }, []);

  const stopPollingTask = useCallback((taskId: string) => {
    setActivePollers(prev => {
      if (prev[taskId]) {
        clearInterval(prev[taskId]);
        const { [taskId]: _, ...rest } = prev;
        console.log(`Stopped poller for task ${taskId}`);
        return rest;
      }
      return prev;
    });
  }, []);

  const pollTaskStatus = useCallback(async (taskId: string) => {
    if (activePollers[taskId]) {
      console.log(`Poller for task ${taskId} already active.`);
      return;
    }
    console.log(`Starting poller for task ${taskId}`);
    const intervalId = setInterval(async () => {
      try {
        const statusResult = await apiLlamafactoryGetTaskStatus(taskId); 
        
        if (statusResult && statusResult.status === 'success' && statusResult.task) {
          const taskData = statusResult.task;
          setTrainingTasks(prevTasks =>
            prevTasks.map(task => {
              if (task.id === taskId) {
                let newStatusType: TrainingTaskCardProps['statusType'] = task.statusType;
                const backendStatus = taskData.status.toLowerCase();
                let newStatus: TrainingTaskCardProps['status'] = task.status;

                if (backendStatus === 'completed' || backendStatus === 'succeeded') {
                  newStatusType = 'success'; newStatus = '已完成';
                } else if (backendStatus === 'failed') {
                  newStatusType = 'danger'; newStatus = '失败';
                } else if (backendStatus === 'running') {
                  newStatusType = 'primary'; newStatus = '运行中';
                } else if (backendStatus === 'pending' || backendStatus === 'queued') {
                  newStatusType = 'warning'; newStatus = '待开始';
                } else if (backendStatus === 'stopped' || backendStatus === 'canceled') {
                  newStatusType = 'info'; newStatus = '已停止';
                }
                
                const updatedTask = {
                  ...task,
                  status: newStatus,
                  statusType: newStatusType,
                  progress: Math.round((taskData.progress || 0) * 100),
                  duration: taskData.result?.duration || taskData.duration || task.duration, 
                  epochs: taskData.current_epoch && taskData.total_epochs ? `${taskData.current_epoch}/${taskData.total_epochs} 轮次` : task.epochs,
                };
                if (newStatus === '已完成' || newStatus === '失败' || newStatus === '已停止') {
                  toast.info(`任务 ${taskId} 已 ${newStatus}.`);
                  stopPollingTask(taskId);
                }
                return updatedTask;
              }
              return task;
            })
          );
        } else {
           console.warn(`获取任务 ${taskId} 状态失败或响应格式不正确。`, statusResult);
        }
      } catch (error: any) {
        toast.error(`轮询任务 ${taskId} 状态时出错: ${error.message}`);
        stopPollingTask(taskId); 
      }
    }, 7000); 
    setActivePollers(prev => ({ ...prev, [taskId]: intervalId }));
  }, [activePollers, stopPollingTask]);

  const handleStartTraining = async () => {
    if (!currentTrainingConfig) {
      toast.error("训练配置未就绪或未从配置面板正确传递。");
      return;
    }
    setIsSubmittingTraining(true);
    toast.info("正在提交训练任务...");
    
    const { configName, trainingMethod, baseModel, trainDataSourceType, trainCustomDataPath, trainOutputLocationType, trainCustomOutputPath, modelNameSuffix, ...methodSpecificParams } = currentTrainingConfig;
    const operationType = trainingMethod;
    
    const llamaParams: Record<string, any> = {
        do_train: true,
        model_name_or_path: baseModel,
        dataset: trainDataSourceType === 'custom_path' && trainCustomDataPath ? trainCustomDataPath : trainDataSourceType,
        finetuning_type: operationType,
        output_dir: trainOutputLocationType === 'custom_location' && trainCustomOutputPath ? trainCustomOutputPath : `./outputs/${modelNameSuffix}`,
        overwrite_output_dir: true,
        per_device_train_batch_size: (methodSpecificParams as any).sftBatchSize || (methodSpecificParams as any).dpoBatchSize || (methodSpecificParams as any).ppoBatchSize || 2,
        gradient_accumulation_steps: (methodSpecificParams as any).sftGradientAccumulationSteps || (methodSpecificParams as any).dpoGradientAccumulationSteps || (methodSpecificParams as any).ppoGradientAccumulationSteps || 4,
        learning_rate: (methodSpecificParams as any).sftLearningRate || (methodSpecificParams as any).dpoLearningRate || (methodSpecificParams as any).ppoLearningRate || "5e-5",
        num_train_epochs: (methodSpecificParams as any).sftNumTrainEpochs || (methodSpecificParams as any).dpoNumTrainEpochs || (methodSpecificParams as any).ppoNumTrainEpochs || 3.0,
        logging_steps: (methodSpecificParams as any).sftLoggingSteps || (methodSpecificParams as any).dpoLoggingSteps || (methodSpecificParams as any).ppoLoggingSteps || 10,
        save_steps: (methodSpecificParams as any).sftSaveSteps || (methodSpecificParams as any).dpoSaveSteps || (methodSpecificParams as any).ppoSaveSteps || 100,
        max_samples: parseInt(String((methodSpecificParams as any).sftMaxSamples || (methodSpecificParams as any).dpoMaxSamples || (methodSpecificParams as any).ppoMaxSamples || "100000"), 10),
        compute_type: (methodSpecificParams as any).sftComputeType || (methodSpecificParams as any).dpoComputeType || (methodSpecificParams as any).ppoComputeType || "bf16",
        cutoff_len: (methodSpecificParams as any).sftCutoffLen || (methodSpecificParams as any).dpoCutoffLen || (methodSpecificParams as any).ppoCutoffLen || 1024,
        val_size: (methodSpecificParams as any).sftValSize || (methodSpecificParams as any).dpoValSize || 0,
        lr_scheduler_type: (methodSpecificParams as any).sftLrSchedulerType || (methodSpecificParams as any).dpoLrSchedulerType || (methodSpecificParams as any).ppoLrSchedulerType || "cosine",
        warmup_steps: (methodSpecificParams as any).sftWarmupSteps || (methodSpecificParams as any).dpoWarmupSteps || (methodSpecificParams as any).ppoWarmupSteps || 0,
        optim: (methodSpecificParams as any).sftOptim || (methodSpecificParams as any).dpoOptim || (methodSpecificParams as any).ppoOptim || "adamw_torch",
    };

    if (operationType === "sft") {
        Object.assign(llamaParams, {
            packing: (methodSpecificParams as any).sftPacking, train_on_prompt: (methodSpecificParams as any).sftTrainOnPrompt,
            resize_vocab: (methodSpecificParams as any).sftResizeVocab, neftune_noise_alpha: (methodSpecificParams as any).sftNeftuneAlpha,
            use_lora: (methodSpecificParams as any).sftUseLora,
            lora_rank: (methodSpecificParams as any).sftUseLora ? (methodSpecificParams as any).sftLoraRank : undefined,
            lora_alpha: (methodSpecificParams as any).sftUseLora ? (methodSpecificParams as any).sftLoraAlpha : undefined,
            lora_dropout: (methodSpecificParams as any).sftUseLora ? (methodSpecificParams as any).sftLoraDropout : undefined,
            lora_target: (methodSpecificParams as any).sftUseLora ? (methodSpecificParams as any).sftLoraTargetModules : undefined,
        });
    } else if (operationType === "dpo") {
        Object.assign(llamaParams, {
            max_grad_norm: (methodSpecificParams as any).dpoMaxGradNorm, dpo_beta: (methodSpecificParams as any).dpoBeta,
            dpo_loss: (methodSpecificParams as any).dpoLossType, dpo_ftx: (methodSpecificParams as any).dpoFtx,
            reward_model: (methodSpecificParams as any).dpoRewardModelPath || undefined,
            use_lora: (methodSpecificParams as any).dpoUseLora,
            lora_rank: (methodSpecificParams as any).dpoUseLora ? (methodSpecificParams as any).dpoLoraRank : undefined,
            lora_alpha: (methodSpecificParams as any).dpoUseLora ? (methodSpecificParams as any).dpoLoraAlpha : undefined,
            lora_dropout: (methodSpecificParams as any).dpoUseLora ? (methodSpecificParams as any).dpoLoraDropout : undefined,
            lora_target: (methodSpecificParams as any).dpoUseLora ? (methodSpecificParams as any).dpoLoraTargetModules : undefined,
        });
    } else if (operationType === "ppo") {
        Object.assign(llamaParams, {
            max_grad_norm: (methodSpecificParams as any).ppoMaxGradNorm,
            ppo_score_norm: (methodSpecificParams as any).ppoScoreNorm, ppo_whiten_rewards: (methodSpecificParams as any).ppoWhitenRewards,
            ppo_kl_coeff: (methodSpecificParams as any).ppoKlCoeff,
            reward_model: (methodSpecificParams as any).ppoRewardModelPath || undefined,
            use_lora: (methodSpecificParams as any).ppoUseLora,
            lora_rank: (methodSpecificParams as any).ppoUseLora ? (methodSpecificParams as any).ppoLoraRank : undefined,
            lora_alpha: (methodSpecificParams as any).ppoUseLora ? (methodSpecificParams as any).ppoLoraAlpha : undefined,
            lora_dropout: (methodSpecificParams as any).ppoUseLora ? (methodSpecificParams as any).ppoLoraDropout : undefined,
            lora_target: (methodSpecificParams as any).ppoUseLora ? (methodSpecificParams as any).ppoLoraTargetModules : undefined,
        });
    }
    
    const backendRequestPayload = {
        input_data: { dataset: llamaParams.dataset, dataset_dir: trainDataSourceType === 'custom_path' ? undefined : trainDataSourceType },
        llama_params: { ...llamaParams },
        model_name: baseModel, // This might be redundant if llama_params.model_name_or_path is the primary source
        operation: operationType,
        output_dir: llamaParams.output_dir, // This is also in llama_params, ensure backend handles precedence
        config_name: configName || `${operationType}-${modelNameSuffix}`, // Add config_name
    };
    
    delete backendRequestPayload.llama_params.dataset;
    delete backendRequestPayload.llama_params.model_name_or_path; 
    delete backendRequestPayload.llama_params.finetuning_type; 
    delete backendRequestPayload.llama_params.output_dir;

    console.log("Submitting LlamaFactory training task with payload:", backendRequestPayload);

    try {
      const result = await apiLlamafactoryRun(backendRequestPayload); 
      console.log("LlamaFactory task submission result:", result);
      if (result && result.status === 'success' && result.task_id) { 
        const taskId = result.task_id;
        toast.success(`训练任务 "${taskId}" 已成功提交。`);
        const newTask: TrainingTaskCardProps = {
          id: taskId, title: `${modelNameSuffix} (${operationType.toUpperCase()})`,
          status: '待开始', statusType: 'warning', modelInfo: baseModel,
          date: new Date().toLocaleDateString(), progress: 0,
        };
        setTrainingTasks(prev => [newTask, ...prev]);
        pollTaskStatus(taskId); 
      } else if (result && result.status === 'error') {
         toast.error(`训练任务提交失败: ${result.message || '未知错误'}`);
      } else {
        toast.error("训练任务提交失败，响应格式不正确。");
      }
    } catch (error: any) {
      console.error("Error submitting LlamaFactory training task:", error);
      toast.error(`训练任务提交出错: ${error.message}`);
    } finally {
      setIsSubmittingTraining(false);
    }
  };
  
  useEffect(() => {
    const currentPollers = { ...activePollers };
    let pollersUpdated = false;

    trainingTasks.forEach(task => {
      if ((task.status === '待开始' || task.status === '运行中') && !currentPollers[task.id]) {
        pollTaskStatus(task.id);
      } else if (!['待开始', '运行中'].includes(task.status) && currentPollers[task.id]) {
        clearInterval(currentPollers[task.id]);
        delete currentPollers[task.id];
        pollersUpdated = true;
      }
    });

    if (pollersUpdated) {
      setActivePollers(currentPollers);
    }

    return () => {
      Object.values(activePollers).forEach(clearInterval);
    };
  }, [trainingTasks, activePollers, pollTaskStatus]);

  const handleViewLogs = async (taskId: string) => {
    setCurrentLogTaskId(taskId);
    setCurrentLogs("正在加载日志...");
    setIsLogsModalOpen(true);
    try {
      const result = await apiLlamafactoryGetTaskLogs(taskId, 200); 
      if (result && result.status === 'success' && result.logs) {
        setCurrentLogs(Array.isArray(result.logs) ? result.logs.join('\n') : String(result.logs));
      } else {
        setCurrentLogs(`无法加载日志: ${result?.message || '未知错误'}`);
      }
    } catch (error: any) {
      setCurrentLogs(`加载日志失败: ${error.message}`);
    }
  };

  const handleStopTask = async (taskId: string) => {
    if (!confirm(`确定要停止任务 ${taskId} 吗？`)) return;
    toast.info(`正在尝试停止任务 ${taskId}...`);
    try {
      const result = await apiLlamafactoryStopTask(taskId); 
      if (result && result.status === 'success') {
        toast.success(`任务 ${taskId} 已发送停止请求。状态可能稍后更新。`);
        setTrainingTasks(prev => prev.map(t => t.id === taskId ? {...t, status: '已停止', statusType: 'info'} : t));
        stopPollingTask(taskId);
      } else {
        toast.error(`停止任务 ${taskId} 失败: ${result?.message || '未知错误'}`);
      }
    } catch (error: any) {
      toast.error(`停止任务 ${taskId} API调用失败: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <div className={cardHeaderClass}>
          <h2 className="text-3xl font-bold text-text-primary-html flex items-center">
            <Brain size={28} className="mr-3 text-primary-dark" />
            模型训练
          </h2>
          <Button size="sm" className="text-xs" onClick={handleCreateNewTask}>
            <Plus size={14} className="mr-1.5" /> 新建训练任务
          </Button>
        </div>
        <div className={cardBodyClass}>
          <div className="flex items-start p-4 mb-6 rounded-xl bg-info-html/10 text-info-html border border-blue-300">
            <AlertCircle size={20} className="mr-3 mt-0.5 flex-shrink-0" />
            <div>使用处理完成的高质量数据集对模型进行训练，支持多种训练方法如监督微调(SFT)、直接偏好优化(DPO)等。</div>
          </div>

          <div className="space-y-4">
            <TrainingConfigPanel onConfigChange={handleTrainingConfigChange} />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={() => console.log("Validate training config", currentTrainingConfig)} disabled={isSubmittingTraining}>
              <CheckSquare size={16} className="mr-2" /> 验证配置
            </Button>
            <Button
              className="bg-gradient-to-r from-primary-dark to-primary-light hover:opacity-90"
              onClick={handleStartTraining}
              disabled={isSubmittingTraining || !currentTrainingConfig}
            >
              {isSubmittingTraining ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Play size={16} className="mr-2" />}
              开始训练
            </Button>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className={cardHeaderClass}>
           <h3 className="text-2xl font-bold text-text-primary-html">训练任务</h3>
        </div>
        <div className={`${cardBodyClass} grid grid-cols-1 md:grid-cols-2 gap-4`}>
          {trainingTasks.map((task) => (
            <TrainingTaskCard 
              key={task.id} 
              {...task} 
              onViewLogs={() => handleViewLogs(task.id)}
              onStopTask={() => handleStopTask(task.id)}
            />
          ))}
        </div>
      </div>

      {/* New Training Task Modal (Placeholder) */}
      <Dialog open={isNewTaskModalOpen} onOpenChange={setIsNewTaskModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建训练任务</DialogTitle></DialogHeader>
          <div className="py-4">创建新训练任务的表单内容待实现。</div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button onClick={() => { console.log("New task created"); setIsNewTaskModalOpen(false); }}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs Modal */}
      <Dialog open={isLogsModalOpen} onOpenChange={setIsLogsModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>任务日志: {currentLogTaskId}</DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto p-1 bg-slate-900 rounded-md my-4">
            <pre className="text-xs text-slate-200 whitespace-pre-wrap break-all p-4 font-mono">
              {currentLogs}
            </pre>
          </div>
          <DialogFooter className="mt-auto pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">关闭</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainingPage;