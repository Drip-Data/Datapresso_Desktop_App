import React, { useState, ChangeEvent, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Gem, Minimize, GitFork, Plus, Play, BarChart2, Download, ListChecks, Star, Loader2, Settings2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"; // Corrected import path
import { assessQuality as apiAssessQuality, llamafactoryRun as apiLlamafactoryRun } from '@/utils/apiAdapter';
import { toast } from "sonner";

// Common styles
const formGroupClass = "mb-4";
const formLabelClass = "block mb-1.5 text-sm font-medium text-text-primary-html";
const formControlBaseClass = "w-full px-3 py-2 rounded-lg border-gray-300 bg-white text-sm text-text-primary-html placeholder:text-text-light-html focus:border-primary-dark focus:ring-1 focus:ring-primary-dark/50";
const cardTitleClass = "text-lg font-semibold text-text-primary-html flex items-center";
const cardHeaderClass = "px-6 py-4 border-b border-gray-200 flex justify-between items-center";
const cardBodyClass = "p-6";
const cardClass = "bg-white rounded-xl shadow-md border border-gray-200";

export enum QualityDimensionFrontend {
  COMPLETENESS = "completeness", ACCURACY = "accuracy", CONSISTENCY = "consistency",
  VALIDITY = "validity", UNIQUENESS = "uniqueness", DIVERSITY = "diversity",
  RELEVANCE = "relevance", ETHICAL = "ethical", TIMELINESS = "timeliness", READABILITY = "readability",
}

export interface QualityAssessmentRequestFrontend {
  data?: any[]; 
  dimensions?: QualityDimensionFrontend[];
  schema?: Record<string, any>;
  customRules?: Record<string, any>;
  assessmentModel?: string;
  assessmentCriteria?: string; 
  // Params for CLI-based methods
  method?: 'cherry' | 'less' | 'limr';
  data_file?: string;
  model_path?: string; 
  model_name_or_path?: string; 
  prompt?: string; 
  sample_rate?: number; 
  max_length?: number; 
  kmeans_num_clusters?: number; 
  low_th?: number; 
  up_th?: number; 
  output_dir?: string; 
  output_path?: string; 
  percentage?: number; 
  dims?: number; 
  dataset?: string; 
  dataset_dir?: string; 
  template?: string; 
  cutoff_len?: number; 
  learning_rate?: string; 
  num_train_epochs?: number; 
  lora_rank?: number; 
  limr_config?: { 
    enabled: boolean;
    reward_type: string;
    ground_truth_dataset: string;
    reward_correct: number;
    reward_incorrect: number;
    math_equal_normalize: boolean;
    save_samples_path: string;
    save_every_n_steps: number;
  };
  llama_params?: Record<string, any>; 
  operation?: string; 
  stage?: string; 
}

interface TaskCardProps {
  title: string; status: '已完成' | '运行中' | '待开始' | '失败'; statusType: 'success' | 'primary' | 'warning' | 'danger';
  datasetName: string; date: string; progress?: number; resultCount?: string; duration?: string;
  onViewResults?: () => void; onDownload?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ title, status, statusType, datasetName, date, progress, resultCount, duration, onViewResults, onDownload }) => {
  const getStatusTagColor = () => {
    if (statusType === 'success') return 'bg-success-html/10 text-green-700';
    if (statusType === 'primary') return 'bg-primary-dark/10 text-primary-dark';
    if (statusType === 'danger') return 'bg-danger-html/10 text-red-700';
    return 'bg-warning-html/10 text-yellow-700';
  };
  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-2"><h4 className="font-semibold text-text-primary-html">{title}</h4><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusTagColor()}`}>{status}</span></div>
      <p className="text-xs text-text-secondary-html mb-1">数据集: {datasetName}</p><p className="text-xs text-text-secondary-html mb-3">日期: {date}</p>
      {progress !== undefined && <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1"><div className="bg-primary-html h-1.5 rounded-full" style={{ width: `${progress}%` }}></div></div>}
      {(resultCount || duration) && <div className="flex justify-between text-xs text-text-secondary-html mt-2 mb-3">{resultCount && <span><ListChecks size={12} className="inline mr-1"/>{resultCount}</span>}{duration && <span><Play size={12} className="inline mr-1"/>{duration}</span>}</div>}
      <div className="flex justify-end space-x-2 mt-2">{onViewResults && <Button variant="outline" size="xs" onClick={onViewResults}><BarChart2 size={14} className="mr-1"/>结果</Button>}{onDownload && <Button variant="outline" size="xs" onClick={onDownload}><Download size={14} className="mr-1"/>下载</Button>}</div>
    </div>
  );
};

