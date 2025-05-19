import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchLLMProviders } from '../utils/apiAdapter'; // 从 apiAdapter 导入

// 后端返回的 Provider 数据结构（基于 LlmApiService.get_providers_info 和 constants.py）
export interface ModelDetail { // Defined ModelDetail interface
  context_window?: number;
  max_output_tokens?: number;
  capabilities?: string[];
  dimensions?: number; // For embedding models
  // Potentially other fields from constants.py's *_MODELS
}

export interface BackendProviderInfo {
  models: Record<string, ModelDetail>; // Used ModelDetail here
  pricing: Record<string, {
    prompt: number;
    completion: number;
    // Potentially other pricing units like prompt_million, completion_million
  }>;
  has_api_key: boolean;
  capabilities: {
    text: boolean;
    images: boolean;
    embeddings: boolean;
    batch: boolean;
    // Potentially other capabilities
  };
}

export interface LLMProvidersConfig {
  [providerId: string]: BackendProviderInfo;
}

interface LLMConfigContextType {
  providersConfig: LLMProvidersConfig | null;
  loading: boolean;
  error: Error | null;
  getProviderDetails: (providerId: string) => BackendProviderInfo | undefined;
  getModelsForProvider: (providerId: string) => Array<{ id: string; details: ModelDetail }> ; // Used ModelDetail here
}

const LLMConfigContext = createContext<LLMConfigContextType | undefined>(undefined);

export const LLMConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [providersConfig, setProvidersConfig] = useState<LLMProvidersConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        setLoading(true);
        const config = await fetchLLMProviders(); // 调用 apiAdapter 中的函数
        setProvidersConfig(config);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch LLM providers config:", err);
        setError(err instanceof Error ? err : new Error('Failed to load LLM config'));
        setProvidersConfig(null); // Set to null or an empty object on error
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, []);

  const getProviderDetails = (providerId: string): BackendProviderInfo | undefined => {
    return providersConfig?.[providerId];
  };

  const getModelsForProvider = (providerId: string): Array<{ id: string; details: ModelDetail }> => { // Used ModelDetail here
    const provider = providersConfig?.[providerId];
    if (provider && provider.models) {
      // Explicitly type the destructuring for clarity, though TS might infer it
      return Object.entries(provider.models).map(([id, details]: [string, ModelDetail]) => ({ id, details }));
    }
    return [];
  };

  return (
    <LLMConfigContext.Provider value={{ providersConfig, loading, error, getProviderDetails, getModelsForProvider }}>
      {children}
    </LLMConfigContext.Provider>
  );
};

export const useLLMConfig = (): LLMConfigContextType => {
  const context = useContext(LLMConfigContext);
  if (context === undefined) {
    throw new Error('useLLMConfig must be used within a LLMConfigProvider');
  }
  return context;
};