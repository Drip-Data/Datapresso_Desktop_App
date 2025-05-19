# OpenAI模型信息
OPENAI_MODELS = {
    "gpt-4o": {
        "context_window": 128000,
        "max_output_tokens": 4096,
        "capabilities": ["text", "vision", "function_calling"],
    },
    "gpt-4o-mini": {
        "context_window": 128000,
        "max_output_tokens": 4096,
        "capabilities": ["text", "vision", "function_calling"],
    },
    "gpt-4-turbo": {
        "context_window": 128000,
        "max_output_tokens": 4096,
        "capabilities": ["text", "vision", "function_calling"],
    },
    "gpt-3.5-turbo": {
        "context_window": 16385,
        "max_output_tokens": 4096,
        "capabilities": ["text"],
    },
    "text-embedding-3-large": {
        "dimensions": 3072,
    },
    "text-embedding-3-small": {
        "dimensions": 1536,
    },
}

# OpenAI价格信息 (美元/1K tokens)
OPENAI_PRICING = {
    "gpt-4o": {
        "prompt": 0.005,
        "completion": 0.015,
    },
    "gpt-4o-mini": {
        "prompt": 0.0015,
        "completion": 0.0060,
    },
    "gpt-4-turbo": {
        "prompt": 0.01,
        "completion": 0.03,
    },
    "gpt-3.5-turbo": {
        "prompt": 0.0005,
        "completion": 0.0015,
    },
    "text-embedding-3-large": {
        "prompt": 0.00013,
        "completion": 0,
    },
    "text-embedding-3-small": {
        "prompt": 0.00002,
        "completion": 0,
    },
}

# Anthropic模型信息
ANTHROPIC_MODELS = {
    "claude-3-5-sonnet-20241022": {
        "context_window": 200000,
        "max_output_tokens": 4096,
        "capabilities": ["text", "vision"],
    },
    "claude-3-opus-20240229": {
        "context_window": 200000,
        "max_output_tokens": 4096,
        "capabilities": ["text", "vision"],
    },
    "claude-3-sonnet-20240229": {
        "context_window": 200000,
        "max_output_tokens": 4096,
        "capabilities": ["text", "vision"],
    },
    "claude-3-haiku-20240307": {
        "context_window": 200000,
        "max_output_tokens": 4096,
        "capabilities": ["text", "vision"],
    },
    "claude-3-7-sonnet-20250219": {
        "context_window": 200000,
        "max_output_tokens": 16000,
        "capabilities": ["text", "vision", "thinking"],
    },
}

# Anthropic价格信息 (美元/1K tokens)
ANTHROPIC_PRICING = {
    "claude-3-5-sonnet-20241022": {
        "prompt": 0.003,
        "completion": 0.015,
    },
    "claude-3-opus-20240229": {
        "prompt": 0.015,
        "completion": 0.075,
    },
    "claude-3-sonnet-20240229": {
        "prompt": 0.003,
        "completion": 0.015,
    },
    "claude-3-haiku-20240307": {
        "prompt": 0.00025,
        "completion": 0.00125,
    },
    "claude-3-7-sonnet-20250219": {
        "prompt": 0.003,
        "completion": 0.015,
    },
}

# Gemini模型信息
GEMINI_MODELS = {
    "gemini-1.5-flash-001": {
        "context_window": 1000000,
        "max_output_tokens": 8192,
        "capabilities": ["text", "vision", "function_calling"],
    },
    "gemini-1.5-pro-001": {
        "context_window": 1000000,
        "max_output_tokens": 8192,
        "capabilities": ["text", "vision", "function_calling"],
    },
    "gemini-1.0-pro": {
        "context_window": 32000,
        "max_output_tokens": 8192,
        "capabilities": ["text", "vision"],
    },
    "gemini-1.0-pro-vision": {
        "context_window": 16000,
        "max_output_tokens": 4096,
        "capabilities": ["text", "vision"],
    },
}

# Gemini价格信息 (美元/1K tokens)
GEMINI_PRICING = {
    "gemini-1.5-flash-001": {
        "prompt": 0.00035,
        "completion": 0.00105,
    },
    "gemini-1.5-pro-001": {
        "prompt": 0.0007,
        "completion": 0.0021,
    },
    "gemini-1.0-pro": {
        "prompt": 0.0001,
        "completion": 0.0003,
    },
    "gemini-1.0-pro-vision": {
        "prompt": 0.0001,
        "completion": 0.0003,
    },
}

# DeepSeek模型信息
DEEPSEEK_MODELS = {
    "deepseek-chat": {
        "context_window": 8192,
        "max_output_tokens": 4096,
        "capabilities": ["text"],
    },
    "deepseek-coder": {
        "context_window": 8192,
        "max_output_tokens": 4096,
        "capabilities": ["text", "code"],
    },
    "deepseek-embeddings": {
        "dimensions": 1536,
    },
}

# DeepSeek价格信息 (美元/1K tokens)
DEEPSEEK_PRICING = {
    "deepseek-chat": {
        "prompt": 0.0005,
        "completion": 0.0015,
    },
    "deepseek-coder": {
        "prompt": 0.0005,
        "completion": 0.0015,
    },
    "deepseek-embeddings": {
        "prompt": 0.00002,
        "completion": 0,
    },
}
