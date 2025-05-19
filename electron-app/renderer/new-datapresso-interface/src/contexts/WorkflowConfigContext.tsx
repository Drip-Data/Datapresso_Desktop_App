import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define a basic structure for individual stage configurations
// These should be expanded based on the actual fields in each config panel
interface SeedConfig {
  // Example fields, replace with actual
  seedSource?: string;
  numberOfSeeds?: number;
}

interface GenerationConfig {
  model?: string;
  promptTemplate?: string;
  temperature?: number;
}

interface FilteringConfig {
  filterType?: string;
  threshold?: number;
}

interface AssessmentConfig {
  assessmentModel?: string;
  metrics?: string[];
}

interface TrainingConfig {
  trainingMode?: string;
  epochs?: number;
}

// Define the overall workflow configuration
export interface WorkflowConfig {
  workflowName: string;
  workflowDescription: string;
  seedConfig: SeedConfig;
  generationConfig: GenerationConfig;
  filteringConfig: FilteringConfig;
  assessmentConfig: AssessmentConfig;
  trainingConfig: TrainingConfig;
  // Add other global workflow settings if any
}

// Define the shape of the context
interface WorkflowConfigContextType {
  config: WorkflowConfig;
  setConfig: (config: WorkflowConfig) => void;
  updateWorkflowName: (name: string) => void;
  updateWorkflowDescription: (description: string) => void;
  updateSeedConfig: (seedConfig: Partial<SeedConfig>) => void;
  updateGenerationConfig: (generationConfig: Partial<GenerationConfig>) => void;
  updateFilteringConfig: (filteringConfig: Partial<FilteringConfig>) => void;
  updateAssessmentConfig: (assessmentConfig: Partial<AssessmentConfig>) => void;
  updateTrainingConfig: (trainingConfig: Partial<TrainingConfig>) => void;
  // Function to get the full config, useful for export
  getFullConfig: () => WorkflowConfig; 
}

const defaultWorkflowConfig: WorkflowConfig = {
  workflowName: "我的LIMO流程",
  workflowDescription: "",
  seedConfig: {},
  generationConfig: {},
  filteringConfig: {},
  assessmentConfig: {},
  trainingConfig: {},
};

export const WorkflowConfigContext = createContext<WorkflowConfigContextType | undefined>(undefined);

export const WorkflowConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfigState] = useState<WorkflowConfig>(defaultWorkflowConfig);

  const setConfig = (newConfig: WorkflowConfig) => {
    setConfigState(newConfig);
  };

  const updateWorkflowName = (name: string) => {
    setConfigState(prev => ({ ...prev, workflowName: name }));
  };

  const updateWorkflowDescription = (description: string) => {
    setConfigState(prev => ({ ...prev, workflowDescription: description }));
  };

  const updateSeedConfig = (seedConfigUpdate: Partial<SeedConfig>) => {
    setConfigState(prev => ({ ...prev, seedConfig: { ...prev.seedConfig, ...seedConfigUpdate } }));
  };

  const updateGenerationConfig = (generationConfigUpdate: Partial<GenerationConfig>) => {
    setConfigState(prev => ({ ...prev, generationConfig: { ...prev.generationConfig, ...generationConfigUpdate } }));
  };

  const updateFilteringConfig = (filteringConfigUpdate: Partial<FilteringConfig>) => {
    setConfigState(prev => ({ ...prev, filteringConfig: { ...prev.filteringConfig, ...filteringConfigUpdate } }));
  };

  const updateAssessmentConfig = (assessmentConfigUpdate: Partial<AssessmentConfig>) => {
    setConfigState(prev => ({ ...prev, assessmentConfig: { ...prev.assessmentConfig, ...assessmentConfigUpdate } }));
  };

  const updateTrainingConfig = (trainingConfigUpdate: Partial<TrainingConfig>) => {
    setConfigState(prev => ({ ...prev, trainingConfig: { ...prev.trainingConfig, ...trainingConfigUpdate } }));
  };

  const getFullConfig = () => {
    return config;
  };

  return (
    <WorkflowConfigContext.Provider value={{ 
      config, 
      setConfig,
      updateWorkflowName,
      updateWorkflowDescription,
      updateSeedConfig, 
      updateGenerationConfig, 
      updateFilteringConfig, 
      updateAssessmentConfig, 
      updateTrainingConfig,
      getFullConfig
    }}>
      {children}
    </WorkflowConfigContext.Provider>
  );
};

export const useWorkflowConfig = (): WorkflowConfigContextType => {
  const context = useContext(WorkflowConfigContext);
  if (context === undefined) {
    throw new Error('useWorkflowConfig must be used within a WorkflowConfigProvider');
  }
  return context;
};