const DataQualityPage: React.FC = () => {
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [currentMethod, setCurrentMethod] = useState<'cherry' | 'less' | 'limr' | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [isAssessing, setIsAssessing] = useState(false);
  const [currentAssessmentResult, setCurrentAssessmentResult] = useState<any | null>(null);
  
  // Cherry States
  const [cherryDataFile, setCherryDataFile] = useState("data/example_cherry_input.jsonl");
  const [cherryModelPath, setCherryModelPath] = useState("meta-llama/Meta-Llama-3-8B-Instruct");
  const [cherryPrompt, setCherryPrompt] = useState("alpaca");
  const [cherrySampleRate, setCherrySampleRate] = useState(0.1);
  const [cherryMaxLength, setCherryMaxLength] = useState(512);
  const [cherryKmeansClusters, setCherryKmeansClusters] = useState(100);
  const [cherryLowTh, setCherryLowTh] = useState(25);
  const [cherryUpTh, setCherryUpTh] = useState(75);
  const [cherryOutputDirectory, setCherryOutputDirectory] = useState("output/cherry_selected_data");
  const [cherryCriteria, setCherryCriteria] = useState("使用K-Means聚类和阈值筛选高质量数据子集。");

  // Less States
  const [lessDataFile, setLessDataFile] = useState("data/example_less_input.jsonl");
  const [lessOutputPath, setLessOutputPath] = useState("output/less_deduplicated_data.jsonl");
  const [lessPercentage, setLessPercentage] = useState(0.1);
  const [lessDims, setLessDims] = useState(1024);
  const [lessModelPath, setLessModelPath] = useState("meta-llama/Meta-Llama-3-8B-Instruct");

  // LIMR States
  const [limrModelNameOrPath, setLimrModelNameOrPath] = useState("meta-llama/Meta-Llama-3-8B-Instruct");
  const [limrDataset, setLimrDataset] = useState("math_ppo_train_data");
  const [limrDatasetDir, setLimrDatasetDir] = useState("data/limr_datasets");
  const [limrTemplate, setLimrTemplate] = useState("llama3");
  const [limrOutputDirectory, setLimrOutputDirectory] = useState("output/limr_ppo_model");
  const [limrGroundTruthDataset, setLimrGroundTruthDataset] = useState("data/limr_datasets/math_ground_truth.jsonl");
  const [limrRewardCorrect, setLimrRewardCorrect] = useState(0.5);
  const [limrRewardIncorrect, setLimrRewardIncorrect] = useState(-0.1);
  const [limrLearningRate, setLimrLearningRate] = useState("2e-7");
  const [limrNumTrainEpochs, setLimrNumTrainEpochs] = useState(3.0);
  const [limrCutoffLen, setLimrCutoffLen] = useState(384);
  const [limrLoraRank, setLimrLoraRank] = useState(8);


  const openConfigModal = (method: 'cherry' | 'less' | 'limr') => {
    setCurrentMethod(method);
    if (method === 'cherry') setModalTitle('配置 Cherry 数据筛选');
    else if (method === 'less') setModalTitle('配置 Less 数据去重');
    else if (method === 'limr') setModalTitle('配置 LIMR 数据对齐 (PPO)');
    setIsConfigModalOpen(true);
  };

  const openResultsModal = (method: 'cherry' | 'less' | 'limr', taskId: string, results?: any) => {
    setCurrentMethod(method);
    setModalTitle(`${method.toUpperCase()} 任务结果: ${taskId}`);
    setCurrentAssessmentResult(results || { message: "历史任务结果加载功能待实现。" });
    setIsResultsModalOpen(true);
  };

  const handleStartTask = async () => {
    if (!currentMethod) return;
    setIsAssessing(true);
    toast.info(`开始 ${currentMethod.toUpperCase()} 任务...`);

    let requestPayload: QualityAssessmentRequestFrontend = { method: currentMethod, data: [], dimensions: [] };
    let apiFunction: Function = apiAssessQuality;

    if (currentMethod === 'cherry') {
      if (!cherryDataFile || !cherryModelPath) { toast.error("Cherry: 请输入数据文件和模型路径。"); setIsAssessing(false); return; }
      requestPayload = {
        method: "cherry", data_file: cherryDataFile, model_path: cherryModelPath, prompt: cherryPrompt,
        sample_rate: cherrySampleRate, max_length: cherryMaxLength, kmeans_num_clusters: cherryKmeansClusters,
        low_th: cherryLowTh, up_th: cherryUpTh, output_dir: cherryOutputDirectory,
        assessmentCriteria: cherryCriteria, 
        data: [{ "placeholder_data_for_cherry_cli": true }], // CLI methods might not need 'data' field if data_file is used
        dimensions: [] // Not typically used for CLI-based Cherry
      };
      // Assuming a generic endpoint that routes based on 'method' or specific CLI params
      // If backend has a dedicated /cherry endpoint, apiFunction might change.
    } else if (currentMethod === 'less') {
      if (!lessDataFile || !lessOutputPath) { toast.error("Less: 请输入数据文件和输出路径。"); setIsAssessing(false); return; }
      requestPayload = {
        method: "less", data_file: lessDataFile, output_path: lessOutputPath, percentage: lessPercentage,
        dims: lessDims, model_name_or_path: lessModelPath, 
        data: [{ "placeholder_data_for_less_cli": true }], dimensions: []
      };
    } else if (currentMethod === 'limr') {
      if (!limrModelNameOrPath || !limrDataset) { toast.error("LIMR: 请输入模型和数据集。"); setIsAssessing(false); return; }
      const llamaParams: Record<string, any> = {
        dataset: limrDataset, dataset_dir: limrDatasetDir, template: limrTemplate,
        cutoff_len: limrCutoffLen, learning_rate: limrLearningRate, num_train_epochs: limrNumTrainEpochs,
        output_dir: limrOutputDirectory, lora_rank: limrLoraRank,
        limr_enabled: true, reward_type: "rule", ground_truth_dataset: limrGroundTruthDataset,
        reward_correct: limrRewardCorrect, reward_incorrect: limrRewardIncorrect,
        math_equal_normalize: true, save_samples_path: `${limrOutputDirectory}/train_samples`, save_every_n_steps: 1,
        per_device_train_batch_size: 1, gradient_accumulation_steps: 32, 
        lr_scheduler_type: "cosine", warmup_ratio: 0.1, bf16: true, logging_steps: 1, save_steps: 80,
        lora_alpha: 16, lora_dropout: 0.1, 
        lora_target: "q_proj,v_proj,k_proj,o_proj,gate_proj,down_proj,up_proj",
        ppo_score_norm: true, ppo_whiten_rewards: true, ppo_buffer_size: 4, ppo_epochs: 1, 
        max_new_tokens: 48, ppo_target: 0.005,
        top_k: 40, top_p: 0.98, temperature: 0.5, do_sample: true,
      };
      requestPayload = {
        method: "limr", operation: "train", stage: "ppo", 
        model_name_or_path: limrModelNameOrPath,
        output_dir: limrOutputDirectory, // Pass top-level for service
        dataset: limrDataset, // Pass top-level for service
        llama_params: llamaParams,
        data: [], dimensions: []
      };
      apiFunction = apiLlamafactoryRun;
    }

    console.log(`${currentMethod.toUpperCase()} Task Payload:`, requestPayload);

    try {
      const result = await apiFunction(requestPayload);
      console.log(`${currentMethod.toUpperCase()} Task Result:`, result);
      if (result && result.status === 'success') {
        const successMessage = result.message || (result.taskId ? `任务 "${result.taskId}" 已成功提交。` : `${currentMethod.toUpperCase()} 操作成功完成。`);
        toast.success(successMessage);
        setCurrentAssessmentResult(result);
        if (!result.taskId) { // If sync result or no task ID (e.g. direct assessment result)
            setIsResultsModalOpen(true);
            setModalTitle(`${currentMethod.toUpperCase()} 评估/操作结果`);
        }
        // TODO: Add to a task list and start polling if result.taskId exists
      } else {
        toast.error(`${currentMethod.toUpperCase()} 任务失败或结果格式不正确: ${result?.message || JSON.stringify(result)}`);
        setCurrentAssessmentResult(null);
      }
    } catch (error: any) {
      console.error(`Error during ${currentMethod.toUpperCase()} task:`, error);
      toast.error(`${currentMethod.toUpperCase()} API调用失败: ${error.message}`);
    } finally {
      setIsAssessing(false);
      setIsConfigModalOpen(false);
    }
  };
  
  const renderCherryContent = () => (
    <div className={cardClass} style={{ marginTop: '1.5rem', boxShadow: 'none' }}>
      <div className={cardHeaderClass}><h3 className={cardTitleClass}><Gem size={18} className="mr-2 text-primary-dark" /> Cherry 高质量数据筛选</h3><Button size="sm" className="text-xs" onClick={() => openConfigModal('cherry')}><Plus size={14} className="mr-1.5" /> 创建新筛选任务</Button></div>
      <div className={cardBodyClass}>
        <p className="text-sm text-text-secondary-html mb-4">Cherry 方法使用 LLM 评估每个数据样本的质量，并筛选出最优质的子集。</p>
        <div className="space-y-4 mb-6 p-4 border rounded-md bg-slate-50">
            <div className={formGroupClass}><Label htmlFor="cherry-data-file-inline" className={formLabelClass}>筛选数据文件 (路径)</Label><Input id="cherry-data-file-inline" value={cherryDataFile} onChange={(e) => setCherryDataFile(e.target.value)} placeholder="输入数据文件路径" className={formControlBaseClass}/></div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={formGroupClass}><Label htmlFor="cherry-model-path-inline" className={formLabelClass}>评估模型 (路径/名称)</Label><Input id="cherry-model-path-inline" value={cherryModelPath} onChange={(e) => setCherryModelPath(e.target.value)} placeholder="输入模型路径或名称" className={formControlBaseClass}/></div>
                <div className={formGroupClass}><Label htmlFor="cherry-sample-rate-inline" className={formLabelClass}>抽样/保留比例 ({cherrySampleRate * 100}%)</Label><Input type="number" id="cherry-sample-rate-inline" min="0.01" max="1" step="0.01" value={cherrySampleRate} onChange={(e) => setCherrySampleRate(parseFloat(e.target.value))} className={formControlBaseClass}/></div>
            </div>
            <div className="flex justify-end"><Button size="sm" onClick={() => openConfigModal('cherry')} disabled={isAssessing}><Play size={14} className="mr-1.5" /> 配置并开始</Button></div>
        </div>
        <h4 className="text-md font-semibold text-text-primary-html mb-3">历史筛选任务</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><TaskCard title="高质量指令筛选" status="已完成" statusType="success" datasetName="generated_data_20240506.jsonl" date="2024-05-08" progress={100} resultCount="1,240 → 372" duration="23 分钟" onViewResults={() => openResultsModal('cherry', 'task1', { message: "示例历史结果"})} onDownload={() => console.log("Download cherry task1")} /></div>
      </div>
    </div>
  );

  const renderLessContent = () => (
    <div className={cardClass} style={{ marginTop: '1.5rem', boxShadow: 'none' }}>
      <div className={cardHeaderClass}><h3 className={cardTitleClass}><Minimize size={18} className="mr-2 text-primary-dark" /> Less 智能数据去重</h3><Button size="sm" className="text-xs" onClick={() => openConfigModal('less')}><Plus size={14} className="mr-1.5" /> 创建新去重任务</Button></div>
      <div className={cardBodyClass}><p className="text-sm text-text-secondary-html mb-4">Less 方法通过计算数据间的相似性来进行去重，保留信息量更大、冗余度更低的数据子集。</p>
        <div className="space-y-4 mb-6 p-4 border rounded-md bg-slate-50">
            <div className={formGroupClass}><Label htmlFor="less-data-file-inline" className={formLabelClass}>输入数据文件 (路径)</Label><Input id="less-data-file-inline" value={lessDataFile} onChange={(e) => setLessDataFile(e.target.value)} placeholder="例如: /path/to/input_data.jsonl" className={formControlBaseClass}/></div>
            <div className={formGroupClass}><Label htmlFor="less-output-path-inline" className={formLabelClass}>输出文件路径</Label><Input id="less-output-path-inline" value={lessOutputPath} onChange={(e) => setLessOutputPath(e.target.value)} placeholder="例如: /path/to/less_selected_data.jsonl" className={formControlBaseClass}/></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={formGroupClass}><Label htmlFor="less-percentage-inline" className={formLabelClass}>筛选百分比</Label><Input type="number" id="less-percentage-inline" value={lessPercentage} onChange={(e) => setLessPercentage(parseFloat(e.target.value))} step="0.01" min="0" max="1" className={formControlBaseClass}/></div>
                <div className={formGroupClass}><Label htmlFor="less-dims-inline" className={formLabelClass}>嵌入维度 (可选)</Label><Input type="number" id="less-dims-inline" value={lessDims} onChange={(e) => setLessDims(parseInt(e.target.value))} className={formControlBaseClass}/></div>
            </div>
            <div className="flex justify-end"><Button size="sm" onClick={() => openConfigModal('less')} disabled={isAssessing}><Play size={14} className="mr-1.5" /> 配置并开始</Button></div>
        </div>
        <h4 className="text-md font-semibold text-text-primary-html mb-3">历史去重任务</h4>
        <p className="text-sm text-text-secondary-html">Less 历史任务列表待实现。</p>
      </div>
    </div>
  );

  const renderLimrContent = () => (
    <div className={cardClass} style={{ marginTop: '1.5rem', boxShadow: 'none' }}>
      <div className={cardHeaderClass}><h3 className={cardTitleClass}><GitFork size={18} className="mr-2 text-primary-dark" /> LIMR 数据语义对齐</h3><Button size="sm" className="text-xs" onClick={() => openConfigModal('limr')}><Plus size={14} className="mr-1.5" /> 创建新对齐任务</Button></div>
      <div className={cardBodyClass}><p className="text-sm text-text-secondary-html mb-4">LIMR 方法通过 PPO 训练来对齐模型，使其生成更符合特定规则或期望的输出。</p>
        <div className="space-y-4 mb-6 p-4 border rounded-md bg-slate-50">
            <div className={formGroupClass}><Label htmlFor="limr-model-inline" className={formLabelClass}>基础模型 (路径/名称)</Label><Input id="limr-model-inline" value={limrModelNameOrPath} onChange={(e) => setLimrModelNameOrPath(e.target.value)} placeholder="例如: Qwen/Qwen2.5-7B-Instruct" className={formControlBaseClass}/></div>
            <div className={formGroupClass}><Label htmlFor="limr-dataset-inline" className={formLabelClass}>数据集名称/标识</Label><Input id="limr-dataset-inline" value={limrDataset} onChange={(e) => setLimrDataset(e.target.value)} placeholder="例如: math.8k" className={formControlBaseClass}/></div>
            <div className="flex justify-end"><Button size="sm" onClick={() => openConfigModal('limr')} disabled={isAssessing}><Play size={14} className="mr-1.5" /> 配置并开始</Button></div>
        </div>
        <h4 className="text-md font-semibold text-text-primary-html mb-3">历史 LIMR 任务</h4>
        <p className="text-sm text-text-secondary-html">LIMR 历史任务列表待实现。</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <div className={cardHeaderClass}><h2 className="text-xl font-semibold text-text-primary-html flex items-center"><Star size={22} className="mr-3 text-primary-dark" />数据质量评估方法</h2></div>
        <div className={cardBodyClass}>
          <div className="flex items-start p-4 mb-6 rounded-xl bg-info-html/10 text-info-html border border-blue-300"><AlertCircle size={20} className="mr-3 mt-0.5 flex-shrink-0" /><div>Datapresso 提供多种数据质量评估与优化方法，包括 Cherry（筛选）、Less（去重）和LIMR（对齐）。</div></div>
          <Tabs defaultValue="cherry" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 border-b border-gray-200 rounded-none p-0 bg-transparent">
              <TabsTrigger value="cherry" className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary-dark data-[state=active]:text-primary-dark rounded-none text-text-secondary-html hover:text-primary-dark py-3 px-5 font-medium data-[state=active]:bg-transparent">Cherry 数据筛选</TabsTrigger>
              <TabsTrigger value="less" className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary-dark data-[state=active]:text-primary-dark rounded-none text-text-secondary-html hover:text-primary-dark py-3 px-5 font-medium data-[state=active]:bg-transparent">Less 数据去重</TabsTrigger>
              <TabsTrigger value="limr" className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary-dark data-[state=active]:text-primary-dark rounded-none text-text-secondary-html hover:text-primary-dark py-3 px-5 font-medium data-[state=active]:bg-transparent">LIMR 数据对齐</TabsTrigger>
            </TabsList>
            <TabsContent value="cherry">{renderCherryContent()}</TabsContent>
            <TabsContent value="less">{renderLessContent()}</TabsContent>
            <TabsContent value="limr">{renderLimrContent()}</TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Configuration Modal */}
      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{modalTitle}</DialogTitle></DialogHeader>
          <div className="py-4 max-h-[70vh] overflow-y-auto pr-2">
            {currentMethod === 'cherry' && (
              <div className="space-y-3">
                <div className={formGroupClass}><Label htmlFor="cherry-data-file-modal" className={formLabelClass}>数据文件路径</Label><Input id="cherry-data-file-modal" value={cherryDataFile} onChange={(e) => setCherryDataFile(e.target.value)} placeholder="例如: /path/to/data.jsonl" className={formControlBaseClass}/></div>
                <div className={formGroupClass}><Label htmlFor="cherry-model-path-modal" className={formLabelClass}>评估模型 (路径/名称)</Label><Input id="cherry-model-path-modal" value={cherryModelPath} onChange={(e) => setCherryModelPath(e.target.value)} placeholder="例如: /path/to/model or model_name" className={formControlBaseClass}/></div>
                <div className="grid grid-cols-2 gap-3"><div className={formGroupClass}><Label htmlFor="cherry-prompt-modal" className={formLabelClass}>提示模板</Label><Input id="cherry-prompt-modal" value={cherryPrompt} onChange={(e) => setCherryPrompt(e.target.value)} placeholder="例如: alpaca" className={formControlBaseClass}/></div><div className={formGroupClass}><Label htmlFor="cherry-sample-rate-modal" className={formLabelClass}>抽样/保留比例</Label><Input type="number" id="cherry-sample-rate-modal" value={cherrySampleRate} onChange={(e) => setCherrySampleRate(parseFloat(e.target.value))} step="0.01" min="0" max="1" className={formControlBaseClass}/></div></div>
                <div className="grid grid-cols-2 gap-3"><div className={formGroupClass}><Label htmlFor="cherry-max-length-modal" className={formLabelClass}>最大长度</Label><Input type="number" id="cherry-max-length-modal" value={cherryMaxLength} onChange={(e) => setCherryMaxLength(parseInt(e.target.value))} className={formControlBaseClass}/></div><div className={formGroupClass}><Label htmlFor="cherry-kmeans-clusters-modal" className={formLabelClass}>KMeans簇数</Label><Input type="number" id="cherry-kmeans-clusters-modal" value={cherryKmeansClusters} onChange={(e) => setCherryKmeansClusters(parseInt(e.target.value))} className={formControlBaseClass}/></div></div>
                <div className="grid grid-cols-2 gap-3"><div className={formGroupClass}><Label htmlFor="cherry-low-th-modal" className={formLabelClass}>低阈值 (%)</Label><Input type="number" id="cherry-low-th-modal" value={cherryLowTh} onChange={(e) => setCherryLowTh(parseInt(e.target.value))} className={formControlBaseClass}/></div><div className={formGroupClass}><Label htmlFor="cherry-up-th-modal" className={formLabelClass}>高阈值 (%)</Label><Input type="number" id="cherry-up-th-modal" value={cherryUpTh} onChange={(e) => setCherryUpTh(parseInt(e.target.value))} className={formControlBaseClass}/></div></div>
                <div className={formGroupClass}><Label htmlFor="cherry-output-dir-modal" className={formLabelClass}>输出目录</Label><Input id="cherry-output-dir-modal" value={cherryOutputDirectory} onChange={(e) => setCherryOutputDirectory(e.target.value)} placeholder="例如: ./output/cherry_selected" className={formControlBaseClass}/></div>
                <div className={formGroupClass}><Label htmlFor="cherry-criteria-desc-modal" className={formLabelClass}>方法描述/备注</Label><Textarea id="cherry-criteria-desc-modal" value={cherryCriteria} onChange={(e) => setCherryCriteria(e.target.value)} rows={3} className={`${formControlBaseClass} min-h-[60px]`} /></div>
              </div>
            )}
            {currentMethod === 'less' && 
              <div className="space-y-3">
                <div className={formGroupClass}><Label htmlFor="less-data-file-modal" className={formLabelClass}>输入数据文件 (路径)</Label><Input id="less-data-file-modal" value={lessDataFile} onChange={e => setLessDataFile(e.target.value)} placeholder="例如: /path/to/input_data.jsonl" className={formControlBaseClass}/></div>
                <div className={formGroupClass}><Label htmlFor="less-output-path-modal" className={formLabelClass}>筛选后数据输出路径</Label><Input id="less-output-path-modal" value={lessOutputPath} onChange={e => setLessOutputPath(e.target.value)} placeholder="例如: /path/to/less_selected_data.jsonl" className={formControlBaseClass}/></div>
                <div className={formGroupClass}><Label htmlFor="less-model-path-modal" className={formLabelClass}>嵌入模型 (路径/名称)</Label><Input id="less-model-path-modal" value={lessModelPath} onChange={e => setLessModelPath(e.target.value)} placeholder="例如: meta-llama/Meta-Llama-3-8B-Instruct" className={formControlBaseClass}/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={formGroupClass}><Label htmlFor="less-percentage-modal" className={formLabelClass}>筛选百分比</Label><Input type="number" id="less-percentage-modal" value={lessPercentage} onChange={(e) => setLessPercentage(parseFloat(e.target.value))} step="0.01" min="0" max="1" className={formControlBaseClass}/></div>
                  <div className={formGroupClass}><Label htmlFor="less-dims-modal" className={formLabelClass}>嵌入维度</Label><Input type="number" id="less-dims-modal" value={lessDims} onChange={(e) => setLessDims(parseInt(e.target.value))} placeholder="例如: 1024" className={formControlBaseClass}/></div>
                </div>
              </div>
            }
            {currentMethod === 'limr' && 
              <div className="space-y-3">
                <div className={formGroupClass}><Label htmlFor="limr-model-modal" className={formLabelClass}>基础模型 (路径/名称)</Label><Input id="limr-model-modal" value={limrModelNameOrPath} onChange={e => setLimrModelNameOrPath(e.target.value)} className={formControlBaseClass}/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={formGroupClass}><Label htmlFor="limr-dataset-modal" className={formLabelClass}>数据集名称/标识</Label><Input id="limr-dataset-modal" value={limrDataset} onChange={e => setLimrDataset(e.target.value)} className={formControlBaseClass}/></div>
                  <div className={formGroupClass}><Label htmlFor="limr-datasetdir-modal" className={formLabelClass}>数据集目录</Label><Input id="limr-datasetdir-modal" value={limrDatasetDir} onChange={e => setLimrDatasetDir(e.target.value)} className={formControlBaseClass}/></div>
                </div>
                <div className={formGroupClass}><Label htmlFor="limr-template-modal" className={formLabelClass}>模板</Label><Input id="limr-template-modal" value={limrTemplate} onChange={e => setLimrTemplate(e.target.value)} className={formControlBaseClass}/></div>
                <div className={formGroupClass}><Label htmlFor="limr-outputdir-modal" className={formLabelClass}>输出目录</Label><Input id="limr-outputdir-modal" value={limrOutputDirectory} onChange={e => setLimrOutputDirectory(e.target.value)} className={formControlBaseClass}/></div>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="limr-specific-params"><AccordionTrigger>LIMR 特定参数</AccordionTrigger>
                    <AccordionContent className="space-y-2 pt-2">
                      <div className={formGroupClass}><Label htmlFor="limr-gt-dataset-modal" className={formLabelClass}>真实答案数据集路径</Label><Input id="limr-gt-dataset-modal" value={limrGroundTruthDataset} onChange={e => setLimrGroundTruthDataset(e.target.value)} className={formControlBaseClass}/></div>
                      <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="limr-reward-correct-modal" className={formLabelClass}>正确奖励</Label><Input type="number" step="0.1" id="limr-reward-correct-modal" value={limrRewardCorrect} onChange={e => setLimrRewardCorrect(parseFloat(e.target.value))} className={formControlBaseClass}/></div><div><Label htmlFor="limr-reward-incorrect-modal" className={formLabelClass}>错误惩罚</Label><Input type="number" step="0.1" id="limr-reward-incorrect-modal" value={limrRewardIncorrect} onChange={e => setLimrRewardIncorrect(parseFloat(e.target.value))} className={formControlBaseClass}/></div></div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="limr-training-params"><AccordionTrigger>PPO/训练参数 (部分)</AccordionTrigger>
                     <AccordionContent className="space-y-2 pt-2">
                        <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="limr-lr-modal" className={formLabelClass}>学习率</Label><Input id="limr-lr-modal" value={limrLearningRate} onChange={e => setLimrLearningRate(e.target.value)} className={formControlBaseClass}/></div><div><Label htmlFor="limr-epochs-modal" className={formLabelClass}>训练轮数</Label><Input type="number" id="limr-epochs-modal" value={limrNumTrainEpochs} onChange={e => setLimrNumTrainEpochs(parseFloat(e.target.value))} className={formControlBaseClass}/></div></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><Label htmlFor="limr-cutoff-len-modal" className={formLabelClass}>截断长度</Label><Input type="number" id="limr-cutoff-len-modal" value={limrCutoffLen} onChange={e => setLimrCutoffLen(parseInt(e.target.value))} className={formControlBaseClass}/></div>
                            <div><Label htmlFor="limr-lora-rank-modal" className={formLabelClass}>LoRA Rank</Label><Input type="number" id="limr-lora-rank-modal" value={limrLoraRank} onChange={e => setLimrLoraRank(parseInt(e.target.value))} className={formControlBaseClass}/></div>
                        </div>
                     </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            }
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={isAssessing}>取消</Button></DialogClose>
            <Button onClick={handleStartTask} disabled={isAssessing}>
              {isAssessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play size={14} className="mr-1.5" />}
              {currentMethod === 'cherry' ? '开始评估' : (currentMethod === 'less' ? '开始去重' : '开始对齐')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Results Modal */}
       <Dialog open={isResultsModalOpen} onOpenChange={setIsResultsModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{modalTitle}</DialogTitle></DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto text-sm">
            {currentAssessmentResult ? (
              <div className="space-y-3">
                <p><strong>状态:</strong> <span className={currentAssessmentResult.status === 'success' ? 'text-green-600' : 'text-red-600'}>{currentAssessmentResult.message || currentAssessmentResult.status}</span></p>
                {currentAssessmentResult.overallScore !== undefined && (<p><strong>总体评分:</strong> {currentAssessmentResult.overallScore?.toFixed(3)}</p>)}
                {currentAssessmentResult.summary && (<div><h5 className="font-semibold mt-2 mb-1">评估摘要:</h5><pre className="bg-slate-100 p-2 rounded-md text-xs whitespace-pre-wrap">{JSON.stringify(currentAssessmentResult.summary, null, 2)}</pre></div>)}
                {currentAssessmentResult.dimensionScores && Array.isArray(currentAssessmentResult.dimensionScores) && (<div><h5 className="font-semibold mt-2 mb-1">维度评分:</h5><ul className="list-disc pl-5 space-y-1">{currentAssessmentResult.dimensionScores.map((dim: any, idx: number) => (<li key={idx}><strong>{dim.dimension}:</strong> {dim.score?.toFixed(3)}{dim.issues && dim.issues.length > 0 && <span className="text-red-500 ml-2">({dim.issues.length} issues)</span>}</li>))}</ul></div>)}
                {currentAssessmentResult.improvementPriority && Array.isArray(currentAssessmentResult.improvementPriority) && (<div><h5 className="font-semibold mt-2 mb-1">改进优先级:</h5><pre className="bg-slate-100 p-2 rounded-md text-xs whitespace-pre-wrap">{JSON.stringify(currentAssessmentResult.improvementPriority, null, 2)}</pre></div>)}
                {(!currentAssessmentResult.overallScore && !currentAssessmentResult.summary && !currentAssessmentResult.dimensionScores) && (<pre className="bg-slate-100 p-2 rounded-md text-xs whitespace-pre-wrap">{JSON.stringify(currentAssessmentResult, null, 2)}</pre>)}
              </div>
            ) : (<p>没有可展示的评估结果。</p>)}
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">关闭</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DataQualityPage;