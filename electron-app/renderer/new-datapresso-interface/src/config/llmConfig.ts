// new-datapresso-interface/src/config/llmConfig.ts

// This interface defines frontend-specific display properties for a provider.
// Core provider information (models, capabilities, pricing) will come from the backend.
export interface ProviderDisplayConfig {
  id: string; // Should match the provider ID from the backend
  name: string; // Display name, can also come from backend but can be overridden here
  apiKeyFormatRegex?: RegExp; // Regex for API key format validation (frontend-side hint)
  placeholderForKey?: string; // Placeholder text for API key input
  // requiresApiKey is available from backend's has_api_key
  // Other UI-specific hints or configurations can be added here.
  uiOrder?: number; // Optional: for sorting providers in the UI if backend order isn't preferred
  logoComponent?: string; // Optional: identifier for a custom logo component
}

// This map can store supplementary UI configurations for providers fetched from the backend.
// The keys should be the provider IDs (e.g., 'openai', 'anthropic').
export const PROVIDER_UI_SUPPLEMENTS: Record<string, Partial<ProviderDisplayConfig>> = {
  openai: {
    name: 'OpenAI', // Can override backend name if needed, or just use for consistency
    apiKeyFormatRegex: /^sk-[a-zA-Z0-9]{20}T3BlbkFJ[a-zA-Z0-9]{20}$/,
    placeholderForKey: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    uiOrder: 1,
  },
  anthropic: {
    name: 'Anthropic',
    apiKeyFormatRegex: /^sk-ant-api\d{2}-[a-zA-Z0-9\-_]{90,}$/,
    placeholderForKey: 'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...',
    uiOrder: 2,
  },
  gemini: { // Added Gemini to supplements
    name: 'Google Gemini',
    apiKeyFormatRegex: /^[a-zA-Z0-9\-_]{38,}$/,
    placeholderForKey: '请输入您的 Google AI Studio API Key',
    uiOrder: 3,
  },
  deepseek: {
    name: 'DeepSeek',
    apiKeyFormatRegex: /^[a-zA-Z0-9\-_]{32,}$/, // Example, adjust if known
    placeholderForKey: '请输入 DeepSeek API Key',
    uiOrder: 4,
  },
  local: { // For local models, if backend lists 'local' as a provider
    name: '本地模型',
    placeholderForKey: 'N/A (本地模型通常无需API Key)',
    uiOrder: 5,
  },
  // Add other providers if they need specific UI hints not covered by backend data.
};

// Dynamically create a union type for provider IDs based on the keys of PROVIDER_UI_SUPPLEMENTS
// This ensures that LLMProviderID is always in sync with the defined supplements.
// However, providersConfig from the context might contain more providers fetched from backend.
// So, LLMProviderID might be more accurately defined as string, or a more dynamic type
// if we want strict typing based on backend response.
// For now, let's define it based on known supplemented providers for stricter typing where supplements are used.
export type LLMProviderID = keyof typeof PROVIDER_UI_SUPPLEMENTS;

// The SUPPORTED_PROVIDERS and PREDEFINED_MODELS constants are removed
// as this data will now be fetched dynamically from the backend via LLMConfigContext.

// The getProviderById function is also removed as provider details will be accessed
// via the useLLMConfig hook from LLMConfigContext.