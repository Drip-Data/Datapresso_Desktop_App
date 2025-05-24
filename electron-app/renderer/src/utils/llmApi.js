import { api } from './electronBridge';

/**
 * LLM API接口类
 * 提供与LLM相关的各种操作接口
 */
export class LlmApi {
  /**
   * 使用LLM生成文本
   * @param {Object} params - 参数对象
   * @param {string} params.prompt - 提示词
   * @param {string} [params.model="gpt-3.5-turbo"] - 模型名称
   * @param {string} [params.systemMessage] - 系统消息
   * @param {number} [params.temperature=0.7] - 温度
   * @param {number} [params.maxTokens=1000] - 最大生成token数
   * @param {string} [params.provider="openai"] - 提供商
   * @returns {Promise<Object>} - 生成结果
   */
  static async generateText(params) {
    const { 
      prompt, 
      model = 'gpt-3.5-turbo', 
      systemMessage, 
      temperature = 0.7, 
      maxTokens = 1000, 
      provider = 'openai',
      ...otherParams 
    } = params;
    
    // 转换为后端API格式
    const requestData = {
      prompt,
      model,
      system_message: systemMessage,
      temperature,
      max_tokens: maxTokens,
      provider,
      ...otherParams
    };
    
    try {
      return await api.invokeLlm(requestData);
    } catch (error) {
      console.error('Error generating text:', error);
      throw error;
    }
  }
  
  /**
   * 使用多模态LLM生成带图像的文本
   * @param {Object} params - 参数对象
   * @param {string} params.prompt - 文本提示词
   * @param {Array<string>} params.images - 图像列表(URL或Base64)
   * @param {string} [params.model="gpt-4o"] - 模型名称
   * @param {string} [params.systemMessage] - 系统消息
   * @param {string} [params.provider="openai"] - 提供商
   * @returns {Promise<Object>} - 生成结果
   */
  static async generateWithImages(params) {
    const { 
      prompt, 
      images, 
      model = 'gpt-4o', 
      systemMessage, 
      provider = 'openai' 
    } = params;
    
    // 转换为后端API格式
    const requestData = {
      operation: "invoke_with_images",
      prompt,
      images,
      model,
      system_message: systemMessage,
      provider
    };
    
    try {
      return await api.invokeLlm(requestData);
    } catch (error) {
      console.error('Error generating with images:', error);
      throw error;
    }
  }
  
  /**
   * 创建批量处理任务
   * @param {Object} params - 参数对象
   * @param {Array<Object>} params.items - 要处理的数据项列表
   * @param {string} params.promptTemplate - 提示词模板
   * @param {string} params.model - 模型名称
   * @param {string} [params.systemPrompt] - 系统提示词
   * @param {string} [params.provider="openai"] - 提供商
   * @returns {Promise<Object>} - 任务信息
   */
  static async createBatchTask(params) {
    const {
      items,
      promptTemplate,
      model,
      systemPrompt,
      provider = 'openai',
      ...otherParams
    } = params;
    
    // 转换为后端API格式
    const requestData = {
      operation: "batch",
      items,
      prompt_template: promptTemplate,
      model,
      system_prompt: systemPrompt,
      provider,
      ...otherParams
    };
    
    try {
      return await api.invokeLlm(requestData);
    } catch (error) {
      console.error('Error creating batch task:', error);
      throw error;
    }
  }
  
  /**
   * 获取批量任务状态
   * @param {string} taskId - 任务ID
   * @returns {Promise<Object>} - 任务状态
   */
  static async getBatchTaskStatus(taskId) {
    try {
      return await api.getBatchTaskStatus(taskId);
    } catch (error) {
      console.error('Error getting batch task status:', error);
      throw error;
    }
  }
  
  /**
   * 获取所有LLM提供商信息
   * @returns {Promise<Object>} - 提供商信息
   */
  static async getProviders() {
    try {
      return await api.fetchLLMProviders(); // Changed to use the correct function name from electronBridge
    } catch (error) {
      console.error('Error getting LLM providers:', error);
      throw error;
    }
  }
  
  /**
   * 上传图像并转换为Base64格式
   * @param {File} file - 图像文件
   * @returns {Promise<string>} - Base64编码的图像
   */
  static async imageToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // 移除data URL前缀
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }
}

export default LlmApi;
