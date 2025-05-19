import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// SUPPORTED_PROVIDERS is removed as we will use dynamic config
// import { SUPPORTED_PROVIDERS } from '@/config/llmConfig';
import { useLLMConfig } from './LLMConfigContext'; // Assuming it's in the same directory or adjust path

const LOCAL_STORAGE_PREFIX = 'datapresso_';

interface ApiKeysContextType {
  apiKeys: Record<string, string>; // e.g., { openai: "sk-...", anthropic: "..." }
  saveApiKey: (providerId: string, apiKey: string) => void;
  removeApiKey: (providerId: string) => void;
  getApiKey: (providerId: string) => string | null;
  isKeyStored: (providerId: string) => boolean;
}

const ApiKeysContext = createContext<ApiKeysContextType | undefined>(undefined);

export const ApiKeysProvider = ({ children }: { children: ReactNode }) => {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const { providersConfig, loading: llmConfigLoading, error: llmConfigError } = useLLMConfig();

  // Load keys from localStorage on initial mount, dependent on providersConfig
  useEffect(() => {
    if (llmConfigLoading || llmConfigError || !providersConfig) {
      // Wait for LLM config to be loaded successfully
      if (llmConfigError) {
        console.error("ApiKeysContext: Failed to load LLM providers config, cannot load API keys.", llmConfigError);
      }
      return;
    }

    const loadedKeys: Record<string, string> = {};
    Object.keys(providersConfig).forEach(providerId => {
      const providerDetail = providersConfig[providerId];
      // Use has_api_key from the dynamic config
      if (providerDetail && providerDetail.has_api_key) {
        try {
          const storedKey = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${providerId}_api_key`);
          if (storedKey) {
            loadedKeys[providerId] = storedKey;
          }
        } catch (error) {
          console.error(`Error loading API key for ${providerId} from localStorage:`, error);
        }
      }
    });
    setApiKeys(loadedKeys);
  }, [providersConfig, llmConfigLoading, llmConfigError]); // Rerun when providersConfig is available

  const saveApiKey = (providerId: string, apiKey: string) => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${providerId}_api_key`, apiKey);
      setApiKeys(prevKeys => ({ ...prevKeys, [providerId]: apiKey }));
    } catch (error) {
      console.error(`Error saving API key for ${providerId} to localStorage:`, error);
      // Consider a user-facing error, e.g., toast.error("保存API密钥失败，存储可能已满");
    }
  };

  const removeApiKey = (providerId: string) => {
    try {
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${providerId}_api_key`);
      setApiKeys(prevKeys => {
        const newKeys = { ...prevKeys };
        delete newKeys[providerId];
        return newKeys;
      });
    } catch (error) {
      console.error(`Error removing API key for ${providerId} from localStorage:`, error);
      // Consider a user-facing error
    }
  };

  const getApiKey = (providerId: string): string | null => {
    return apiKeys[providerId] || null;
  };

  const isKeyStored = (providerId: string): boolean => {
    return !!apiKeys[providerId];
  };
  
  return (
    <ApiKeysContext.Provider value={{ apiKeys, saveApiKey, removeApiKey, getApiKey, isKeyStored }}>
      {children}
    </ApiKeysContext.Provider>
  );
};

export const useApiKeys = (): ApiKeysContextType => {
  const context = useContext(ApiKeysContext);
  if (context === undefined) {
    throw new Error('useApiKeys must be used within an ApiKeysProvider');
  }
  return context;
};