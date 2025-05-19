import React, { useState, ChangeEvent, useEffect, useCallback } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, Save, Brain, FileUp, FolderInput, Database, Edit3, Settings2, Wand, Zap } from 'lucide-react';

interface ModelOption { value: string; label: string; }

export interface TrainingConfigPayload {
  configName?: string; // Added configName
  trainingMethod: string;
  trainDataSourceType: string;
  trainCustomDataPath?: string;
  baseModel: string;
  computeResource: string;
  // SFT Params
  sftLearningRate?: string;
  sftNumTrainEpochs?: number;
  sftBatchSize?: number;
  sftGradientAccumulationSteps?: number;
  sftMaxGradNorm?: string;
  sftMaxSamples?: string;
  sftComputeType?: string;
  sftCutoffLen?: number;
  sftValSize?: number;
  sftLrSchedulerType?: string;
  sftLoggingSteps?: number;
  sftSaveSteps?: number;
  sftWarmupSteps?: number;
  sftNeftuneAlpha?: number;
  sftOptim?: string;
  sftPacking?: boolean;
  sftTrainOnPrompt?: boolean;
  sftResizeVocab?: boolean;
  sftUseLora?: boolean;
  sftLoraRank?: number;
  sftLoraAlpha?: number;
  sftLoraDropout?: number;
  sftLoraTargetModules?: string;
  // DPO Params
  dpoLearningRate?: string;
  dpoNumTrainEpochs?: number;
  dpoBatchSize?: number;
  dpoMaxGradNorm?: string;
  dpoMaxSamples?: string;
  dpoComputeType?: string;
  dpoCutoffLen?: number;
  dpoGradientAccumulationSteps?: number;
  dpoValSize?: number;
  dpoLrSchedulerType?: string;
  dpoLoggingSteps?: number;
  dpoSaveSteps?: number;
  dpoWarmupSteps?: number;
  dpoOptim?: string;
  dpoBeta?: number;
  dpoLossType?: string;
  dpoFtx?: number;
  dpoRewardModelPath?: string;
  dpoPreferenceDataset?: string;
  dpoUseLora?: boolean;
  dpoLoraRank?: number;
  dpoLoraAlpha?: number;
  dpoLoraDropout?: number;
  dpoLoraTargetModules?: string;
  // PPO Params
  ppoLearningRate?: string;
  ppoNumTrainEpochs?: number;
  ppoBatchSize?: number;
  ppoGradientAccumulationSteps?: number;
  ppoMaxGradNorm?: string;
  ppoMaxSamples?: string;
  ppoComputeType?: string;
  ppoCutoffLen?: number;
  ppoLrSchedulerType?: string;
  ppoLoggingSteps?: number;
  ppoSaveSteps?: number;
  ppoWarmupSteps?: number;
  ppoOptim?: string;
  ppoScoreNorm?: boolean;
  ppoWhitenRewards?: boolean;
  ppoKlCoeff?: number;
  ppoRewardModelPath?: string; 
  ppoPreferenceDataset?: string; 
  ppoUseLora?: boolean; 
  ppoLoraRank?: number; 
  ppoLoraAlpha?: number; 
  ppoLoraDropout?: number; 
  ppoLoraTargetModules?: string; 
  trainOutputLocationType: string;
  trainCustomOutputPath?: string;
  modelNameSuffix: string;
}

interface TrainingConfigPanelProps {
  onConfigChange: (config: TrainingConfigPayload) => void;
}

