import React, { useState } from 'react';
import PipelineStageItem, { examplePipelineStages } from './PipelineStageItem';
import { Button } from "@/components/ui/button";
import { AlertCircle, Save, RotateCcw, Star as StarIcon } from 'lucide-react';
import SeedConfigPanel from './SeedConfigPanel';
import GenerationConfigPanel from './GenerationConfigPanel';
import AssessmentConfigPanel from './AssessmentConfigPanel';
import FilteringConfigPanel from './FilteringConfigPanel';
import SavePresetModal from './SavePresetModal'; // Import the modal component


const WorkflowBuilderCard = () => {
  const [stages, setStages] = useState(examplePipelineStages.map(s => ({...s, isEnabled: true, isActive: false, isCompleted: false })));
  const [activeConfigStageId, setActiveConfigStageId] = useState<string | null>(null);
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);

  const handleStageClick = (stageId: string) => {
    setStages(prevStages => 
      prevStages.map(stage => 
        stage.id === stageId ? { ...stage, isActive: !stage.isActive } : { ...stage, isActive: false }
      )
    );
    setActiveConfigStageId(prevId => (prevId === stageId ? null : stageId)); // Toggle panel or switch to new one
     // If a stage is clicked, and it was active, it becomes inactive, so hide panel.
    // If a new stage is clicked, it becomes active, show its panel.
    // If an active stage is clicked again (to deactivate), hide panel.
    const clickedStage = stages.find(s => s.id === stageId);
    if (clickedStage && clickedStage.isActive) { // If it was active and is being deactivated
        setActiveConfigStageId(null);
    } else { // If it was inactive and is being activated, or switching
        setActiveConfigStageId(stageId);
    }
  };

  const handleToggleStage = (stageId: string, isEnabled: boolean) => {
    setStages(prevStages =>
      prevStages.map(stage =>
        stage.id === stageId ? { ...stage, isEnabled, isActive: isEnabled ? stage.isActive : false } : stage
      )
    );
    // If a stage is disabled, and it was the one whose config panel was open, close the panel.
    if (!isEnabled && activeConfigStageId === stageId) {
      setActiveConfigStageId(null);
    }
  };
  
  const cardTitleIconStyle = {
    background: 'linear-gradient(to right, var(--primary-dark, #6941FF), var(--primary-light, #89FFE6))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };

  const handleOpenSavePresetModal = () => setIsSavePresetModalOpen(true);
  const handleSavePreset = (name: string, description: string) => {
    console.log("Saving preset from WorkflowBuilderCard:", { name, description });
    // Actual save logic would go here
    setIsSavePresetModalOpen(false); // Close modal after save
  };


  return (
    <> {/* Using React Fragment to return multiple top-level elements (card + modal) */}
      <div className="bg-bg-card-html rounded-xl shadow-sm-html overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-5 border-b border-black/5 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-text-primary-html flex items-center">
            <span
              className="mr-3 text-2xl bg-gradient-to-r from-primary-dark to-primary-light text-transparent bg-clip-text"
              style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.1))" }}
            >
              &#x2728;
            </span>
            Datapresso数据构建流程
          </h2>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={handleOpenSavePresetModal}>
              <StarIcon size={14} className="mr-1.5" /> 保存为预设
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => console.log("Reset pipeline clicked")}>
              <RotateCcw size={14} className="mr-1.5" /> 重置
            </Button>
            <Button size="sm" className="text-xs bg-gradient-to-r from-primary-dark to-primary-light hover:opacity-90" onClick={() => console.log("Save pipeline config clicked")}>
              <Save size={14} className="mr-1.5" /> 保存流程配置
            </Button>
          </div>
        </div>

        {/* Card Body */}
        {/* Original: padding: 1.5rem; */}
        <div className="p-6">
          {/* Original alert-primary: background-color: rgba(105, 65, 255, 0.1); color: var(--primary-dark); */}
          {/* primary-dark is #6941FF */}
          <div className="flex items-start p-4 mb-6 rounded-xl bg-primary-dark/10 text-primary-dark">
            <AlertCircle size={20} className="mr-3 mt-0.5 flex-shrink-0" /> {/* Adjusted mt for alignment */}
            <div>
              <strong className="font-semibold">LIMO效应：</strong>
              构建小而精的高质量数据集，降低模型微调的算力消耗，同时提升模型性能。通过启用/禁用各阶段并配置所需组件进行定制化。
            </div>
          </div>

          {/* Pipeline Flow */}
          {/* Original: padding: 1.5rem 0.5rem; */}
          <div className="flex overflow-x-auto py-6 px-2 custom-scrollbar"> {/* Adjusted padding */}
            {stages.map((stage, index) => (
              <PipelineStageItem
                key={stage.id}
                stageId={stage.id}
                icon={stage.icon}
                name={stage.name}
                status={stage.status}
                isActive={activeConfigStageId === stage.id && stage.isEnabled} // Only active if enabled
                isCompleted={stage.isCompleted || false}
                isEnabled={stage.isEnabled}
                showLine={index > 0}
                onStageClick={handleStageClick}
                onToggle={handleToggleStage}
              />
            ))}
          </div>
        </div>
        
        {/* Dynamic Stage Configuration Panel */}
        {activeConfigStageId && stages.find(s => s.id === activeConfigStageId && s.isEnabled) && (
          <div className="p-6 border-t border-gray-200 bg-slate-50/50">
            {activeConfigStageId === 'seed' && <SeedConfigPanel />}
            {activeConfigStageId === 'generation' && <GenerationConfigPanel />}
            {activeConfigStageId === 'assessment' && <AssessmentConfigPanel />}
            {activeConfigStageId === 'filtering' && <FilteringConfigPanel />}
            {/* Optional: Fallback if a stageId doesn't match any known panel, though current logic should prevent this if stages array is source of truth */}
            {activeConfigStageId && !['seed', 'generation', 'assessment', 'filtering'].includes(activeConfigStageId) && (
              <div className="mt-6 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">
                  未知配置阶段: {activeConfigStageId}
                </h3>
                <p className="text-sm text-gray-500">没有找到此阶段的配置面板。</p>
              </div>
            )}
          </div>
        )}

        {/*
          Custom scrollbar styles that were here:
          .custom-scrollbar::-webkit-scrollbar { height: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #6366f1; border-radius: 8px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4f46e5; }
          These should be moved to a global CSS file like src/index.css or a component-specific CSS module.
        */}
      </div>

      <SavePresetModal
        isOpen={isSavePresetModalOpen}
        onOpenChange={setIsSavePresetModalOpen}
        onSavePreset={handleSavePreset}
      />
    </>
  );
};

export default WorkflowBuilderCard;