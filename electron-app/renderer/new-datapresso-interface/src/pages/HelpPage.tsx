import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Lightbulb, Settings, DatabaseZap, BrainCircuit, Wand2, SlidersHorizontal, FolderOutput, FileJson2, Cpu, Palette, KeyRound, Users, HelpCircle } from 'lucide-react';

const HelpPage: React.FC = () => {
  const ParamEntry: React.FC<{
    name: string;
    id: string;
    description: string;
    options?: string;
    defaultValue?: string;
    tip?: string;
  }> = ({ name, id, description, options, defaultValue, tip }) => (
    <div className="mb-3 py-2 px-3 border-l-4 border-primary-html/30 bg-slate-50/50 rounded-r-md">
      <h4 className="font-semibold text-sm text-text-primary-html">{name} <code className="text-xs text-primary-dark bg-primary-light/20 px-1 py-0.5 rounded">{id}</code></h4>
      <p className="text-xs text-text-secondary-html mt-0.5 mb-1">{description}</p>
      {options && <p className="text-xs text-text-secondary-html"><strong className="font-medium">可选值/格式:</strong> {options}</p>}
      {defaultValue && <p className="text-xs text-text-secondary-html"><strong className="font-medium">默认值:</strong> {defaultValue}</p>}
      {tip && <p className="text-xs text-amber-700 bg-amber-50 p-1.5 rounded mt-1 flex items-start"><Lightbulb size={14} className="mr-1.5 flex-shrink-0 mt-0.5" /> {tip}</p>}
    </div>
  );

  return (
    <div className="p-4 md:p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center mb-6">
        <HelpCircle size={28} className="mr-3 text-primary-dark" />
        <h1 className="text-2xl font-semibold text-text-primary-html">帮助中心</h1>
      </div>
      <p className="text-text-secondary-html mb-6">
        欢迎来到 DataPresso 帮助中心！这里提供了关于系统中各项配置参数的详细说明，希望能帮助您更好地理解和使用我们的平台。
      </p>

      <Accordion type="multiple" defaultValue={['gen-params', 'train-params']} className="w-full space-y-4">
        {/* 数据生成参数说明 */}
        <AccordionItem value="gen-params" className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <AccordionTrigger className="flex items-center justify-between w-full px-5 py-3 text-md font-semibold text-text-primary-html bg-gray-50 hover:bg-gray-100 data-[state=open]:border-b border-gray-200 rounded-t-lg">
            <div className="flex items-center"><DatabaseZap size={20} className="mr-2.5 text-primary-html" />数据生成参数说明</div>
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-white">
            <Accordion type="multiple" defaultValue={['gen-basic', 'gen-model', 'gen-advanced', 'gen-output']} className="w-full space-y-3">
              <AccordionItem value="gen-source" className="border-none">
                <AccordionTrigger className="text-sm font-medium text-gray-700 hover:text-primary-dark py-2 px-3 bg-slate-100 rounded-md">数据来源 (种子数据)</AccordionTrigger>
                <AccordionContent className="pt-3 px-1">
                  <ParamEntry name="种子数据来源类型" id="genSeedDataSourceType" description="选择用于生成数据的种子来源。" options="'default_upstream' (使用上游种子数据/默认库), 'custom_seed' (自定义种子数据来源)" defaultValue="'default_upstream'" tip="如果选择了“推理链蒸馏”或“基于种子扩展”策略，此选项才可见。"/>
                  <ParamEntry name="自定义种子数据" id="genCustomSeedDataPath" description="当选择“自定义种子数据来源”时，指定种子数据的文件路径或直接粘贴JSON内容。" options="文件路径 (如 /path/to/seeds.jsonl) 或 JSON字符串" defaultValue="''" tip="确保文件路径可访问或JSON格式正确。"/>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="gen-basic" className="border-none">
                <AccordionTrigger className="text-sm font-medium text-gray-700 hover:text-primary-dark py-2 px-3 bg-slate-100 rounded-md">基础配置</AccordionTrigger>
                <AccordionContent className="pt-3 px-1">
                  <ParamEntry name="生成策略" id="genStrategy" description="选择数据生成的核心策略。" options="'reasoning_distillation' (推理链蒸馏 qa → qra), 'seed_expansion' (基于种子扩展 qra → qra), 'topic_guided' (基于主题引导 0 → qra)" defaultValue="'reasoning_distillation'" tip="不同的策略会展现不同的特定配置项。"/>
                  <ParamEntry name="生成数量" id="genCount" description="期望生成的最终数据条目数量。" options="正整数" defaultValue="100" />
                  <ParamEntry name="批次大小" id="batchSize" description="调用大模型API时，每批次处理的输入数量。" options="正整数 (通常1-100)" defaultValue="10" tip="较大的批次大小可以加快处理速度，但需注意API的并发限制和成本。"/>
                </AccordionContent>
              </AccordionItem>
               <AccordionItem value="gen-topic" className="border-none">
                <AccordionTrigger className="text-sm font-medium text-gray-700 hover:text-primary-dark py-2 px-3 bg-slate-100 rounded-md">主题引导配置 (特定)</AccordionTrigger>
                <AccordionContent className="pt-3 px-1">
                   <ParamEntry name="主题描述" id="topicDescription" description="当生成策略为“基于主题引导”时，用于详细描述生成内容的主题、领域、风格等。" options="文本字符串" defaultValue="''" tip="描述越详细、清晰，生成内容的质量和相关性通常越高。此选项仅在“基于主题引导”策略下可见。"/>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="gen-model" className="border-none">
                <AccordionTrigger className="text-sm font-medium text-gray-700 hover:text-primary-dark py-2 px-3 bg-slate-100 rounded-md">模型配置</AccordionTrigger>
                <AccordionContent className="pt-3 px-1">
                  <ParamEntry name="服务商" id="apiProvider" description="选择提供大模型API的服务商。" options="'openai', 'anthropic', 'deepseek', 'local'" defaultValue="'openai'" tip="选择服务商后，下方模型列表会自动更新。"/>
                  <ParamEntry name="模型" id="selectedModel" description="根据选定的服务商选择具体的模型。" options="依赖于服务商" defaultValue="自动选择第一个可用模型" tip="如果服务商下没有可用模型，请检查API密钥或网络连接。"/>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="gen-advanced" className="border-none">
                <AccordionTrigger className="text-sm font-medium text-gray-700 hover:text-primary-dark py-2 px-3 bg-slate-100 rounded-md">高级配置 (LLM参数)</AccordionTrigger>
                <AccordionContent className="pt-3 px-1">
                  <ParamEntry name="温度 (Temperature)" id="temperature" description="控制生成文本的随机性。值越高，输出越随机、越有创意；值越低，输出越确定、越保守。" options="0.0 - 1.0 (通常)" defaultValue="0.7" tip="对于需要精确回答的任务，建议使用较低温度；对于创意写作，可尝试较高温度。"/>
                  <ParamEntry name="Top P" id="topP" description="也称为核心采样。模型在生成下一个词时，会从概率总和达到P的最小词汇集合中进行采样。与温度类似，用于控制生成的多样性。" options="0.0 - 1.0 (通常)" defaultValue="0.9" tip="通常建议只修改温度或Top P中的一个。如果Top P为1.0，则不启用核心采样。"/>
                  <ParamEntry name="频率惩罚 (Frequency Penalty)" id="frequencyPenalty" description="通过对已生成词汇的频率进行惩罚，降低模型重复相同词语或短语的可能性。" options="-2.0 - 2.0 (通常)" defaultValue="0" tip="正值会降低重复性，负值可能会鼓励重复。"/>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="gen-output" className="border-none">
                <AccordionTrigger className="text-sm font-medium text-gray-700 hover:text-primary-dark py-2 px-3 bg-slate-100 rounded-md">输出设置</AccordionTrigger>
                <AccordionContent className="pt-3 px-1">
                  <ParamEntry name="输出位置类型" id="genOutputLocationType" description="选择生成数据的保存位置。" options="'default_location' (使用默认输出路径), 'custom_location' (自定义输出路径)" defaultValue="'default_location'"/>
                  <ParamEntry name="自定义输出路径" id="genCustomOutputPath" description="当选择“自定义输出路径”时，指定数据保存的文件夹路径。" options="有效的文件夹路径" defaultValue="'./output/generated_data'"/>
                  <ParamEntry name="输出格式" id="genOutputFormat" description="选择生成数据的保存格式。" options="'jsonl', 'csv'" defaultValue="'jsonl'"/>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </AccordionContent>
        </AccordionItem>

        {/* 模型训练参数说明 (占位) */}
        <AccordionItem value="train-params" className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <AccordionTrigger className="flex items-center justify-between w-full px-5 py-3 text-md font-semibold text-text-primary-html bg-gray-50 hover:bg-gray-100 data-[state=open]:border-b border-gray-200 rounded-t-lg">
             <div className="flex items-center"><BrainCircuit size={20} className="mr-2.5 text-primary-html" />模型训练参数说明</div>
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-white">
            <Accordion type="multiple" defaultValue={['train-general', 'sft-params', 'dpo-params', 'ppo-params', 'train-output']} className="w-full space-y-3">
              <AccordionItem value="train-general" className="border-none">
                <AccordionTrigger className="text-sm font-medium text-gray-700 hover:text-primary-dark py-2 px-3 bg-slate-100 rounded-md">通用训练配置</AccordionTrigger>
                <AccordionContent className="pt-3 px-1">
                  <ParamEntry name="训练数据来源类型" id="trainDataSourceType" description="选择用于模型训练的数据来源。" options="'default_output' (使用上游模块默认输出), 'custom_path' (指定训练数据集/路径)" defaultValue="'default_output'" />
                  <ParamEntry name="自定义训练数据路径" id="trainCustomDataPath" description="当选择“指定训练数据集/路径”时，提供数据集文件的具体路径。" options="有效的文件路径 (如 /path/to/train_data.jsonl)" defaultValue="''" />
                  <ParamEntry name="基础模型" id="baseModel" description="选择用于微调的基础大语言模型。" options="HuggingFace模型标识符 (如 'meta-llama/Llama-2-7b-hf')" defaultValue="'meta-llama/Llama-2-7b-hf'" />
                  <ParamEntry name="计算资源" id="computeResource" description="选择用于执行训练任务的计算资源配置。" options="'single_gpu', 'multi_gpu_2', 'distributed'" defaultValue="'single_gpu'" />
                  <ParamEntry name="微调方法" id="trainingMethod" description="选择具体的模型微调技术。" options="'sft' (监督微调), 'dpo' (直接偏好优化), 'ppo' (近端策略优化)" defaultValue="'sft'" tip="不同的方法对应下方不同的参数配置区域。"/>
                </AccordionContent>
              </AccordionItem>

              {/* SFT 参数 */}
              <AccordionItem value="sft-params" className="border-none">
                <AccordionTrigger className="text-sm font-medium text-gray-700 hover:text-primary-dark py-2 px-3 bg-slate-100 rounded-md">SFT (监督微调) 参数</AccordionTrigger>
                <AccordionContent className="pt-3 px-1">
                  <ParamEntry name="学习率" id="sftLearningRate" description="SFT阶段的初始学习率。" options="浮点数字符串 (如 '5e-5')" defaultValue="'5e-5'" />
                  <ParamEntry name="训练轮数" id="sftNumTrainEpochs" description="完整遍历训练数据的次数。" options="正浮点数" defaultValue="3.0" />
                  <ParamEntry name="每设备批大小" id="sftBatchSize" description="单个GPU上进行一次前向/后向传播的样本数量。" options="正整数" defaultValue="8" />
                  <ParamEntry name="梯度累积步数" id="sftGradientAccumulationSteps" description="累积多少个批次的梯度后再执行一次参数更新。" options="正整数" defaultValue="4" tip="用于在显存不足时模拟更大的批处理大小 (effective_batch_size = batch_size * num_gpus * grad_accum_steps)。" />
                  <ParamEntry name="最大梯度范数" id="sftMaxGradNorm" description="梯度裁剪的阈值，防止梯度爆炸。" options="正浮点数字符串 (如 '1.0')" defaultValue="'1.0'" />
                  <ParamEntry name="最大样本数" id="sftMaxSamples" description="用于训练的最大样本数量，超过则截断。" options="正整数或 '100000' (表示无限制或非常大的数)" defaultValue="'100000'" />
                  <ParamEntry name="计算类型" id="sftComputeType" description="训练时使用的数值精度。" options="'bf16', 'fp16', 'fp32'" defaultValue="'bf16'" tip="bf16 和 fp16 可以加速训练并减少显存占用，但可能需要兼容的硬件。" />
                  <ParamEntry name="截断长度" id="sftCutoffLen" description="输入序列的最大长度，超过则截断。" options="正整数" defaultValue="2048" />
                  <ParamEntry name="验证集比例" id="sftValSize" description="从训练数据中划分多少比例作为验证集。" options="0.0 - 1.0 之间的小数" defaultValue="0" tip="如果为0，则不使用验证集。"/>
                  <ParamEntry name="学习率调度器" id="sftLrSchedulerType" description="学习率在训练过程中的调整策略。" options="'cosine', 'linear', 'constant'" defaultValue="'cosine'" />
                  <ParamEntry name="日志步数" id="sftLoggingSteps" description="每隔多少步记录一次训练日志。" options="正整数" defaultValue="5" />
                  <ParamEntry name="保存步数" id="sftSaveSteps" description="每隔多少步保存一次模型检查点。" options="正整数" defaultValue="100" />
                  <ParamEntry name="Warmup步数" id="sftWarmupSteps" description="学习率从0线性增加到初始学习率所需的步数。" options="非负整数" defaultValue="0" />
                  <ParamEntry name="NEFTune Alpha" id="sftNeftuneAlpha" description="NEFTune噪声调整参数，用于提升模型性能，0表示不启用。" options="非负浮点数" defaultValue="0" />
                  <ParamEntry name="优化器" id="sftOptim" description="选择用于参数更新的优化算法。" options="'adamw_torch', 'adamw_hf', 'sgd', 'lion'" defaultValue="'adamw_torch'" />
                  <ParamEntry name="启用Packing" id="sftPacking" description="是否将多个短序列打包成一个长序列以提高训练效率。" options="布尔值 (true/false)" defaultValue="false" />
                  <ParamEntry name="训练Prompt" id="sftTrainOnPrompt" description="是否在计算损失时也考虑Prompt部分。" options="布尔值 (true/false)" defaultValue="false" />
                  <ParamEntry name="调整词表大小" id="sftResizeVocab" description="是否根据数据集中的新Token调整模型词表大小。" options="布尔值 (true/false)" defaultValue="false" />
                  <ParamEntry name="启用LoRA" id="sftUseLora" description="是否使用LoRA (Low-Rank Adaptation) 进行高效微调。" options="布尔值 (true/false)" defaultValue="true" />
                  <ParamEntry name="LoRA Rank" id="sftLoraRank" description="LoRA矩阵的秩。" options="正整数 (通常为 4, 8, 16, 32, 64)" defaultValue="8" />
                  <ParamEntry name="LoRA Alpha" id="sftLoraAlpha" description="LoRA缩放因子，通常设为Rank的两倍。" options="正整数" defaultValue="16" />
                  <ParamEntry name="LoRA Dropout" id="sftLoraDropout" description="LoRA层的Dropout概率。" options="0.0 - 1.0 之间的小数" defaultValue="0.05" />
                  <ParamEntry name="LoRA目标模块" id="sftLoraTargetModules" description="应用LoRA的模块名称，逗号分隔。" options="模块名称字符串" defaultValue="'q_proj,v_proj,k_proj,o_proj,gate_proj,up_proj,down_proj'" tip="具体模块名取决于基础模型架构。"/>
                </AccordionContent>
              </AccordionItem>

              {/* DPO 参数 */}
              <AccordionItem value="dpo-params" className="border-none">
                <AccordionTrigger className="text-sm font-medium text-gray-700 hover:text-primary-dark py-2 px-3 bg-slate-100 rounded-md">DPO (直接偏好优化) 参数</AccordionTrigger>
                <AccordionContent className="pt-3 px-1">
                  <ParamEntry name="学习率" id="dpoLearningRate" description="DPO阶段的学习率。" options="浮点数字符串 (如 '1e-6')" defaultValue="'1e-6'" />
                  <ParamEntry name="训练轮数" id="dpoNumTrainEpochs" description="DPO训练的轮数。" options="正浮点数" defaultValue="1.0" />
                  <ParamEntry name="每设备批大小" id="dpoBatchSize" description="DPO训练的批大小。" options="正整数" defaultValue="1" />
                  <ParamEntry name="Beta (DPO)" id="dpoBeta" description="DPO损失函数中的正则化系数，控制与参考模型的偏离程度。" options="正浮点数" defaultValue="0.1" />
                  <ParamEntry name="Loss类型" id="dpoLossType" description="DPO使用的损失函数类型。" options="'sigmoid', 'hinge', 'ipo', 'kto_pair', 'orpo', 'simpo'" defaultValue="'sigmoid'" />
                  <ParamEntry name="FTX (Freeze Ratio)" id="dpoFtx" description="LlamaFactory中的pref_ftx参数，用于冻结部分底层模型参数。" options="0.0 - 10.0 (通常较小)" defaultValue="0" />
                  <ParamEntry name="偏好数据集" id="dpoPreferenceDataset" description="包含chosen和rejected响应对的数据集路径。" options="文件路径" defaultValue="''" />
                  <ParamEntry name="奖励模型路径 (ORPO等)" id="dpoRewardModelPath" description="某些DPO变体 (如ORPO) 可能需要的预训练奖励模型路径。" options="文件/模型路径" defaultValue="''" tip="仅对特定DPO Loss类型需要。"/>
                  {/* DPO LoRA 和高级参数与SFT类似，可复用或单独说明，此处暂略以保持简洁，实际应补充 */}
                   <ParamEntry name="启用LoRA (DPO)" id="dpoUseLora" description="是否为DPO阶段使用LoRA。" options="布尔值 (true/false)" defaultValue="true" />
                  <ParamEntry name="LoRA Rank (DPO)" id="dpoLoraRank" description="DPO LoRA矩阵的秩。" options="正整数" defaultValue="8" />
                  <ParamEntry name="LoRA Alpha (DPO)" id="dpoLoraAlpha" description="DPO LoRA缩放因子。" options="正整数" defaultValue="16" />
                  <ParamEntry name="LoRA Dropout (DPO)" id="dpoLoraDropout" description="DPO LoRA层的Dropout概率。" options="0.0 - 1.0" defaultValue="0.05" />
                  <ParamEntry name="LoRA目标模块 (DPO)" id="dpoLoraTargetModules" description="DPO LoRA应用的目标模块。" options="模块名称字符串" defaultValue="'q_proj,v_proj'" />
                  <ParamEntry name="最大梯度范数 (DPO)" id="dpoMaxGradNorm" description="DPO梯度裁剪阈值。" options="正浮点数字符串" defaultValue="'1.0'" />
                  {/* ... 其他DPO高级参数 ... */}
                </AccordionContent>
              </AccordionItem>

              {/* PPO 参数 */}
              <AccordionItem value="ppo-params" className="border-none">
                <AccordionTrigger className="text-sm font-medium text-gray-700 hover:text-primary-dark py-2 px-3 bg-slate-100 rounded-md">PPO (近端策略优化) 参数</AccordionTrigger>
                <AccordionContent className="pt-3 px-1">
                  <ParamEntry name="学习率 (Actor)" id="ppoLearningRate" description="PPO中Actor网络的学习率。" options="浮点数字符串 (如 '1e-5')" defaultValue="'1e-5'" />
                  <ParamEntry name="PPO 轮数" id="ppoNumTrainEpochs" description="PPO算法的训练轮数。" options="正浮点数" defaultValue="1.0" />
                  <ParamEntry name="PPO 批大小" id="ppoBatchSize" description="PPO算法的批处理大小。" options="正整数" defaultValue="1" />
                  <ParamEntry name="PPO 偏好/奖励数据集" id="ppoPreferenceDataset" description="用于PPO训练的偏好对或包含奖励信号的数据集路径。" options="文件路径" defaultValue="''" />
                  <ParamEntry name="启用分数归一化" id="ppoScoreNorm" description="是否对奖励模型输出的分数进行归一化。" options="布尔值 (true/false)" defaultValue="true" />
                  <ParamEntry name="奖励白化" id="ppoWhitenRewards" description="是否对奖励信号进行白化处理 (标准化)。" options="布尔值 (true/false)" defaultValue="false" />
                  <ParamEntry name="KL 系数" id="ppoKlCoeff" description="PPO损失函数中KL散度项的系数，用于约束策略更新幅度。" options="正浮点数" defaultValue="0.02" />
                  <ParamEntry name="奖励模型路径 (PPO)" id="ppoRewardModelPath" description="PPO训练中使用的预训练奖励模型路径。" options="文件/模型路径" defaultValue="''" />
                  {/* PPO LoRA 和高级参数与SFT类似，可复用或单独说明，此处暂略以保持简洁，实际应补充 */}
                  <ParamEntry name="启用LoRA (PPO)" id="ppoUseLora" description="是否为PPO阶段使用LoRA。" options="布尔值 (true/false)" defaultValue="true" />
                  <ParamEntry name="LoRA Rank (PPO)" id="ppoLoraRank" description="PPO LoRA矩阵的秩。" options="正整数" defaultValue="8" />
                   {/* ... 其他PPO高级参数 ... */}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="train-output" className="border-none">
                <AccordionTrigger className="text-sm font-medium text-gray-700 hover:text-primary-dark py-2 px-3 bg-slate-100 rounded-md">训练输出设置</AccordionTrigger>
                <AccordionContent className="pt-3 px-1">
                  <ParamEntry name="模型输出位置类型" id="trainOutputLocationType" description="选择训练完成的模型及相关文件的保存位置。" options="'default_location' (使用默认输出路径), 'custom_location' (自定义输出路径)" defaultValue="'default_location'"/>
                  <ParamEntry name="自定义输出路径" id="trainCustomOutputPath" description="当选择“自定义输出路径”时，指定模型保存的文件夹路径。" options="有效的文件夹路径" defaultValue="'./output/trained_models'"/>
                  <ParamEntry name="模型名称/检查点名称" id="modelNameSuffix" description="训练完成后模型的名称后缀或检查点的前缀。" options="字符串" defaultValue="'my_finetuned_model'"/>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </AccordionContent>
        </AccordionItem>

        {/* 其他帮助主题 (占位) */}
        <AccordionItem value="system-settings-help" className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <AccordionTrigger className="flex items-center justify-between w-full px-5 py-3 text-md font-semibold text-text-primary-html bg-gray-50 hover:bg-gray-100 data-[state=open]:border-b border-gray-200 rounded-t-lg">
            <div className="flex items-center"><Settings size={20} className="mr-2.5 text-primary-html" />系统设置说明</div>
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-white">
            <p className="text-sm text-text-secondary-html">关于系统通用设置（如主题、语言等）的说明。</p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="api-keys-help" className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <AccordionTrigger className="flex items-center justify-between w-full px-5 py-3 text-md font-semibold text-text-primary-html bg-gray-50 hover:bg-gray-100 data-[state=open]:border-b border-gray-200 rounded-t-lg">
            <div className="flex items-center"><KeyRound size={20} className="mr-2.5 text-primary-html" />API密钥管理说明</div>
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-white">
            <p className="text-sm text-text-secondary-html">如何添加、管理不同大模型服务商的API密钥。</p>
          </AccordionContent>
        </AccordionItem>
         <AccordionItem value="user-management-help" className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <AccordionTrigger className="flex items-center justify-between w-full px-5 py-3 text-md font-semibold text-text-primary-html bg-gray-50 hover:bg-gray-100 data-[state=open]:border-b border-gray-200 rounded-t-lg">
            <div className="flex items-center"><Users size={20} className="mr-2.5 text-primary-html" />用户管理说明</div>
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-white">
            <p className="text-sm text-text-secondary-html">关于用户账户创建、角色分配和权限管理的说明。</p>
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  );
};

export default HelpPage;