const TrainingConfigPanel: React.FC<TrainingConfigPanelProps> = ({ onConfigChange }) => {
  const [trainingMethod, setTrainingMethod] = useState<string>("sft");
  const [trainDataSourceType, setTrainDataSourceType] = useState("default_output");
  const [trainCustomDataPath, setTrainCustomDataPath] = useState("");
  const [configNameState, setConfigNameState] = useState<string>("my_training_config"); // Added state for config name
  const [baseModel, setBaseModel] = useState<string>("meta-llama/Llama-2-7b-hf");
  const [computeResource, setComputeResource] = useState<string>("single_gpu");

  // SFT Params
  const [sftLearningRate, setSftLearningRate] = useState<string>("5e-5");
  const [sftNumTrainEpochs, setSftNumTrainEpochs] = useState<number>(3.0);
  const [sftBatchSize, setSftBatchSize] = useState<number>(8); 
  const [sftGradientAccumulationSteps, setSftGradientAccumulationSteps] = useState<number>(4);
  const [sftMaxGradNorm, setSftMaxGradNorm] = useState<string>("1.0");
  const [sftMaxSamples, setSftMaxSamples] = useState<string>("100000");
  const [sftComputeType, setSftComputeType] = useState<string>("bf16");
  const [sftCutoffLen, setSftCutoffLen] = useState<number>(2048);
  const [sftValSize, setSftValSize] = useState<number>(0);
  const [sftLrSchedulerType, setSftLrSchedulerType] = useState<string>("cosine");
  const [sftLoggingSteps, setSftLoggingSteps] = useState<number>(5);
  const [sftSaveSteps, setSftSaveSteps] = useState<number>(100);
  const [sftWarmupSteps, setSftWarmupSteps] = useState<number>(0);
  const [sftNeftuneAlpha, setSftNeftuneAlpha] = useState<number>(0);
  const [sftOptim, setSftOptim] = useState<string>("adamw_torch");
  const [sftPacking, setSftPacking] = useState<boolean>(false);
  const [sftTrainOnPrompt, setSftTrainOnPrompt] = useState<boolean>(false);
  const [sftResizeVocab, setSftResizeVocab] = useState<boolean>(false);
  const [sftUseLora, setSftUseLora] = useState<boolean>(true);
  const [sftLoraRank, setSftLoraRank] = useState<number>(8);
  const [sftLoraAlpha, setSftLoraAlpha] = useState<number>(16);
  const [sftLoraDropout, setSftLoraDropout] = useState<number>(0.05);
  const [sftLoraTargetModules, setSftLoraTargetModules] = useState<string>("q_proj,v_proj,k_proj,o_proj,gate_proj,up_proj,down_proj");

  // DPO Params
  const [dpoLearningRate, setDpoLearningRate] = useState<string>("1e-6"); 
  const [dpoNumTrainEpochs, setDpoNumTrainEpochs] = useState<number>(1.0); 
  const [dpoBatchSize, setDpoBatchSize] = useState<number>(1); 
  const [dpoMaxGradNorm, setDpoMaxGradNorm] = useState<string>("1.0");
  const [dpoMaxSamples, setDpoMaxSamples] = useState<string>("100000");
  const [dpoComputeType, setDpoComputeType] = useState<string>("bf16");
  const [dpoCutoffLen, setDpoCutoffLen] = useState<number>(1024);
  const [dpoGradientAccumulationSteps, setDpoGradientAccumulationSteps] = useState<number>(4);
  const [dpoValSize, setDpoValSize] = useState<number>(0);
  const [dpoLrSchedulerType, setDpoLrSchedulerType] = useState<string>("cosine");
  const [dpoLoggingSteps, setDpoLoggingSteps] = useState<number>(5);
  const [dpoSaveSteps, setDpoSaveSteps] = useState<number>(100);
  const [dpoWarmupSteps, setDpoWarmupSteps] = useState<number>(0);
  const [dpoOptim, setDpoOptim] = useState<string>("adamw_torch");
  const [dpoBeta, setDpoBeta] = useState<number>(0.1);
  const [dpoLossType, setDpoLossType] = useState("sigmoid"); 
  const [dpoFtx, setDpoFtx] = useState<number>(0); 
  const [dpoRewardModelPath, setDpoRewardModelPath] = useState<string>("");
  const [dpoPreferenceDataset, setDpoPreferenceDataset] = useState<string>("");
  const [dpoUseLora, setDpoUseLora] = useState<boolean>(true);
  const [dpoLoraRank, setDpoLoraRank] = useState<number>(8);
  const [dpoLoraAlpha, setDpoLoraAlpha] = useState<number>(16);
  const [dpoLoraDropout, setDpoLoraDropout] = useState<number>(0.05);
  const [dpoLoraTargetModules, setDpoLoraTargetModules] = useState<string>("q_proj,v_proj");

  // PPO Params
  const [ppoLearningRate, setPpoLearningRate] = useState<string>("1e-5");
  const [ppoNumTrainEpochs, setPpoNumTrainEpochs] = useState<number>(1.0);
  const [ppoBatchSize, setPpoBatchSize] = useState<number>(1);
  const [ppoGradientAccumulationSteps, setPpoGradientAccumulationSteps] = useState<number>(4);
  const [ppoMaxGradNorm, setPpoMaxGradNorm] = useState<string>("1.0");
  const [ppoMaxSamples, setPpoMaxSamples] = useState<string>("100000");
  const [ppoComputeType, setPpoComputeType] = useState<string>("bf16");
  const [ppoCutoffLen, setPpoCutoffLen] = useState<number>(512);
  const [ppoLrSchedulerType, setPpoLrSchedulerType] = useState<string>("cosine");
  const [ppoLoggingSteps, setPpoLoggingSteps] = useState<number>(5);
  const [ppoSaveSteps, setPpoSaveSteps] = useState<number>(100);
  const [ppoWarmupSteps, setPpoWarmupSteps] = useState<number>(0);
  const [ppoOptim, setPpoOptim] = useState<string>("adamw_torch");
  const [ppoScoreNorm, setPpoScoreNorm] = useState<boolean>(true);
  const [ppoWhitenRewards, setPpoWhitenRewards] = useState<boolean>(false);
  const [ppoKlCoeff, setPpoKlCoeff] = useState<number>(0.02);
  const [ppoRewardModelPath, setPpoRewardModelPath] = useState<string>("");
  const [ppoPreferenceDataset, setPpoPreferenceDataset] = useState<string>("");
  const [ppoUseLora, setPpoUseLora] = useState<boolean>(true);
  const [ppoLoraRank, setPpoLoraRank] = useState<number>(8);
  const [ppoLoraAlpha, setPpoLoraAlpha] = useState<number>(16);
  const [ppoLoraDropout, setPpoLoraDropout] = useState<number>(0.05);
  const [ppoLoraTargetModules, setPpoLoraTargetModules] = useState<string>("q_proj,v_proj");

  const [trainOutputLocationType, setTrainOutputLocationType] = useState("default_location");
  const [trainCustomOutputPath, setTrainCustomOutputPath] = useState("./output/trained_models");
  const [modelNameSuffix, setModelNameSuffix] = useState("my_finetuned_model");

  const formSectionClass = "mb-8"; 
  const formSectionTitleClass = "text-md font-bold text-text-primary-html mb-3"; 
  const formGroupClass = "mb-3";
  const formLabelClass = "block mb-1 text-sm font-medium text-text-primary-html";
  const formControlSmClass = "w-full px-3 py-1.5 rounded-md border-gray-300 bg-white text-sm text-text-primary-html placeholder:text-text-light-html focus:border-primary-dark focus:ring-1 focus:ring-primary-dark/50";
  const formHelperTextClass = "text-xs text-gray-500 mt-0.5";

  const getCompiledConfig = useCallback((): TrainingConfigPayload => {
    const config: TrainingConfigPayload = {
      configName: configNameState, // Added configName to payload
      trainingMethod,
      trainDataSourceType,
      trainCustomDataPath: trainDataSourceType === "custom_path" ? trainCustomDataPath : undefined,
      baseModel,
      computeResource,
      trainOutputLocationType,
      trainCustomOutputPath: trainOutputLocationType === "custom_location" ? trainCustomOutputPath : undefined,
      modelNameSuffix,
    };

    if (trainingMethod === "sft") {
      Object.assign(config, {
        sftLearningRate, sftNumTrainEpochs, sftBatchSize, sftGradientAccumulationSteps,
        sftMaxGradNorm, sftMaxSamples, sftComputeType, sftCutoffLen, sftValSize,
        sftLrSchedulerType, sftLoggingSteps, sftSaveSteps, sftWarmupSteps, sftNeftuneAlpha,
        sftOptim, sftPacking, sftTrainOnPrompt, sftResizeVocab, sftUseLora,
        sftLoraRank: sftUseLora ? sftLoraRank : undefined,
        sftLoraAlpha: sftUseLora ? sftLoraAlpha : undefined,
        sftLoraDropout: sftUseLora ? sftLoraDropout : undefined,
        sftLoraTargetModules: sftUseLora ? sftLoraTargetModules : undefined,
      });
    } else if (trainingMethod === "dpo") {
      Object.assign(config, {
        dpoLearningRate, dpoNumTrainEpochs, dpoBatchSize, dpoMaxGradNorm, dpoMaxSamples,
        dpoComputeType, dpoCutoffLen, dpoGradientAccumulationSteps, dpoValSize,
        dpoLrSchedulerType, dpoLoggingSteps, dpoSaveSteps, dpoWarmupSteps, dpoOptim,
        dpoBeta, dpoLossType, dpoFtx, dpoRewardModelPath, dpoPreferenceDataset, dpoUseLora,
        dpoLoraRank: dpoUseLora ? dpoLoraRank : undefined,
        dpoLoraAlpha: dpoUseLora ? dpoLoraAlpha : undefined,
        dpoLoraDropout: dpoUseLora ? dpoLoraDropout : undefined,
        dpoLoraTargetModules: dpoUseLora ? dpoLoraTargetModules : undefined,
      });
    } else if (trainingMethod === "ppo") {
      Object.assign(config, {
        ppoLearningRate, ppoNumTrainEpochs, ppoBatchSize, ppoGradientAccumulationSteps,
        ppoMaxGradNorm, ppoMaxSamples, ppoComputeType, ppoCutoffLen, ppoLrSchedulerType,
        ppoLoggingSteps, ppoSaveSteps, ppoWarmupSteps, ppoOptim, ppoScoreNorm,
        ppoWhitenRewards, ppoKlCoeff, ppoRewardModelPath, ppoPreferenceDataset, ppoUseLora,
        ppoLoraRank: ppoUseLora ? ppoLoraRank : undefined,
        ppoLoraAlpha: ppoUseLora ? ppoLoraAlpha : undefined,
        ppoLoraDropout: ppoUseLora ? ppoLoraDropout : undefined,
        ppoLoraTargetModules: ppoUseLora ? ppoLoraTargetModules : undefined,
      });
    }
    return config;
  }, [
    trainingMethod, trainDataSourceType, trainCustomDataPath, baseModel, computeResource,
    trainOutputLocationType, trainCustomOutputPath, modelNameSuffix,
    // SFT states
    configNameState, // Added configNameState to dependency array
    sftLearningRate, sftNumTrainEpochs, sftBatchSize, sftGradientAccumulationSteps,
    sftMaxGradNorm, sftMaxSamples, sftComputeType, sftCutoffLen, sftValSize,
    sftLrSchedulerType, sftLoggingSteps, sftSaveSteps, sftWarmupSteps, sftNeftuneAlpha,
    sftOptim, sftPacking, sftTrainOnPrompt, sftResizeVocab, sftUseLora,
    sftLoraRank, sftLoraAlpha, sftLoraDropout, sftLoraTargetModules,
    // DPO states
    dpoLearningRate, dpoNumTrainEpochs, dpoBatchSize, dpoMaxGradNorm, dpoMaxSamples,
    dpoComputeType, dpoCutoffLen, dpoGradientAccumulationSteps, dpoValSize,
    dpoLrSchedulerType, dpoLoggingSteps, dpoSaveSteps, dpoWarmupSteps, dpoOptim,
    dpoBeta, dpoLossType, dpoFtx, dpoRewardModelPath, dpoPreferenceDataset, dpoUseLora,
    dpoLoraRank, dpoLoraAlpha, dpoLoraDropout, dpoLoraTargetModules,
    // PPO states
    ppoLearningRate, ppoNumTrainEpochs, ppoBatchSize, ppoGradientAccumulationSteps,
    ppoMaxGradNorm, ppoMaxSamples, ppoComputeType, ppoCutoffLen, ppoLrSchedulerType,
    ppoLoggingSteps, ppoSaveSteps, ppoWarmupSteps, ppoOptim, ppoScoreNorm,
    ppoWhitenRewards, ppoKlCoeff, ppoRewardModelPath, ppoPreferenceDataset, ppoUseLora,
    ppoLoraRank, ppoLoraAlpha, ppoLoraDropout, ppoLoraTargetModules,
  ]);

  useEffect(() => {
    onConfigChange(getCompiledConfig());
  }, [getCompiledConfig, onConfigChange]);

  const handleSave = () => { 
    const config = getCompiledConfig();
    console.log("Save Training Config Triggered:", config); 
    // Implement actual save logic if needed (e.g., to localStorage or a preset system)
  };
  
  const handleReset = () => {
    setTrainingMethod("sft");
    setTrainDataSourceType("default_output"); setTrainCustomDataPath("");
    setBaseModel("meta-llama/Llama-2-7b-hf");
    setComputeResource("single_gpu");
    // SFT Reset
    setSftLearningRate("5e-5"); setSftNumTrainEpochs(3.0); setSftBatchSize(8); setSftGradientAccumulationSteps(4);
    setSftMaxGradNorm("1.0"); setSftMaxSamples("100000"); setSftComputeType("bf16"); setSftCutoffLen(2048);
    setSftValSize(0); setSftLrSchedulerType("cosine"); setSftLoggingSteps(5); setSftSaveSteps(100);
    setSftWarmupSteps(0); setSftNeftuneAlpha(0); setSftOptim("adamw_torch"); setSftPacking(false);
    setSftTrainOnPrompt(false); setSftResizeVocab(false); setSftUseLora(true); setSftLoraRank(8);
    setSftLoraAlpha(16); setSftLoraDropout(0.05); setSftLoraTargetModules("q_proj,v_proj,k_proj,o_proj,gate_proj,up_proj,down_proj");
    // DPO Reset
    setDpoLearningRate("1e-6"); setDpoNumTrainEpochs(1.0); setDpoBatchSize(1); setDpoMaxGradNorm("1.0");
    setDpoMaxSamples("100000"); setDpoComputeType("bf16"); setDpoCutoffLen(1024); setDpoGradientAccumulationSteps(4);
    setDpoValSize(0); setDpoLrSchedulerType("cosine"); setDpoLoggingSteps(5); setDpoSaveSteps(100); setDpoWarmupSteps(0);
    setDpoOptim("adamw_torch"); setDpoBeta(0.1); setDpoLossType("sigmoid"); setDpoFtx(0);
    setDpoRewardModelPath(""); setDpoPreferenceDataset("");
    setDpoUseLora(true); setDpoLoraRank(8); setDpoLoraAlpha(16); setDpoLoraDropout(0.05); setDpoLoraTargetModules("q_proj,v_proj");
    // PPO Reset
    setPpoLearningRate("1e-5"); setPpoNumTrainEpochs(1.0); setPpoBatchSize(1);
    setPpoGradientAccumulationSteps(4); setPpoMaxGradNorm("1.0"); setPpoMaxSamples("100000");
    setPpoComputeType("bf16"); setPpoCutoffLen(512); setPpoLrSchedulerType("cosine");
    setPpoLoggingSteps(5); setPpoSaveSteps(100); setPpoWarmupSteps(0); setPpoOptim("adamw_torch");
    setPpoScoreNorm(true); setPpoWhitenRewards(false); setPpoKlCoeff(0.02);
    setPpoRewardModelPath(""); setPpoPreferenceDataset("");
    setPpoUseLora(true); setPpoLoraRank(8); setPpoLoraAlpha(16); setPpoLoraDropout(0.05); setPpoLoraTargetModules("q_proj,v_proj");

    setTrainOutputLocationType("default_location"); setTrainCustomOutputPath("./output/trained_models");
    setModelNameSuffix("my_finetuned_model");
    console.log("Reset Training Config");
  };

  const renderSFTParams = () => ( <div className="space-y-3 p-3 border rounded-md bg-slate-50/70"><h5 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1.5">SFT 核心参数</h5><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3"><div><Label htmlFor="sftLr" className={formLabelClass}>学习率</Label><Input id="sftLr" value={sftLearningRate} onChange={e=>setSftLearningRate(e.target.value)} className={formControlSmClass} placeholder="例如: 5e-5"/></div><div><Label htmlFor="sftEpochs" className={formLabelClass}>训练轮数</Label><Input type="number" id="sftEpochs" value={sftNumTrainEpochs} onChange={e=>setSftNumTrainEpochs(parseFloat(e.target.value))} className={formControlSmClass}/></div><div><Label htmlFor="sftBatchSize" className={formLabelClass}>每设备批大小</Label><Input type="number" id="sftBatchSize" value={sftBatchSize} onChange={e=>setSftBatchSize(parseInt(e.target.value))} className={formControlSmClass}/></div><div><Label htmlFor="sftGradAccum" className={formLabelClass}>梯度累积步数</Label><Input type="number" id="sftGradAccum" value={sftGradientAccumulationSteps} onChange={e=>setSftGradientAccumulationSteps(parseInt(e.target.value))} className={formControlSmClass}/></div><div><Label htmlFor="sftCutoff" className={formLabelClass}>截断长度</Label><Input type="number" id="sftCutoff" value={sftCutoffLen} onChange={e=>setSftCutoffLen(parseInt(e.target.value))} className={formControlSmClass}/></div><div><Label htmlFor="sftMaxSamples" className={formLabelClass}>最大样本数</Label><Input id="sftMaxSamples" value={sftMaxSamples} onChange={e=>setSftMaxSamples(e.target.value)} className={formControlSmClass} placeholder="100000"/></div></div><Accordion type="multiple" className="w-full mt-3 space-y-2"><AccordionItem value="sft-lora" className="border rounded-md overflow-hidden"><AccordionTrigger className="text-xs py-2 px-3 font-medium text-gray-600 hover:text-primary-dark bg-slate-100 hover:bg-slate-200 rounded-t-md data-[state=open]:rounded-b-none data-[state=open]:border-b"><div className="flex items-center"><Wand size={14} className="mr-2"/> LoRA 参数</div></AccordionTrigger><AccordionContent className="pt-3 px-3 space-y-3 bg-white"><div className="flex items-center space-x-2"><Checkbox id="sftUseLora" checked={sftUseLora} onCheckedChange={c => setSftUseLora(Boolean(c))} /><Label htmlFor="sftUseLora" className="text-sm font-normal">启用LoRA</Label></div>{sftUseLora && (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3"><div><Label htmlFor="sftLoraRank" className={formLabelClass}>Rank</Label><Input type="number" id="sftLoraRank" value={sftLoraRank} onChange={e=>setSftLoraRank(parseInt(e.target.value))} className={formControlSmClass}/></div><div><Label htmlFor="sftLoraAlpha" className={formLabelClass}>Alpha</Label><Input type="number" id="sftLoraAlpha" value={sftLoraAlpha} onChange={e=>setSftLoraAlpha(parseInt(e.target.value))} className={formControlSmClass}/></div><div><Label htmlFor="sftLoraDropout" className={formLabelClass}>Dropout</Label><Input type="number" step="0.01" id="sftLoraDropout" value={sftLoraDropout} onChange={e=>setSftLoraDropout(parseFloat(e.target.value))} className={formControlSmClass}/></div><div className="col-span-full"><Label htmlFor="sftLoraTarget" className={formLabelClass}>目标模块 (逗号分隔)</Label><Input id="sftLoraTarget" value={sftLoraTargetModules} onChange={e=>setSftLoraTargetModules(e.target.value)} className={formControlSmClass} placeholder="q_proj,v_proj,k_proj,o_proj,gate_proj,up_proj,down_proj"/></div></div>)}</AccordionContent></AccordionItem><AccordionItem value="sft-advanced" className="border rounded-md overflow-hidden"><AccordionTrigger className="text-xs py-2 px-3 font-medium text-gray-600 hover:text-primary-dark bg-slate-100 hover:bg-slate-200 rounded-t-md data-[state=open]:rounded-b-none data-[state=open]:border-b"><div className="flex items-center"><Settings2 size={14} className="mr-2"/> 高级训练参数</div></AccordionTrigger><AccordionContent className="pt-3 px-3 space-y-3 bg-white"><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3"><div><Label htmlFor="sftLoggingSteps" className={formLabelClass}>日志步数</Label><Input type="number" id="sftLoggingSteps" value={sftLoggingSteps} onChange={e=>setSftLoggingSteps(parseInt(e.target.value))} className={formControlSmClass}/></div><div><Label htmlFor="sftSaveSteps" className={formLabelClass}>保存步数</Label><Input type="number" id="sftSaveSteps" value={sftSaveSteps} onChange={e=>setSftSaveSteps(parseInt(e.target.value))} className={formControlSmClass}/></div><div><Label htmlFor="sftWarmupSteps" className={formLabelClass}>Warmup步数</Label><Input type="number" id="sftWarmupSteps" value={sftWarmupSteps} onChange={e=>setSftWarmupSteps(parseInt(e.target.value))} className={formControlSmClass}/></div><div><Label htmlFor="sftOptim" className={formLabelClass}>优化器</Label><Select value={sftOptim} onValueChange={setSftOptim}><SelectTrigger className={formControlSmClass}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="adamw_torch">AdamW (PyTorch)</SelectItem><SelectItem value="adamw_hf">AdamW (HF)</SelectItem><SelectItem value="sgd">SGD</SelectItem><SelectItem value="lion">Lion</SelectItem></SelectContent></Select></div><div><Label htmlFor="sftLrSched" className={formLabelClass}>学习率调度器</Label><Select value={sftLrSchedulerType} onValueChange={setSftLrSchedulerType}><SelectTrigger className={formControlSmClass}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="cosine">Cosine</SelectItem><SelectItem value="linear">Linear</SelectItem><SelectItem value="constant">Constant</SelectItem></SelectContent></Select></div><div><Label htmlFor="sftNeftune" className={formLabelClass}>NEFTune Alpha</Label><Input type="number" step="0.1" id="sftNeftune" value={sftNeftuneAlpha} onChange={e=>setSftNeftuneAlpha(parseFloat(e.target.value))} className={formControlSmClass}/></div><div><Label htmlFor="sftValSize" className={formLabelClass}>验证集比例</Label><Input type="number" step="0.001" id="sftValSize" value={sftValSize} onChange={e=>setSftValSize(parseFloat(e.target.value))} max="1" min="0" className={formControlSmClass}/></div><div><Label htmlFor="sftCompute" className={formLabelClass}>计算类型</Label><Select value={sftComputeType} onValueChange={setSftComputeType}><SelectTrigger className={formControlSmClass}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="bf16">bf16</SelectItem><SelectItem value="fp16">fp16</SelectItem><SelectItem value="fp32">fp32</SelectItem></SelectContent></Select></div></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 pt-2"><div className="flex items-center space-x-2"><Checkbox id="sftPacking" checked={sftPacking} onCheckedChange={c=>setSftPacking(Boolean(c))}/><Label htmlFor="sftPacking" className="text-sm font-normal">启用Packing</Label></div><div className="flex items-center space-x-2"><Checkbox id="sftTrainOnPrompt" checked={sftTrainOnPrompt} onCheckedChange={c=>setSftTrainOnPrompt(Boolean(c))}/><Label htmlFor="sftTrainOnPrompt" className="text-sm font-normal">训练Prompt</Label></div><div className="flex items-center space-x-2"><Checkbox id="sftResizeVocab" checked={sftResizeVocab} onCheckedChange={c=>setSftResizeVocab(Boolean(c))}/><Label htmlFor="sftResizeVocab" className="text-sm font-normal">调整词表大小</Label></div></div></AccordionContent></AccordionItem></Accordion></div>);
  const renderDPOParams = () => ( <div className="space-y-3 p-3 border rounded-md bg-slate-50/70"><h5 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1.5">DPO 核心参数</h5><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3"><div><Label htmlFor="dpoLr" className={formLabelClass}>学习率</Label><Input id="dpoLr" value={dpoLearningRate} onChange={e=>setDpoLearningRate(e.target.value)} className={formControlSmClass} placeholder="例如: 1e-6"/></div><div><Label htmlFor="dpoEpochs" className={formLabelClass}>训练轮数</Label><Input type="number" id="dpoEpochs" value={dpoNumTrainEpochs} onChange={e=>setDpoNumTrainEpochs(parseFloat(e.target.value))} className={formControlSmClass}/></div><div><Label htmlFor="dpoBatchSize" className={formLabelClass}>每设备批大小</Label><Input type="number" id="dpoBatchSize" value={dpoBatchSize} onChange={e=>setDpoBatchSize(parseInt(e.target.value))} className={formControlSmClass}/></div><div><Label htmlFor="dpoBeta" className={formLabelClass}>Beta (DPO)</Label><Input type="number" step="0.01" id="dpoBeta" value={dpoBeta} onChange={e=>setDpoBeta(parseFloat(e.target.value) || 0.0)} className={formControlSmClass}/></div><div><Label htmlFor="dpoLoss" className={formLabelClass}>Loss类型</Label><Select value={dpoLossType} onValueChange={setDpoLossType}><SelectTrigger id="dpoLoss" className={formControlSmClass}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="sigmoid">Sigmoid</SelectItem><SelectItem value="hinge">Hinge</SelectItem><SelectItem value="ipo">IPO</SelectItem><SelectItem value="kto_pair">KTO Pairwise</SelectItem><SelectItem value="orpo">ORPO</SelectItem><SelectItem value="simpo">SimPO</SelectItem></SelectContent></Select></div><div><Label htmlFor="dpoFtx" className={formLabelClass}>FTX (Freeze Ratio)</Label><Input type="number" step="0.01" min="0" max="10" id="dpoFtx" value={dpoFtx} onChange={e=>setDpoFtx(parseFloat(e.target.value) || 0.0)} className={formControlSmClass} title="LlamaFactory pref_ftx"/></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mt-3"><div className={formGroupClass}><Label htmlFor="dpoPreferenceDataset" className={formLabelClass}>偏好数据集</Label><Input id="dpoPreferenceDataset" value={dpoPreferenceDataset} onChange={e=>setDpoPreferenceDataset(e.target.value)} className={formControlSmClass} placeholder="path/to/preference_data.jsonl"/></div><div className={formGroupClass}><Label htmlFor="dpoRewardModel" className={formLabelClass}>奖励模型路径 (ORPO等)</Label><Input id="dpoRewardModel" value={dpoRewardModelPath} onChange={e=>setDpoRewardModelPath(e.target.value)} className={formControlSmClass} placeholder="可选, path/to/reward_model"/></div></div><Accordion type="multiple" className="w-full mt-3 space-y-2"><AccordionItem value="dpo-lora" className="border rounded-md overflow-hidden"><AccordionTrigger className="text-xs py-2 px-3 font-medium text-gray-600 hover:text-primary-dark bg-slate-100 hover:bg-slate-200 rounded-t-md data-[state=open]:rounded-b-none data-[state=open]:border-b"><div className="flex items-center"><Wand size={14} className="mr-2"/> LoRA 参数 (DPO)</div></AccordionTrigger><AccordionContent className="pt-3 px-3 space-y-3 bg-white"><div className="flex items-center space-x-2"><Checkbox id="dpoUseLora" checked={dpoUseLora} onCheckedChange={c => setDpoUseLora(Boolean(c))} /><Label htmlFor="dpoUseLora" className="text-sm font-normal">启用LoRA</Label></div>{dpoUseLora && (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3"><div><Label htmlFor="dpoLoraRank" className={formLabelClass}>Rank</Label><Input type="number" id="dpoLoraRank" value={dpoLoraRank} onChange={e=>setDpoLoraRank(parseInt(e.target.value))} className={formControlSmClass}/></div><div><Label htmlFor="dpoLoraAlpha" className={formLabelClass}>Alpha</Label><Input type="number" id="dpoLoraAlpha" value={dpoLoraAlpha} onChange={e=>setDpoLoraAlpha(parseInt(e.target.value))} className={formControlSmClass}/></div><div><Label htmlFor="dpoLoraDropout" className={formLabelClass}>Dropout</Label><Input type="number" step="0.01" id="dpoLoraDropout" value={dpoLoraDropout} onChange={e=>setDpoLoraDropout(parseFloat(e.target.value))} className={formControlSmClass}/></div><div className="col-span-full"><Label htmlFor="dpoLoraTarget" className={formLabelClass}>目标模块</Label><Input id="dpoLoraTarget" value={dpoLoraTargetModules} onChange={e=>setDpoLoraTargetModules(e.target.value)} className={formControlSmClass} placeholder="q_proj,v_proj"/></div></div>)}</AccordionContent></AccordionItem><AccordionItem value="dpo-advanced" className="border rounded-md overflow-hidden"><AccordionTrigger className="text-xs py-2 px-3 font-medium text-gray-600 hover:text-primary-dark bg-slate-100 hover:bg-slate-200 rounded-t-md data-[state=open]:rounded-b-none data-[state=open]:border-b"><div className="flex items-center"><Settings2 size={14} className="mr-2"/> 高级训练参数 (DPO)</div></AccordionTrigger><AccordionContent className="pt-3 px-3 space-y-3 bg-white"><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3"><div><Label htmlFor="dpoMaxGradNorm" className={formLabelClass}>最大梯度范数</Label><Input id="dpoMaxGradNorm" value={dpoMaxGradNorm} onChange={e=>setDpoMaxGradNorm(e.target.value)} className={formControlSmClass}/></div><div><Label htmlFor="dpoMaxSamples" className={formLabelClass}>最大样本数</Label><Input id="dpoMaxSamples" value={dpoMaxSamples} onChange={e=>setDpoMaxSamples(e.target.value)} className={formControlSmClass}/></div><div><Label htmlFor="dpoCompute" className={formLabelClass}>计算类型</Label><Select value={dpoComputeType} onValueChange={setDpoComputeType}><SelectTrigger className={formControlSmClass}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="bf16">bf16</SelectItem><SelectItem value="fp16">fp16</SelectItem><SelectItem value="fp32">fp32</SelectItem></SelectContent></Select></div><div><Label htmlFor="dpoCutoff" className={formLabelClass}>截断长度</Label><Input type="number" id="dpoCutoff" value={dpoCutoffLen} onChange={e=>setDpoCutoffLen(parseInt(e.target.value))} className={formControlSmClass}/></div><div><Label htmlFor="dpoGradAccum" className={formLabelClass}>梯度累积</Label><Input type="number" id="dpoGradAccum" value={dpoGradientAccumulationSteps} onChange={e=>setDpoGradientAccumulationSteps(parseInt(e.target.value))} className={formControlSmClass}/></div><div><Label htmlFor="dpoValSize" className={formLabelClass}>验证集比例</Label><Input type="number" step="0.001" id="dpoValSize" value={dpoValSize} onChange={e=>setDpoValSize(parseFloat(e.target.value))} max="1" min="0" className={formControlSmClass}/></div><div><Label htmlFor="dpoLrSched" className={formLabelClass}>学习率调度器</Label><Select value={dpoLrSchedulerType} onValueChange={setDpoLrSchedulerType}><SelectTrigger className={formControlSmClass}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="cosine">Cosine</SelectItem><SelectItem value="linear">Linear</SelectItem><SelectItem value="constant">Constant</SelectItem></SelectContent></Select></div><div><Label htmlFor="dpoLoggingSteps" className={formLabelClass}>日志步数</Label><Input type="number" id="dpoLoggingSteps" value={dpoLoggingSteps} onChange={e=>setDpoLoggingSteps(parseInt(e.target.value))} className={formControlSmClass}/></div><div><Label htmlFor="dpoSaveSteps" className={formLabelClass}>保存步数</Label><Input type="number" id="dpoSaveSteps" value={dpoSaveSteps} onChange={e=>setDpoSaveSteps(parseInt(e.target.value))} className={formControlSmClass}/></div><div><Label htmlFor="dpoWarmupSteps" className={formLabelClass}>Warmup步数</Label><Input type="number" id="dpoWarmupSteps" value={dpoWarmupSteps} onChange={e=>setDpoWarmupSteps(parseInt(e.target.value))} className={formControlSmClass}/></div><div><Label htmlFor="dpoOptim" className={formLabelClass}>优化器</Label><Select value={dpoOptim} onValueChange={setDpoOptim}><SelectTrigger className={formControlSmClass}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="adamw_torch">AdamW (PyTorch)</SelectItem></SelectContent></Select></div></div></AccordionContent></AccordionItem></Accordion></div>);
  const renderPPOParams = () => ( <div className="space-y-3 p-3 border rounded-md bg-slate-50/70"><h5 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1.5">PPO 核心参数</h5><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3"><div><Label htmlFor="ppoLr" className={formLabelClass}>学习率 (Actor)</Label><Input id="ppoLr" value={ppoLearningRate} onChange={e=>setPpoLearningRate(e.target.value)} className={formControlSmClass} placeholder="例如: 1e-5"/></div><div><Label htmlFor="ppoEpochs" className={formLabelClass}>PPO 轮数</Label><Input type="number" id="ppoEpochs" value={ppoNumTrainEpochs} onChange={e=>setPpoNumTrainEpochs(parseFloat(e.target.value))} className={formControlSmClass}/></div><div><Label htmlFor="ppoBatchSize" className={formLabelClass}>PPO 批大小</Label><Input type="number" id="ppoBatchSize" value={ppoBatchSize} onChange={e=>setPpoBatchSize(parseInt(e.target.value))} className={formControlSmClass}/></div></div><div className={formGroupClass + " mt-2"}><Label htmlFor="ppoRewardDataset" className={formLabelClass}>PPO 偏好/奖励数据集</Label><Input id="ppoRewardDataset" value={ppoPreferenceDataset} onChange={e=>setPpoPreferenceDataset(e.target.value)} className={formControlSmClass} placeholder="path/to/ppo_preference_data.jsonl"/></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 pt-2"><div className="flex items-center space-x-2"><Checkbox id="ppoScoreNorm" checked={ppoScoreNorm} onCheckedChange={c => setPpoScoreNorm(Boolean(c))} /><Label htmlFor="ppoScoreNorm" className="text-sm font-normal">启用分数归一化</Label></div><div className="flex items-center space-x-2"><Checkbox id="ppoWhitenRewards" checked={ppoWhitenRewards} onCheckedChange={c => setPpoWhitenRewards(Boolean(c))} /><Label htmlFor="ppoWhitenRewards" className="text-sm font-normal">奖励白化</Label></div></div><div className={formGroupClass + " mt-2"}><Label htmlFor="ppoKlCoeff" className={formLabelClass}>KL 系数</Label><Input type="number" step="0.01" id="ppoKlCoeff" value={ppoKlCoeff} onChange={e=>setPpoKlCoeff(parseFloat(e.target.value))} className={formControlSmClass}/></div><Accordion type="multiple" className="w-full mt-3 space-y-2"><AccordionItem value="ppo-lora"><AccordionTrigger className="text-xs py-2 px-3 font-medium text-gray-600 hover:text-primary-dark bg-slate-100 hover:bg-slate-200 rounded-t-md data-[state=open]:rounded-b-none data-[state=open]:border-b"><div className="flex items-center"><Wand size={14} className="mr-2"/>LoRA (PPO Actor/Critic)</div></AccordionTrigger><AccordionContent className="pt-3 px-3 space-y-3 bg-white"><p className={formHelperTextClass}>PPO的LoRA参数将在此处添加。</p></AccordionContent></AccordionItem><AccordionItem value="ppo-advanced"><AccordionTrigger className="text-xs py-2 px-3 font-medium text-gray-600 hover:text-primary-dark bg-slate-100 hover:bg-slate-200 rounded-t-md data-[state=open]:rounded-b-none data-[state=open]:border-b"><div className="flex items-center"><Settings2 size={14} className="mr-2"/>高级训练参数 (PPO)</div></AccordionTrigger><AccordionContent className="pt-3 px-3 space-y-3 bg-white"><p className={formHelperTextClass}>PPO的更多高级参数将在此处添加 (如梯度累积, 优化器, 截断长度等)。</p></AccordionContent></AccordionItem></Accordion></div> );

  return ( <div className="bg-white p-0 rounded-xl shadow-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-text-primary-html flex items-center"><Brain size={20} className="mr-2.5 text-primary-dark" />模型训练配置</h3>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="text-xs px-3 py-1.5 h-auto hover:bg-primary-dark/10 hover:text-primary-dark focus-visible:ring-primary-dark/50" onClick={handleReset}><RotateCcw size={14} className="mr-1.5" />恢复默认</Button>
          <Button size="sm" className="text-xs px-3 py-1.5 h-auto bg-gradient-to-r from-primary-dark to-primary-light hover:opacity-90 hover:brightness-105 transition-all" onClick={handleSave}><Save size={14} className="mr-1.5" />保存配置</Button>
        </div>
      </div>
      <div className="p-5 space-y-6">
        <div className={`${formSectionClass} bg-slate-50 p-4 rounded-lg`}>
          <h4 className={formSectionTitleClass}>训练配置名称</h4>
          <div className={formGroupClass}>
            <Label htmlFor="config-name" className={formLabelClass}>配置名称</Label>
            <Input id="config-name" value={configNameState} onChange={e=>setConfigNameState(e.target.value)} placeholder="例如: sft_llama2_mydata" className={formControlSmClass}/>
            <p className={formHelperTextClass}>为这组训练参数指定一个唯一的名称，将用于保存和引用此配置。</p>
          </div>
        </div>
        <div className="h-px bg-gray-200 my-6"></div>
        <div className={`${formSectionClass} bg-slate-50 p-4 rounded-lg`}><h4 className={formSectionTitleClass}>训练数据来源</h4><RadioGroup value={trainDataSourceType} onValueChange={setTrainDataSourceType} className="space-y-1.5"><div className="flex items-center space-x-2"><RadioGroupItem value="default_output" id="train-ds-default" /><Label htmlFor="train-ds-default" className="text-sm font-normal">使用上游模块默认输出</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="custom_path" id="train-ds-custom" /><Label htmlFor="train-ds-custom" className="text-sm font-normal">指定训练数据集/路径</Label></div></RadioGroup>{trainDataSourceType === "custom_path" && (<div className={`${formGroupClass} mt-2.5`}><Label htmlFor="train-custom-data-path" className={formLabelClass}>自定义数据集路径</Label><div className="flex items-center"><Input type="text" id="train-custom-data-path" value={trainCustomDataPath} onChange={(e) => setTrainCustomDataPath(e.target.value)} placeholder="例如: /path/to/train_data.jsonl" className={formControlSmClass} /><Button variant="outline" size="icon" className="ml-2 h-8 w-8"><FileUp size={16} /></Button></div></div>)}</div>
        <div className="h-px bg-gray-200 my-6"></div>
        <div className={`${formSectionClass} bg-slate-50 p-4 rounded-lg`}><h4 className={formSectionTitleClass}>基础模型与资源</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3"><div><Label htmlFor="base-model" className={formLabelClass}>基础模型</Label><Input id="base-model" value={baseModel} onChange={e=>setBaseModel(e.target.value)} placeholder="例如: meta-llama/Llama-2-7b-hf" className={formControlSmClass}/> </div><div><Label htmlFor="compute-resource" className={formLabelClass}>计算资源</Label><Select value={computeResource} onValueChange={setComputeResource}><SelectTrigger id="compute-resource" className={formControlSmClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="single_gpu">单GPU</SelectItem><SelectItem value="multi_gpu_2">多GPU (2)</SelectItem><SelectItem value="distributed">分布式训练</SelectItem></SelectContent></Select></div></div></div>
        <div className="h-px bg-gray-200 my-6"></div>
        <div className={`${formSectionClass} p-4 rounded-lg`}><h4 className={formSectionTitleClass}>微调方法与参数</h4><div className={formGroupClass}><Label htmlFor="training-method" className={formLabelClass}>选择微调方法</Label><Select value={trainingMethod} onValueChange={setTrainingMethod}><SelectTrigger id="training-method" className={formControlSmClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sft">SFT (监督微调)</SelectItem><SelectItem value="dpo">DPO (直接偏好优化)</SelectItem><SelectItem value="ppo">PPO (近端策略优化)</SelectItem></SelectContent></Select></div>{trainingMethod === "sft" && renderSFTParams()}{trainingMethod === "dpo" && renderDPOParams()}{trainingMethod === "ppo" && renderPPOParams()}</div>
        <div className="h-px bg-gray-200 my-6"></div>
        <div className={`${formSectionClass} bg-slate-50 p-4 rounded-lg`}><h4 className={formSectionTitleClass}>输出设置</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3"><div className={formGroupClass}><Label className={formLabelClass}>模型输出位置</Label><RadioGroup value={trainOutputLocationType} onValueChange={setTrainOutputLocationType} className="space-y-1.5"><div className="flex items-center space-x-2"><RadioGroupItem value="default_location" id="train-out-default" /><Label htmlFor="train-out-default" className="text-sm font-normal">使用默认输出路径</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="custom_location" id="train-out-custom" /><Label htmlFor="train-out-custom" className="text-sm font-normal">自定义输出路径</Label></div></RadioGroup>{trainOutputLocationType === "custom_location" && (<div className="mt-2.5 flex items-center"><Input type="text" id="train-custom-outputdir" value={trainCustomOutputPath} onChange={(e) => setTrainCustomOutputPath(e.target.value)} className={formControlSmClass} placeholder="./output/my_trained_models"/><Button variant="outline" size="icon" className="ml-2 h-8 w-8" title="选择文件夹"><FolderInput size={16} /></Button></div>)}</div><div className={formGroupClass}><Label htmlFor="model-name-suffix" className={formLabelClass}>模型名称/检查点名称</Label><Input id="model-name-suffix" value={modelNameSuffix} onChange={e => setModelNameSuffix(e.target.value)} placeholder="例如: my_sft_model_v1" className={formControlSmClass} /></div></div></div>
      </div>
    </div>);
};

export default TrainingConfigPanel;