import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, CheckSquare, PlayCircle, UploadCloud, DownloadCloud } from 'lucide-react';
import * as yaml from 'js-yaml';
import { useWorkflowConfig, WorkflowConfig } from '@/contexts/WorkflowConfigContext';
import { useProject } from '@/contexts/ProjectContext'; // Import useProject
import { toast } from 'sonner';

interface WorkflowActionsCardProps {
  onSwitchToExecuteTab: () => void;
}

const WorkflowActionsCard: React.FC<WorkflowActionsCardProps> = ({
  onSwitchToExecuteTab,
}) => {
  const {
    config,
    setConfig,
    updateWorkflowName,
    updateWorkflowDescription,
    getFullConfig
  } = useWorkflowConfig();
  const { projectDirHandle, saveProjectConfigToHandle: saveConfigToProject } = useProject(); // Get project context
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCheckConfig = () => {
    const currentFullConfig = getFullConfig();
    console.log("Checking config for workflow:", currentFullConfig.workflowName, currentFullConfig.workflowDescription);
    console.log("Full current config:", currentFullConfig);
    // TODO: Implement actual config check logic using currentFullConfig
    alert("流程配置检查中... (详情见控制台)");
  };

  const handleSaveConfig = async () => {
    if (projectDirHandle) {
      // If a project directory is open, save to project's config.yaml
      await saveConfigToProject(); // This function is now from ProjectContext
                                 // and internally uses getFullConfig from WorkflowConfigContext
    } else {
      // Fallback: If no project directory is open, trigger download
      const currentFullConfig = getFullConfig();
      console.log("Exporting config (download fallback):", currentFullConfig);
      try {
        const yamlString = yaml.dump(currentFullConfig);
        const blob = new Blob([yamlString], { type: 'text/yaml;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${currentFullConfig.workflowName || 'datapresso-workflow'}.yaml`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`流程 "${currentFullConfig.workflowName}" 配置已导出为YAML文件供下载。`);
      } catch (error) {
        console.error("Error exporting YAML (download fallback):", error);
        toast.error("导出YAML配置失败，请检查控制台获取更多信息。");
      }
    }
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        try {
          const importedConfig = yaml.load(text) as WorkflowConfig; // Type assertion
          if (importedConfig && typeof importedConfig === 'object') {
            // Validate if importedConfig has the expected structure, though WorkflowConfig type helps
            if (importedConfig.workflowName !== undefined &&
                importedConfig.workflowDescription !== undefined &&
                importedConfig.seedConfig && // etc. for all required parts
                importedConfig.generationConfig
                /* add checks for other configs */
               ) {
              setConfig(importedConfig); // Use setConfig from context to update the whole config
              alert("配置已成功导入并应用!");
            } else {
               throw new Error("导入的YAML文件缺少必要的配置字段或结构不正确。");
            }
          } else {
            throw new Error("无效的YAML结构或空文件。");
          }
        } catch (error) {
          console.error("Error importing YAML:", error);
          alert(`导入YAML配置失败: ${(error as Error).message}. 请检查控制台获取更多信息。`);
        }
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Removed original navigateToExecution, will call onSwitchToExecuteTab directly
  
  const formGroupClass = "mb-4"; // Slightly less margin than config panels
  const formLabelClass = "block mb-1.5 text-sm font-medium text-text-primary-html";
  const formControlBaseClass = "w-full px-4 py-2.5 rounded-xl border-gray-300 bg-white text-[0.9375rem] text-text-primary-html placeholder:text-text-light-html focus:border-primary-dark focus:ring-2 focus:ring-primary-dark/30";


  return (
    // Original card: bg-white, rounded-xl, shadow-md (shadow-md-html from config)
    <div className="bg-bg-card-html rounded-xl shadow-md-html mt-6"> {/* Added mt-6 for spacing from card above */}
      {/* Card Header */}
      <div className="px-6 py-5 border-b border-black/5">
        <h2 className="text-xl font-semibold text-text-primary-html flex items-center">
          <Save size={22} className="mr-3 text-primary-dark" /> {/* Using Save icon */}
          保存与应用
        </h2>
      </div>

      {/* Card Body */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6"> {/* Using grid for form-row behavior */}
          <div className={formGroupClass}>
            <Label htmlFor="workflow-name" className={formLabelClass}>流程名称</Label>
            <Input
              type="text"
              id="workflow-name"
              value={config.workflowName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateWorkflowName(e.target.value)}
              className={formControlBaseClass}
            />
          </div>
          <div className={formGroupClass}>
            <Label htmlFor="workflow-description" className={formLabelClass}>描述</Label>
            <Input
              type="text"
              id="workflow-description"
              value={config.workflowDescription}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateWorkflowDescription(e.target.value)}
              placeholder="可选描述..."
              className={formControlBaseClass}
            />
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".yaml,.yml"
            style={{ display: 'none' }}
          />
          <Button variant="outline" onClick={handleImportClick}>
            <UploadCloud size={16} className="mr-2" /> 导入配置
          </Button>
          <Button variant="outline" onClick={handleSaveConfig}>
            <DownloadCloud size={16} className="mr-2" /> 导出配置
          </Button>
          <Button variant="outline" onClick={handleCheckConfig}>
            <CheckSquare size={16} className="mr-2" /> 检查配置
          </Button>
          {/* Original Save button is now effectively "Export" - keeping for consistency if needed, or remove if "Export" is sufficient */}
          {/* <Button variant="default" className="bg-gradient-to-r from-primary-dark to-primary-light hover:opacity-90" onClick={handleSaveConfig}>
            <Save size={16} className="mr-2" /> 保存配置 (旧)
          </Button> */}
          <Button className="bg-success-html hover:bg-success-html/90 text-white" onClick={onSwitchToExecuteTab}>
            <PlayCircle size={16} className="mr-2" /> 进入执行控制
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowActionsCard;