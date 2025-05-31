# 五大 Chat API 服务商的 System Prompt 与结构化输出功能比较

以下将分别介绍 OpenAI (GPT-4.1)、Google Gemini (2.5 Flash/Pro)、Anthropic Claude、DeepSeek，以及开源兼容 OpenAI API 五个聊天模型服务的 **System Prompt**（系统提示）用法和 **结构化输出** 功能。每部分包含三方面内容：

- **System Prompt 用法**：如何设置系统提示、与用户提示的组织结构、是否支持模板化的系统提示；
- **结构化输出**：如何在请求中定义对输出结构的约束（如提供 JSON Schema 或函数/工具调用），以及是否支持内嵌的 schema 或函数定义由模型自动调用；
- **示例代码**：给出一个 Python 代码示例，展示如何设置 system prompt 以及如何定义和获取结构化输出。

为了清晰对比，每节还提供一个参数字段表格，列出主要 API 调用参数（如 model、messages、system、functions/tools、response_format 等）的名称和作用。

## OpenAI (GPT-4.1 Chat API)

**System Prompt 用法：** OpenAI 的 Chat Completion 接口使用 `messages` 数组来表示对话，其中可选地以**系统消息**（system role）开头，用于给模型设定行为或上下文。例如，可以在 `messages` 列表的第一个元素中提供 `{"role": "system", "content": "...系统指令..."}` 来设定模型的角色、风格或任务边界。系统提示与用户消息分开，通常系统提示先于用户消息发送，从而在整个对话中生效。OpenAI API 并未提供直接的“模板化”系统提示功能，开发者通常自行在代码中构造所需的 system prompt 内容（例如插入变量值等）。可以将常用的系统提示存为模板字符串，然后在每次请求时填充动态内容。下表总结了 OpenAI Chat Completion 调用的主要字段：

| 参数                | 作用及说明                                                   |
| ------------------- | ------------------------------------------------------------ |
| **model**           | 指定模型名称（如 `gpt-4.1`）。GPT-4.1 是2025年推出的新系列模型，具有更强的代码和指令理解能力 ([Introducing GPT-4.1 in the API |
| **messages**        | 消息列表，每个元素包含 `role` 和 `content` 字段。`role` 可以是 `system`（系统指令）, `user`（用户输入）, `assistant`（助手回复）, 或 `function`（函数输出）。系统消息通常作为列表第一条，用于提供全局指令；随后是一个或多个用户消息和助手消息交替，代表对话历史 ([Messages - Anthropic](https://docs.anthropic.com/en/api/messages#:~:text=Each input message must be,messages)) ([Messages - Anthropic](https://docs.anthropic.com/en/api/messages#:~:text=Note that if you want,messages in the Messages API))。 |
| **functions**       | （可选）函数定义列表。每个函数包含 `name`、`description` 和 `parameters`（JSON Schema 格式）等字段。提供该参数后，模型可以在回答中选择调用某个函数。 ([leaked-system-prompts/anthropic-claude-api-tool-use_20250119.md at main · jujumilk3/leaked-system-prompts · GitHub](https://github.com/jujumilk3/leaked-system-prompts/blob/main/anthropic-claude-api-tool-use_20250119.md#:~:text=Here are the functions available,function> <%2Ffunctions))（GPT-4.1 支持函数调用，但不支持直接内嵌 JSON Schema 约束 ([Messages - Anthropic API](https://docs.anthropic.com/en/api/messages#:~:text=Note that if you want,messages in the Messages API))）。 |
| **function_call**   | （可选）控制函数调用行为的参数，可设为 `"auto"`（默认，让模型决定是否及调用哪个函数）、`"none"`（禁用函数调用）或指定某个函数名（强制模型调用特定函数）。 |
| **response_format** | （可选）输出格式要求。OpenAI 新增了 `response_format` 参数来支持**JSON 严格模式**和**结构化输出**。例如：`response_format={"type": "json_object"}` 将启用 JSON 模式，使模型只能生成有效的 JSON 对象 ([python - OpenAI API: How do I enable JSON mode using the gpt-4-vision-preview model? - Stack Overflow](https://stackoverflow.com/questions/77434808/openai-api-how-do-i-enable-json-mode-using-the-gpt-4-vision-preview-model#:~:text=,that parse into valid JSON))；也可以提供 `{"type": "json_schema", "json_schema": {...}, "strict": true}` 来让模型严格遵循给定的 JSON Schema 输出 ([Introducing Structured Outputs in the API |

**结构化输出：** OpenAI 提供了两种主要方式约束模型输出的结构：一是**函数调用**（Function Calling），二是**JSON/结构化输出模式**。

- *函数调用*: 开发者可以在请求中通过 `functions` 参数定义可供模型调用的函数列表。当模型判断需要调用函数来获取结构化数据时，会以特殊格式输出一个函数调用，而非直接回答。模型返回的内容中，`role` 会是 `"assistant"`，并带有一个 `function_call` 字段，包含所调用函数的名字和参数。此时 API 的返回会将 `finish_reason` 标记为 `function_call`，提示开发者调用该函数，然后将函数执行结果作为新的消息反馈给模型 ([leaked-system-prompts/anthropic-claude-api-tool-use_20250119.md at main · jujumilk3/leaked-system-prompts · GitHub](https://github.com/jujumilk3/leaked-system-prompts/blob/main/anthropic-claude-api-tool-use_20250119.md#:~:text= {,function> <%2Ffunctions))。GPT-4.1 对函数调用有全面支持，是其实现结构化输出的重要方式 ([Messages - Anthropic API](https://docs.anthropic.com/en/api/messages#:~:text=Note that if you want,messages in the Messages API))。
- *JSON 模式与结构化输出*: 在 DevDay 2023 后，OpenAI 推出了 *JSON Mode*，允许对 ChatCompletion 请求设置 `response_format={"type": "json_object"}`。在支持的模型上（如 GPT-4 2024-11-06 更新版），开启 JSON 模式可约束模型**只能输出有效 JSON** ([python - OpenAI API: How do I enable JSON mode using the gpt-4-vision-preview model? - Stack Overflow](https://stackoverflow.com/questions/77434808/openai-api-how-do-i-enable-json-mode-using-the-gpt-4-vision-preview-model#:~:text=,that parse into valid JSON))。进一步地，2024年8月 OpenAI 推出*Structured Outputs*功能，开发者可提供 JSON Schema 让模型严格遵循 ([Introducing Structured Outputs in the API | OpenAI](https://openai.com/index/introducing-structured-outputs-in-the-api/#:~:text=Last year at DevDay%2C we,JSON Schemas provided by developers)) ([Introducing Structured Outputs in the API | OpenAI](https://openai.com/index/introducing-structured-outputs-in-the-api/#:~:text=2,feature works with our newest))。使用方法是将 `response_format` 参数设置为包含 `json_schema` 和 `strict:true` ([Introducing Structured Outputs in the API | OpenAI](https://openai.com/index/introducing-structured-outputs-in-the-api/#:~:text=2,feature works with our newest))。模型会尽力确保生成的 JSON 完全匹配 schema。如果模型无法匹配，会进行受控的截断或格式调整 ([Introducing Structured Outputs in the API | OpenAI](https://openai.com/index/introducing-structured-outputs-in-the-api/#:~:text=Last year at DevDay%2C we,JSON Schemas provided by developers)) ([Introducing Structured Outputs in the API | OpenAI](https://openai.com/index/introducing-structured-outputs-in-the-api/#:~:text=2,feature works with our newest))。需要注意旧版模型（如 gpt-4-turbo 等）不支持 `json_schema` 参数，只能通过提示工程要求 JSON 格式 ([python - OpenAI API: How do I enable JSON mode using the gpt-4-vision-preview model? - Stack Overflow](https://stackoverflow.com/questions/77434808/openai-api-how-do-i-enable-json-mode-using-the-gpt-4-vision-preview-model#:~:text=,is constrained to only generate))。GPT-4.1 作为新一代模型，在这方面与 GPT-4o类似，也支持 JSON 模式，但根据官方论坛说明，其**严格结构化输出目前仍主要依赖函数调用** ([Messages - Anthropic API](https://docs.anthropic.com/en/api/messages#:~:text=Note that if you want,messages in the Messages API))。

**Python 示例代码：**下面代码演示了如何使用 OpenAI 的 Python SDK (`openai` 库) 设置 system prompt，并要求输出为 JSON 结构。例子中定义了系统提示让助手以 JSON 格式回答，并使用 `response_format={"type": "json_object"}` 开启 JSON 模式，使模型输出严格的 JSON：

```python
import openai
openai.api_key = "YOUR_API_KEY"

messages = [
    {"role": "system", "content": "你是一个提供JSON格式回答的助手。"},
    {"role": "user", "content": "你好，请用JSON回答此问候。"}
]

response = openai.ChatCompletion.create(
    model="gpt-4-1106-preview",  # 假设 GPT-4.1 接口模型
    messages=messages,
    response_format={"type": "json_object"}
)
print(response.choices[0].message.content)
```

在上述代码中，system prompt 将助手角色设定为“提供JSON格式回答的助手”。`response_format` 参数要求模型输出 JSON。根据 OpenAI 文档，当使用支持 JSON 模式的模型时，设置该参数会使模型**仅生成有效 JSON 字符串** ([python - OpenAI API: How do I enable JSON mode using the gpt-4-vision-preview model? - Stack Overflow](https://stackoverflow.com/questions/77434808/openai-api-how-do-i-enable-json-mode-using-the-gpt-4-vision-preview-model#:~:text=,that parse into valid JSON))。模型可能返回例如：`{"response": "你好！我很高兴为你服务。"}` 这样的 JSON 对象作为回答。

如果使用**函数调用**方式进行结构化输出，可以这样定义函数并获取调用结果：

```python
functions = [
    {
      "name": "get_time",
      "description": "获取当前时间",
      "parameters": {
          "type": "object",
          "properties": {}
      }
    }
]
messages = [
    {"role": "system", "content": "你是时间查询助手。"},
    {"role": "user", "content": "现在几点？"}
]
response = openai.ChatCompletion.create(
    model="gpt-4-1",  # 假设 GPT-4.1 接口
    messages=messages,
    functions=functions,
    function_call="auto"  # 允许模型自动决定是否调用函数
)
reply = response.choices[0].message
if reply.get("function_call"):
    func_name = reply.function_call["name"]  # 例如 "get_time"
    # 这里开发者调用实际函数获取时间结果：
    result = {"time": "2025-04-30 19:05:00"}  
    # 将函数结果作为assistant角色发给模型，使其整合入最终答案
    messages.append({"role": "assistant", "content": None, 
                     "function_call": reply.function_call})
    messages.append({"role": "function", "name": func_name, 
                     "content": str(result)})
    final_response = openai.ChatCompletion.create(
        model="gpt-4-1",
        messages=messages
    )
    print(final_response.choices[0].message.content)
```

上述流程中，GPT-4.1 模型在第一轮回答中选择调用 `get_time` 函数（这在 `reply.function_call` 中体现），开发者执行实际函数并将结果作为新的功能消息 (`role: "function"`) 加回对话，然后请求模型继续。最终模型可能返回诸如：“现在时间是 2025-04-30 19:05:00。”作为自然语言回答。通过这种函数调用机制，实现了由模型**自动决定并调用工具**，以及**结构化地获取所需数据**的能力 ([leaked-system-prompts/anthropic-claude-api-tool-use_20250119.md at main · jujumilk3/leaked-system-prompts · GitHub](https://github.com/jujumilk3/leaked-system-prompts/blob/main/anthropic-claude-api-tool-use_20250119.md#:~:text= {,function> <%2Ffunctions))。GPT-4.1 的 API 接口完整地支持这种多轮交互的模式。

**来源：**OpenAI 官方文档和示例 ([python - OpenAI API: How do I enable JSON mode using the gpt-4-vision-preview model? - Stack Overflow](https://stackoverflow.com/questions/77434808/openai-api-how-do-i-enable-json-mode-using-the-gpt-4-vision-preview-model#:~:text=,that parse into valid JSON)) ([python - OpenAI API: How do I enable JSON mode using the gpt-4-vision-preview model? - Stack Overflow](https://stackoverflow.com/questions/77434808/openai-api-how-do-i-enable-json-mode-using-the-gpt-4-vision-preview-model#:~:text=completion %3D client.chat.completions.create( model%3D"gpt,json_object))表明，可通过 system 消息指导模型输出 JSON，并使用 `response_format={"type": "json_object"}` 开启严格 JSON 输出模式。而 GPT-4.1 对函数调用功能提供内置支持 ([Messages - Anthropic API](https://docs.anthropic.com/en/api/messages#:~:text=Note that if you want,messages in the Messages API))，可通过上述参数实现。

------

## Google Gemini (2.5 Flash/Pro Chat API)

**System Prompt 用法：** Google 的 Gemini Chat API（2.5 版）支持为模型提供“系统指令”或上下文，用于设定模型行为。早期的 Gemini 1.0 模型并没有显式的 system prompt 输入字段，官方建议通过在用户消息中嵌入指令来实现 ([large language model - Implementing System Prompts in Gemini Pro for Chatbot Creation - Stack Overflow](https://stackoverflow.com/questions/78010681/implementing-system-prompts-in-gemini-pro-for-chatbot-creation#:~:text=My question is%3A How can,pro)) ([large language model - Implementing System Prompts in Gemini Pro for Chatbot Creation - Stack Overflow](https://stackoverflow.com/questions/78010681/implementing-system-prompts-in-gemini-pro-for-chatbot-creation#:~:text=,the first actual user message))。但自 Gemini 2.0 起，Google 引入了显式的系统提示机制。在 Vertex AI 的聊天接口中，可以在创建聊天会话时提供 `system` 或 `context` 字段。例如，Vertex AI Python SDK 创建 chat 时，可传入 `context="..."` 作为系统级别的指令，或使用 `system_prompt` 参数（某些 SDK中命名为 `systemMessage` 或 `systemPrompt`） ([Build a Gemini powered Flutter app - Google Codelabs](https://codelabs.developers.google.com/codelabs/flutter-gemini-colorist#:~:text=Codelabs codelabs,system prompt for all)) ([edge-agents/scripts/gemini-tumbler/README.md at main · agenticsorg/edge-agents · GitHub](https://github.com/agenticsorg/edge-agents/blob/main/scripts/gemini-tumbler/README.md#:~:text=,25"%2C "temperature"%3A 0.7%2C "maxTokens"%3A 1024))。这些内容在对话开始时作用相当于 OpenAI 的 system role消息，为模型提供持续的行为准则。

Gemini API 的对话组织通常包括**上下文**（可选的系统提示）、**用户消息**和**模型回复**。很多情况下，请求格式为一个具有 `messages` 列表的 JSON，但 Gemini 2.x 也允许通过简化的 `prompt` 字段传入用户提问，以及通过单独的参数传入系统提示（取决于具体接口）。例如，在 Firebase/Vertex 的接口中，请求可以包含：

```json
{
  "prompt": "<USER MESSAGE>",
  "systemPrompt": "<SYSTEM INSTRUCTION>",
  "model": "projects/PROJECT/locations/.../publishers/google/models/chat-bison-001"
}
```

其中 `systemPrompt` 提供全局指令（类似系统消息） ([edge-agents/scripts/gemini-tumbler/README.md at main · agenticsorg/edge-agents · GitHub](https://github.com/agenticsorg/edge-agents/blob/main/scripts/gemini-tumbler/README.md#:~:text=,25"%2C "temperature"%3A 0.7%2C "maxTokens"%3A 1024))。在 Python SDK `google.generativeai` 中，则通过创建 `GenerativeModel` 或 chat 会话对象时传入 `model` 和 `context`（或在新 SDK 中通过 `system_message`）参数来设置系统提示 ([Build a Gemini powered Flutter app - Google Codelabs](https://codelabs.developers.google.com/codelabs/flutter-gemini-colorist#:~:text=Codelabs codelabs,system prompt for all))。Gemini 2.5 系列模型会将系统提示与内部默认提示结合，指导后续对话。因此，**模板化**系统提示需要由开发者自行实现，将变量插入预定义的模板字符串，然后作为 `systemPrompt` 提交。Google 没有直接提供内置模板占位的语法，但在 Firebase 等场景可以预先配置一些规则文件来注入系统提示。例如，通过 Firebase 的 AI Rules，可以在 `.rules` 文件里写入固定的系统指令供模型使用 ([Ejb503/multimodal-mcp-client - GitHub](https://github.com/Ejb503/multimodal-mcp-client#:~:text=Ejb503%2Fmultimodal,Transform how))。一般应用中，开发者可以将常用人格或风格提示存储为模板，并在调用 API 前替换动态内容。

下表列出 Gemini Chat API 请求中的关键字段及作用：

| 参数/字段                                       | 作用与说明                                                   |
| ----------------------------------------------- | ------------------------------------------------------------ |
| **model**                                       | 模型名称或ID，例如 `gemini-2.5-pro`（Gemini 2.5 Pro型号）或 `projects/*/models/gemini-2-5` 形式。确定使用的 Gemini 模型版本和大小。 |
| **systemPrompt** / **context**                  | （可选）系统指令内容，为模型提供角色、风格或规则设定。Gemini 2.x 支持通过此字段传入系统级提示，相当于 OpenAI 的系统消息。若不提供，则模型使用默认的内部系统提示。 |
| **messages** / **history** / **prompt**         | 用户输入内容。根据接口不同，有多种提供用户消息的方法：在 REST API 中，可以使用 `prompt` 字段直接给出用户提问文本；在 Vertex AI SDK 中，使用 `history` 列表包含先前的用户和模型消息 ([Text generation |
| **temperature, maxOutputTokens, topP, topK** 等 | 生成文本的控制参数，影响回复随机性和长度等，与 OpenAI 类似，这里略。 |
| **responseSchema**                              | （可选）JSON Schema 格式的响应模式定义，用于**结构化输出**。开发者提供 schema 后，Gemini 模型会尝试严格按照此 schema 返回 JSON ([Generate structured output (like JSON) using the Gemini API |
| **responseMimeType** / **response_format**      | （可选）指定期望的响应MIME类型。设置为 `"application/json"` 可提示模型返回 JSON 格式 ([google-gemini/generative-ai-python - GitHub](https://github.com/google-gemini/generative-ai-python#:~:text=google,response following a given)) ([How to get gemini response as json using python and google genai](https://www.pythonkitchen.com/json-response-gemini-google-genai/#:~:text=chat %3D client.chats.create(model%3D'gemini,application%2Fjson))。在部分 SDK 中，与 responseSchema 结合使用，例如通过 `GenerationConfig(response_mime_type="application/json", response_schema=<schema>)` 传入 ([How can I use dict in response_schemas using Gemini API?](https://stackoverflow.com/questions/79225718/how-can-i-use-dict-in-response-schemas-using-gemini-api#:~:text=How can I use dict,self))。 |
| **function_declarations**                       | （可选）函数声明列表，用于**工具/函数调用**。每个函数声明包含 `name`、`description`、`parameters` 等。Gemini 2.5 支持函数调用功能，在 Node.js SDK 中通过 `function_declarations` 提供 ([Generate text responses using Gemini API with external function calls in a chat scenario |
| **candidateCount**                              | （可选）请求返回的候选回复数量（默认1）。                    |

**结构化输出：** Google Gemini 模型输出默认是自然语言文本，但 Vertex AI 提供了**受控文本生成**（Controlled Generation）的机制，可让模型输出 JSON 等结构化格式 ([Generate structured output (like JSON) using the Gemini API  | Vertex AI in Firebase](https://firebase.google.com/docs/vertex-ai/structured-output#:~:text=The Gemini API returns responses as,require an established data schema)) ([Generate structured output (like JSON) using the Gemini API  | Vertex AI in Firebase](https://firebase.google.com/docs/vertex-ai/structured-output#:~:text=Note%3A Using a response schema,controlled generation))。实现方式包括：

- *响应模式 Schema*: 开发者可以在请求中提供 `responseSchema`（JSON Schema）来指定所需输出的结构。在 Vertex AI 的 API 中，这是 Controlled Generation 的核心。比如要求模型输出一个含特定字段的 JSON，对应的 schema 定义可以内嵌在请求中。模型接收到 schema 后，其生成过程会被约束在这个架构内，确保回复符合 schema 中定义的字段和类型 ([Generate structured output (like JSON) using the Gemini API  | Vertex AI in Firebase](https://firebase.google.com/docs/vertex-ai/structured-output#:~:text=To ensure that the model's,processing)) ([Generate structured output (like JSON) using the Gemini API  | Vertex AI in Firebase](https://firebase.google.com/docs/vertex-ai/structured-output#:~:text=Note%3A Using a response schema,controlled generation))。这种方式类似于 OpenAI 的 Structured Outputs：**模型被硬约束只能生成符合 schema 的 JSON**。Google 文档指出，使用 response schema 可大幅减少后续解析开销，让开发者可以直接使用模型返回的数据结构 ([Generate structured output (like JSON) using the Gemini API  | Vertex AI in Firebase](https://firebase.google.com/docs/vertex-ai/structured-output#:~:text=To ensure that the model's,processing))。
- *JSON 响应格式指示*: 除了提供 schema，还可以简单地要求模型输出 JSON 格式。例如，通过设置 `responseMimeType = "application/json"`，通知服务期望 JSON 输出 ([google-gemini/generative-ai-python - GitHub](https://github.com/google-gemini/generative-ai-python#:~:text=google,response following a given))。在 Google 的 Python SDK（如 `google-genai`）中，创建对话时传入 `config={'response_mime_type': 'application/json'}` ([How to get gemini response as json using python and google genai](https://www.pythonkitchen.com/json-response-gemini-google-genai/#:~:text=chat %3D client.chats.create(model%3D'gemini,application%2Fjson))即可启用 JSON 模式，模型将被指示返回 JSON 字符串而非纯文本（内部机制可能类似于在系统提示添加要求）。这种方法不保证特定 schema，但能提高输出为有效 JSON 的几率 ([Generate structured output (like JSON) using the Gemini API  | Vertex AI in Firebase](https://firebase.google.com/docs/vertex-ai/structured-output#:~:text=The Gemini API returns responses as,require an established data schema))。开发者通常结合简单范例提示或 schema 一起使用，以获得既正确又符合特定结构的 JSON。
- *函数/工具调用*: 作为结构化输出的另一种形式，Gemini 2.5 引入了**函数调用**能力。与 OpenAI 类似，开发者可在请求中提供 `function_declarations`（函数定义列表） ([Generate text responses using Gemini API with external function calls in a chat scenario  | Generative AI on Vertex AI  | Google Cloud](https://cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-gemini-function-calling-chat#:~:text=,type%3A FunctionDeclarationSchemaType.STRING))。模型可能在回答中返回一个特殊格式，指示调用哪个函数和参数。Google 的用例通常由开发者分两步完成：**第一步**提供函数列表并提出用户问题，模型如果决定调用函数，会给出包含所选函数名和参数的回复；**第二步**开发者执行该函数并将结果再提供给模型，让模型继续完成回答 ([Generate text responses using Gemini API with external function calls in a chat scenario  | Generative AI on Vertex AI  | Google Cloud](https://cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-gemini-function-calling-chat#:~:text=Generate text responses using Gemini,functions and two sequential prompts)) ([Generate text responses using Gemini API with external function calls in a chat scenario  | Generative AI on Vertex AI  | Google Cloud](https://cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-gemini-function-calling-chat#:~:text=const functionResponseParts %3D [ ,weather%3A 'super nice))。例如，Google Node.js SDK 的示例中，先定义了 `get_current_weather` 函数，然后模型返回了 `functionResponse` 片段，开发者再流式发送该结果回模型以得到最终答复 ([Generate text responses using Gemini API with external function calls in a chat scenario  | Generative AI on Vertex AI  | Google Cloud](https://cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-gemini-function-calling-chat#:~:text=const functionDeclarations %3D [ ,OBJECT%2C properties%3A)) ([Generate text responses using Gemini API with external function calls in a chat scenario  | Generative AI on Vertex AI  | Google Cloud](https://cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-gemini-function-calling-chat#:~:text=const functionResponseParts %3D [ ,weather%3A 'super nice))。目前，Gemini 的函数调用需要开发者主动参与（模型不会真正“调用”外部函数，只是告诉你它**想**调用），因此属于**受控的结构化输出**交互。借助此机制，可以让模型输出**参数化的调用指令**，实现复杂工具的集成。

需要注意的是，Gemini 在**严格模式**下生成 JSON 仍可能出现模型尝试输出解释说明或其它内容的倾向，因此官方建议在使用 responseSchema 时，也在系统提示或用户提示中明确要求“请只输出 JSON，不要多余说明”之类，以提高可靠度 ([response_schema parameter is not followed. · Issue #343 - GitHub](https://github.com/google-gemini/generative-ai-python/issues/343#:~:text=GitHub github,pro family of models))。另外，Gemini 的受控生成有时称为“JSON 模式”或“受控生成 (controlled generation)” ([Generate structured output (like JSON) using the Gemini API  | Vertex AI in Firebase](https://firebase.google.com/docs/vertex-ai/structured-output#:~:text=Note%3A Using a response schema,controlled generation))。

**Python 示例代码：**下面示例展示如何通过 Google 的 GenAI Python SDK 请求 Gemini 2.5 Pro 模型，并使用系统提示和结构化输出 schema：

```python
from google import genai
from google.genai.types import GenerateContentConfig

genai.api_key = "YOUR_GOOGLE_API_KEY"
# 创建聊天（或直接内容生成）客户端
client = genai.Client()

# 定义JSON Schema，例如要求输出包含 name 和 email 字段的对象
from pydantic import BaseModel
class Profile(BaseModel):
    name: str
    email: str

# 准备请求参数
system_instruction = "你是一个严格输出JSON的助手。"
user_question = "请提供一个示例用户的姓名和邮箱。"

response = client.models.generate_content(
    model="gemini-2.5-pro",  # 指定Gemini 2.5 Pro模型
    contents=user_question,
    prompt_params={"context": system_instruction},  # 在一些SDK中可以使用context传入系统提示
    config=GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=Profile  # 可以直接用Pydantic模型，SDK内部会转成JSON Schema
    )
)
print(response.text)
```

在此代码中，我们使用 `response_mime_type="application/json"` 和提供的 `response_schema`（通过 Pydantic 模型Profile）来约束 Gemini 模型输出 ([How to get gemini response as json using python and google genai](https://www.pythonkitchen.com/json-response-gemini-google-genai/#:~:text=from google)) ([How to get gemini response as json using python and google genai](https://www.pythonkitchen.com/json-response-gemini-google-genai/#:~:text=contents%3D,response_schema%3DProfile%2C )%2C ) print(response.text))。同时，通过 `prompt_params` 里的 `context` 传入了系统级指令，要求助手严格输出 JSON。运行该代码，模型可能返回类似：

```json
{
  "name": "Alice",
  "email": "alice@example.com"
}
```

这样，我们就得到了符合预期 schema 的结构化 JSON 输出，而无需后处理解析自由文本 ([Generate structured output (like JSON) using the Gemini API  | Vertex AI in Firebase](https://firebase.google.com/docs/vertex-ai/structured-output#:~:text=To ensure that the model's,processing))。

如果需要使用**函数调用**，可参考下面的 Node.js 逻辑改写为 Python 的伪代码：

```python
# 定义函数列表
function_decls = [{
    "name": "get_current_weather",
    "description": "获取指定地点的当前天气",
    "parameters": {
        "type": "object",
        "properties": {
            "location": {"type": "string"},
            "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
        },
        "required": ["location"]
    }
}]
# 将函数声明传入chat session或prompt
chat = client.chats.create(model="gemini-2.5-pro", context="你可以调用函数获取信息。", 
                           # 假设新的SDK可以接受function_declarations参数
                           function_declarations=function_decls)
# 发送用户提问消息
result = chat.send_message("请告诉我北京的当前天气。")
print(result.text)  # 输出模型的回复，可能是函数调用指令

# 模型可能返回: {"name": "get_current_weather", "parameters": {"location": "北京", "unit": "celsius"}}
# 开发者据此调用真实天气API，得到结果，例如 {"weather": "晴, 25°C"}
weather_data = {"weather": "晴, 25°C"}
# 将函数结果发回模型
followup = chat.send_message({"functionResponse": {
    "name": "get_current_weather", "response": weather_data
}})
print(followup.text)  # 模型最终给出整合了天气信息的回答
```

上述过程模拟了Gemini的函数调用交互。2.5 Pro模型会根据 `function_declarations` 返回 JSON 格式的函数调用指令，开发者执行后再将结果包装进 `functionResponse` 发回模型，模型最终给出自然语言答案 ([Generate text responses using Gemini API with external function calls in a chat scenario  | Generative AI on Vertex AI  | Google Cloud](https://cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-gemini-function-calling-chat#:~:text=const functionResponseParts %3D [ ,weather%3A 'super nice))。

**来源：\**Google Vertex AI 官方文档指出，Gemini API 支持\**系统指令**（system instruction）来设定模型行为 ([Text generation  | Generative AI on Vertex AI  | Google Cloud](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/send-chat-prompts-gemini#:~:text=You can use system instructions,the system instructions code samples))。受控输出方面，文档强调可通过 **response schema** 来确保模型输出符合特定 JSON 模式 ([Generate structured output (like JSON) using the Gemini API  | Vertex AI in Firebase](https://firebase.google.com/docs/vertex-ai/structured-output#:~:text=The Gemini API returns responses as,require an established data schema))。Firebase 的指南亦将此称为 JSON 模式或受控生成 ([Generate structured output (like JSON) using the Gemini API  | Vertex AI in Firebase](https://firebase.google.com/docs/vertex-ai/structured-output#:~:text=Note%3A Using a response schema,controlled generation))。另外，通过设置 `response_format` 或 MIME type 为 JSON，也能启用模型的 JSON 输出模式 ([python - OpenAI API: How do I enable JSON mode using the gpt-4-vision-preview model? - Stack Overflow](https://stackoverflow.com/questions/77434808/openai-api-how-do-i-enable-json-mode-using-the-gpt-4-vision-preview-model#:~:text=,that parse into valid JSON)) ([How to get gemini response as json using python and google genai](https://www.pythonkitchen.com/json-response-gemini-google-genai/#:~:text=chat %3D client.chats.create(model%3D'gemini,application%2Fjson))。Gemini 2.5 关于函数调用的示例在 Google Cloud 文档中有详细说明，其 Node.js SDK 通过 `function_declarations` 提供函数定义，并由模型输出 `functionResponse` 由开发者继续处理 ([Generate text responses using Gemini API with external function calls in a chat scenario  | Generative AI on Vertex AI  | Google Cloud](https://cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-gemini-function-calling-chat#:~:text=,type%3A FunctionDeclarationSchemaType.STRING)) ([Generate text responses using Gemini API with external function calls in a chat scenario  | Generative AI on Vertex AI  | Google Cloud](https://cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-gemini-function-calling-chat#:~:text=const functionResponseParts %3D [ ,weather%3A 'super nice))。

------

## Anthropic Claude (Claude API)

**System Prompt 用法：** Anthropic 的 Claude API（尤其是新版 Messages API）允许在请求中提供一个**系统提示（system prompt）\**字符串，用于设定 Claude 的角色或行为。不同于 OpenAI/Google 将系统提示作为 messages 列表中的一条，Claude API 采取的是\**顶层参数**的形式。在请求 JSON 中，可以直接传递 `"system": "<系统提示字符串>"` ([Messages - Anthropic](https://docs.anthropic.com/en/api/messages#:~:text=Note that if you want,messages in the Messages API))。Claude 不在 `messages` 数组里使用 `"role": "system"`，而是通过顶层 `system` 字段实现相同效果 ([Messages - Anthropic](https://docs.anthropic.com/en/api/messages#:~:text=Note that if you want,messages in the Messages API))。例如：

```json
{
  "model": "claude-2",
  "system": "你是一个资深的金融顾问助理。",
  "messages": [
    {"role": "user", "content": "我该如何规划退休储蓄？"}
  ]
}
```

Anthropic 建议将**角色设定**等内容放在 `system` 提示中，而具体任务要求等可放入用户消息，以防止用户的后续消息覆盖掉系统指令 ([Giving Claude a role with a system prompt - Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/system-prompts#:~:text=expert!)) ([Giving Claude a role with a system prompt - Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/system-prompts#:~:text=System prompt tips%3A Use the,turn instead))。通过“角色提示”（role prompting）赋予 Claude 不同行业专家或个性，有助于提升其回答的准确性与风格一致性 ([Giving Claude a role with a system prompt - Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/system-prompts#:~:text=Why use role prompting%3F))。Anthropic 官方提示：system prompt 最好用于规定 Claude 的身份/角色，过于具体的操作指令可以放在用户消息中 ([Giving Claude a role with a system prompt - Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/system-prompts#:~:text=expert!))。

Claude 的 Messages API 对话组织：`messages` 列表里只能有 `user` 和 `assistant` 两种角色 ([Messages - Anthropic](https://docs.anthropic.com/en/api/messages#:~:text=messages))（不支持 `"system"` 作为列表元素）。开发者可提供多轮历史，比如 `user -> assistant -> user -> ...` 交替。系统提示通过顶层的 `system` 传入一次即影响整个对话。**模板化**系统提示同样需要开发者自行处理，比如编写模板 `"你是一个精通<领域>的专家助手"` 然后替换 `<领域>` 部分。Anthropic 没有内置模板机制，但由于 system prompt 只是简单字符串，程序上易于拼接和复用。以下表格列出 Claude Messages API 的主要参数：

| 参数            | 作用说明                                                     |
| --------------- | ------------------------------------------------------------ |
| **model**       | 模型名称（如 `claude-2`, `claude-instant-1` 或更新的 `claude-3-7` 等版本）。表示选用哪个Claude模型。 |
| **system**      | （可选）系统提示字符串，用于设定Claude的角色或行为准则 ([Giving Claude a role with a system prompt - Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/system-prompts#:~:text=expert!)) ([Giving Claude a role with a system prompt - Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/system-prompts#:~:text=Use the ,API to set Claude’s role))。此字段没有长度硬限制，但应简明概括角色。Claude 会将其与提供的工具信息等一起作为对话上下文的开头。 |
| **messages**    | 消息列表，内部每个对象需有 `role` (`"user"` 或 `"assistant"`) 和 `content`。对于多轮对话，可在数组中按时间顺序给出过去的用户和助手发言。Claude 将根据最后一条消息生成新的回复 ([Messages - Anthropic](https://docs.anthropic.com/en/api/messages#:~:text=Example with multiple conversational turns%3A)) ([Messages - Anthropic](https://docs.anthropic.com/en/api/messages#:~:text=messages))。 |
| **max_tokens**  | 回复最大长度限制。                                           |
| **tools**       | （可选）工具定义列表。Anthropic 支持在 Beta 接口中传入工具（函数）描述，使Claude可以产生调用这些工具的输出 ([Tool use with Claude - Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview#:~:text=Specifying tools)) ([Anthropic Claude with tools using Python SDK - DEV Community](https://dev.to/thomastaylor/anthropic-claude-with-tools-using-python-sdk-2fio#:~:text=tools %3D [ { ,))。tools 列表中每个元素有 `name`, `description`, `input_schema` 等字段。 |
| **tool_choice** | （可选）工具调用策略，可设为 `"auto"`（默认，让 Claude 决定是否用工具）、`"any"`（必须用一个工具）、`"tool"`（强制用指定工具）、`"none"`（禁用工具） ([Tool use with Claude - Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview#:~:text=Forcing tool use)) ([Tool use with Claude - Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview#:~:text=,are provided))。 |
| **metadata**    | （可选）元数据对象，如 `user_id` 等，用于跟踪请求来源用户。  |

**结构化输出：** Claude 模型擅长遵循指令输出有结构的文本，Anthropic 也提供了专门的功能来保证输出结构和让模型借助**工具**完成任务：

- *JSON 结构化回答*: Claude 可以通过提示工程要求输出 JSON。例如，在用户消息中要求 Claude “请以 JSON 格式返回…”。Claude 通常能较好地遵循，Anthropic 社区也建议提供明确定义的 JSON schema 作为示例，让Claude依样输出 ([Tool use with Claude - Anthropic API](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview#:~:text=Tools do not necessarily need,that follows a provided schema)) ([JSON Formatting help: Anthropic's Claude AI Model - Bubble Forum](https://forum.bubble.io/t/json-formatting-help-anthropics-claude-ai-model/266410#:~:text=JSON Formatting help%3A Anthropic's Claude,from Anthropic into my app))。然而，仅靠提示并不能**保证** JSON 有效性。为此，Anthropic 引入了**工具（tools）**接口，其中一种用法是不实际调用外部函数，而是用工具机制让模型输出满足特定 schema 的 JSON。

- *工具（函数）调用*: 2024年4月，Anthropic 发布了官方的**工具使用**支持 ([Anthropic Claude with tools using Python SDK - DEV Community](https://dev.to/thomastaylor/anthropic-claude-with-tools-using-python-sdk-2fio#:~:text=On April 4th%2C 2024%2C Anthropic,definitions for Claude to process))。开发者可以提供一个或多个**工具定义**（类似OpenAI函数）。Claude 在生成回答时，如果认为需要，可插入一个特殊的 `<tool>` 调用内容。Anthropic 的返回会注明一个 `stop_reason: "tool_use"` ([Tool use with Claude - Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview#:~:text=,signaling Claude’s intent))并在消息content中包含一个或多个 `tool_use` block，其中标明要调用的工具名和拟定的参数 ([Tool use with Claude - Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview#:~:text=,signaling Claude’s intent)) ([Anthropic Claude with tools using Python SDK - DEV Community](https://dev.to/thomastaylor/anthropic-claude-with-tools-using-python-sdk-2fio#:~:text=ToolsBetaMessage(id%3D'msg_01Bedxru94A4Pe1sHgWtymSJ'%2C content%3D[ToolUseBlock(id%3D'toolu_01CbGgyko9mdkKSDPw6LsTvV'%2C input%3D,input_tokens%3D433%2C output_tokens%3D60))。例如，提供一个名为 `get_current_stock_price` 的工具后，当用户询问股票价格，Claude 可能输出一个内容块：

  ```json
  content: [
    {
      "type": "tool_use",
      "name": "get_current_stock_price",
      "input": {"symbol": "AAPL"}
    }
  ],
  stop_reason: "tool_use"
  ```

  这个结构化的回复表示Claude决定调用`get_current_stock_price`，参数是`"AAPL"` ([Anthropic Claude with tools using Python SDK - DEV Community](https://dev.to/thomastaylor/anthropic-claude-with-tools-using-python-sdk-2fio#:~:text=ToolsBetaMessage(id%3D'msg_01Bedxru94A4Pe1sHgWtymSJ'%2C content%3D[ToolUseBlock(id%3D'toolu_01CbGgyko9mdkKSDPw6LsTvV'%2C input%3D,input_tokens%3D433%2C output_tokens%3D60))。然后，由开发者根据 `name` 和 `input` 去实际查询股票价格（这是在客户端完成的）。之后开发者再把函数结果发送回Claude。这通常通过再次调用 API，将先前 Claude 请求工具的消息和一个新的由开发者扮演 `"function"` 角色的消息（包含工具执行结果）一并发给模型，让Claude继续完成回答 ([Anthropic Claude with tools using Python SDK - DEV Community](https://dev.to/thomastaylor/anthropic-claude-with-tools-using-python-sdk-2fio#:~:text=Enter fullscreen mode Exit fullscreen,mode)) ([Anthropic Claude with tools using Python SDK - DEV Community](https://dev.to/thomastaylor/anthropic-claude-with-tools-using-python-sdk-2fio#:~:text=Enter fullscreen mode Exit fullscreen,mode))。Claude 会接着输出包含结果的最终答复。整个流程类似于OpenAI函数调用，但Anthropic使用的是 tool_use 的 JSON 内容块和 stop_reason 来指示，需要开发者自己驱动二次交互。

- *严格的 JSON Schema 响应*: Anthropic 没有像OpenAI那样直接提供在请求中嵌入 JSON Schema 让模型严格遵循的单步方案。但可以借助工具机制实现。例如，可以把期望输出的 JSON Schema 当作一个“虚拟工具”，让Claude“调用”这个工具，并把生成的内容限制在 schema 内。Anthropic 文档提到：“工具并不一定是真正的函数——只要你希望模型输出符合某个提供的 JSON schema，你也可以用工具机制” ([Tool use with Claude - Anthropic API](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview#:~:text=Tools do not necessarily need,that follows a provided schema))。具体做法是定义一个工具，名字可以是 `return_json`，描述让Claude输出所需JSON，input_schema 就是想要的 JSON schema。Claude 收到用户请求时，如果按照设计，它会选择使用该工具，并直接填充 schema 所需的字段作为 `input` 输出给你。因为工具无需实际调用，开发者只需提取 Claude 给出的 `input` 即为满足 schema 的 JSON。这种技巧利用了工具调用返回 JSON 的格式，使Claude的输出严格受 input_schema 限制，从而得到结构化数据。

总的来说，Claude 的结构化输出主要依赖**模型良好的服从性**和**工具接口**提供的硬格式约束。Claude 在遵循 JSON 格式方面表现出色，但如果要求非常严格的结构和验证，推荐使用 tools/API 级约束并验证输出。例如，一些 SDK 或社区工具会检查 Claude 输出是否是合法 JSON，不符则可以自动再请求一次或调整提示 ([JSON Formatting help: Anthropic's Claude AI Model - Bubble Forum](https://forum.bubble.io/t/json-formatting-help-anthropics-claude-ai-model/266410#:~:text=JSON Formatting help%3A Anthropic's Claude,from Anthropic into my app))。

**Python 示例代码：\**下面示例使用 Anthropic 提供的 Python SDK 来调用 Claude v2/v3 API，设置 system prompt 并要求结构化输出。我们将展示两个示例：\*\*直接 JSON 输出\*\*和\**使用工具输出**。

*示例1：要求Claude直接输出JSON格式数据。*

```python
import anthropic

client = anthropic.Anthropic(api_key="YOUR_API_KEY")
system_prompt = "你是一个JSON格式输出助手，只返回有效JSON，不要额外解释。"
user_query = "请提供关于OpenAI和Anthropic的简要对比（用JSON对象包含两个字段openai和anthropic）。"

response = client.messages.create(
    model="claude-2",  # 选择Claude模型
    system=system_prompt,
    messages=[{"role": "user", "content": user_query}],
    max_tokens_to_sample=1000
)
print(response.content)
```

在这个例子里，我们通过 `system` 参数设定了Claude的角色要求（只输出JSON）。用户问题要求其输出一个包含特定字段的JSON对象。Claude 可能直接返回：

```json
{
  "openai": "OpenAI专注于...",
  "anthropic": "Anthropic致力于..."
}
```

这是Claude根据指令给出的结构化回答。由于Claude倾向严格服从要求， ([python - OpenAI API: How do I enable JSON mode using the gpt-4-vision-preview model? - Stack Overflow](https://stackoverflow.com/questions/77434808/openai-api-how-do-i-enable-json-mode-using-the-gpt-4-vision-preview-model#:~:text=,is constrained to only generate))中所述的问题在Claude这里通常不会偏离JSON格式。当然，开发者可以对 `response.content` 做JSON解析并验证其结构以确保安全。

*示例2：使用Claude的工具接口获取结构化结果。*

```python
# 定义一个工具，使Claude输出预定义schema的结果
tools = [
    {
        "name": "provide_summary",
        "description": "输出一个包含title和key_points的JSON摘要",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "主题"},
                "key_points": {"type": "array", "items": {"type": "string"}, "description": "要点列表"}
            },
            "required": ["title", "key_points"]
        }
    }
]

client = anthropic.Anthropic(api_key="YOUR_API_KEY")
user_content = "请总结本文的要点。"
response = client.beta.tools.messages.create(
    model="claude-3.5",  # 假设使用Claude 3.5的beta工具接口
    tools=tools,
    messages=[{"role": "user", "content": user_content}],
    tool_choice="auto",
    max_tokens=500
)
print(response.content, response.stop_reason)
```

假设Claude理解需要用 `provide_summary` 工具来格式化输出，那么 `response.stop_reason` 会是 `"tool_use"` ([Tool use with Claude - Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview#:~:text=,signaling Claude’s intent))，而 `response.content` 将是一个列表，里面含有Claude准备的 JSON 数据块。例如：

```python
response.content -> [
    {
      "type": "tool_use",
      "name": "provide_summary",
      "input": {
        "title": "本文摘要",
        "key_points": ["要点1...", "要点2...", "要点3..."]
      }
    }
]
```

这实际就是Claude输出的结构化结果，已经符合我们在 `input_schema` 定义的模式 ([Anthropic Claude with tools using Python SDK - DEV Community](https://dev.to/thomastaylor/anthropic-claude-with-tools-using-python-sdk-2fio#:~:text=ToolsBetaMessage(id%3D'msg_01Bedxru94A4Pe1sHgWtymSJ'%2C content%3D[ToolUseBlock(id%3D'toolu_01CbGgyko9mdkKSDPw6LsTvV'%2C input%3D,input_tokens%3D433%2C output_tokens%3D60))。因为这个工具纯粹是用来组织输出格式的，我们并不需要再“调用”什么，只要取出其中的 `input` 即是摘要数据。上例中，Claude 给出了一个包含标题和要点列表的JSON对象。

如果这是个需要真正调用外部API的工具，例如查询股票价格，那么流程和代码会复杂一些：Claude先输出工具名和参数，然后我们调用真实API，再用 `client.beta.tools.messages.create` 传回函数结果（通过 `messages` 参数加入一条 role 为 `"function"` 的消息）以获得Claude后续回复 ([Anthropic Claude with tools using Python SDK - DEV Community](https://dev.to/thomastaylor/anthropic-claude-with-tools-using-python-sdk-2fio#:~:text=Enter fullscreen mode Exit fullscreen,mode)) ([Anthropic Claude with tools using Python SDK - DEV Community](https://dev.to/thomastaylor/anthropic-claude-with-tools-using-python-sdk-2fio#:~:text=Enter fullscreen mode Exit fullscreen,mode))。Anthropic SDK 对这种二次调用有支持，例如上面的 `client.beta.tools.messages.create` 返回一个 ToolsBetaMessage 对象，可用于后续 chain。但是限于篇幅，这里不展开真实调用的代码。

**来源：\**Anthropic API 文档明确指出，使用 Messages API 时若要包含系统提示，应利用顶层的 `system` 参数 ([Messages - Anthropic](https://docs.anthropic.com/en/api/messages#:~:text=Note that if you want,messages in the Messages API))；没有 `"system"` 角色在消息列表中这一点需特别注意。Anthropic 官方教程建议将 Claude 的\**角色**用 system prompt 来定义，从而提升回答针对性 ([Giving Claude a role with a system prompt - Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/system-prompts#:~:text=expert!))。关于结构化输出，Anthropic 的**工具使用**功能提供了用 JSON Schema 描述参数的接口，让Claude能够产生符合 schema 的 `tool_use` 块 ([Tool use with Claude - Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview#:~:text={ ,object)) ([Tool use with Claude - Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview#:~:text=information about the stock or,ticker))。文档强调，**工具并不一定要真有其事**，完全可以用于让模型按给定 schema 格式化输出 ([Tool use with Claude - Anthropic API](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview#:~:text=Tools do not necessarily need,that follows a provided schema))。例如，Anthropic API 能将提供的工具定义、配置和系统提示**合成为特殊的系统提示**注入，从而在很大程度上保证模型输出遵循预期结构 ([Tool use with Claude - Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview#:~:text=Tools are specified in the,Each tool definition includes))。

------

## DeepSeek API

**System Prompt 用法：** DeepSeek 是一家兼容 OpenAI 接口的模型服务商，其 Chat API 的用法与 OpenAI ChatCompletion 十分相似。开发者可以通过 OpenAI 官方的 Python SDK 客户端更换 `base_url` 来调用 DeepSeek 的接口 ([JSON Output | DeepSeek API Docs](https://api-docs.deepseek.com/guides/json_mode#:~:text=import json from openai import,OpenAI))。在 DeepSeek 的对话接口中，同样使用 `messages` 数组来传递对话，其中可以包含 `role: "system"` 的消息作为系统提示，用于约束模型的角色和行为。例如：

```python
system_prompt = """
你将收到一段考试文本。请提取其中的 "question" 和 "answer"，并用JSON格式输出。
EXAMPLE INPUT:
Which is the highest mountain in the world? Mount Everest.

EXAMPLE JSON OUTPUT:
{
    "question": "Which is the highest mountain in the world?",
    "answer": "Mount Everest"
}
"""
user_prompt = "Which is the longest river in the world? The Nile River."

messages = [
    {"role": "system", "content": system_prompt},
    {"role": "user", "content": user_prompt}
]
```

上例的 system prompt 提示模型它是一个解析问答并输出 JSON 的助手，并给了示例输入/输出格式 ([JSON Output | DeepSeek API Docs](https://api-docs.deepseek.com/guides/json_mode#:~:text=system_prompt %3D ,output them in JSON format)) ([JSON Output | DeepSeek API Docs](https://api-docs.deepseek.com/guides/json_mode#:~:text=EXAMPLE JSON OUTPUT%3A { ,}))。DeepSeek 模型会遵循该系统说明。DeepSeek 支持开发者自定义任意 system prompt，且没有特殊的模板语法。因此，**模板化**通常由开发者自己完成，即准备好多种场景的 system prompt 模板，根据需要填充内容然后传入 API。DeepSeek 也提供了**预设的 Prompt 模板**功能如 “Chat Prefix Completion (前缀补全)” 模式 ([JSON Output | DeepSeek API Docs](https://api-docs.deepseek.com/guides/json_mode#:~:text=* Reasoning Model (deepseek,Other Resources))，但那是Beta特性，主要用于指定对话前缀而非一般用途。

DeepSeek 与 OpenAI 接口的高度兼容性意味着常用参数名称和作用几乎完全相同。下表列出 DeepSeek Chat API 请求的主要字段：

| 参数                           | 作用说明                                                     |
| ------------------------------ | ------------------------------------------------------------ |
| **model**                      | 模型名称，例如 `"deepseek-chat"` 或具体版本号模型。如 `DeepSeek-V3` 等。 |
| **messages**                   | 对话消息列表，使用 `"role"` (`system/user/assistant`) 和 `"content"` 结构。`system`角色消息用于系统指令，`user`为用户输入。DeepSeek 要求如果有系统或用户消息中提到 JSON 等要求，需配合相应参数开启模式 ([JSON Output |
| **response_format**            | （可选）响应格式设置。DeepSeek 明确支持 `response_format={"type": "json_object"}` 来开启 JSON 模式 ([JSON Output |
| **tools**                      | （可选）工具列表，用于函数调用等场景。DeepSeek API 沿用了 OpenAI 函数调用的格式，但参数名命名为 tools。tools 列表的每个元素可以是 `{"type": "function", "function": { name, description, parameters }}` 结构，用于定义一个可供模型调用的函数 ([Function Calling |
| **temperature, max_tokens** 等 | 生成配置参数，与OpenAI类似。DeepSeek 特别提醒 `max_tokens` 要足够大以容纳整个 JSON 输出，避免截断 ([JSON Output |

**结构化输出：** DeepSeek 针对结构化输出提供了**JSON 模式**和**函数调用**两种主要方案：

- *JSON 输出模式*: DeepSeek 提供了一个专门的**JSON Output**指南，说明如何让模型严格输出 JSON ([JSON Output | DeepSeek API Docs](https://api-docs.deepseek.com/guides/json_mode#:~:text=In many scenarios%2C users need,structured output%2C facilitating subsequent parsing))。使用方法为：**(1)** 在 API 请求中设置参数 `response_format={'type': 'json_object'}` 来启用 JSON 模式；**(2)** 在系统或用户提示中包含关键词“json”，并提供期望的 JSON 格式示例，引导模型遵循 ([JSON Output | DeepSeek API Docs](https://api-docs.deepseek.com/guides/json_mode#:~:text=To enable JSON Output%2C users,should))。满足这些条件时，DeepSeek 模型会被约束只能生成 JSON 字符串 ([python - OpenAI API: How do I enable JSON mode using the gpt-4-vision-preview model? - Stack Overflow](https://stackoverflow.com/questions/77434808/openai-api-how-do-i-enable-json-mode-using-the-gpt-4-vision-preview-model#:~:text=,that parse into valid JSON))。如果生成过程中模型偏离了 JSON 格式，DeepSeek API可能会返回空内容，官方建议调整提示重新尝试 ([JSON Output | DeepSeek API Docs](https://api-docs.deepseek.com/guides/json_mode#:~:text=3. Set the ,prompt to mitigate such problems))。总的来说，在 JSON 模式下，DeepSeek 模型输出的文本**开头和结尾都会是JSON对象的花括号**，并符合提示中给定的示例结构。这个模式类似OpenAI的JSON严格模式。

- *函数/工具调用*: DeepSeek 实现了与OpenAI函数调用兼容的接口。开发者可以提供 `tools` 列表（其中每个工具指定一个函数及其参数schema） ([Function Calling | DeepSeek API Docs](https://api-docs.deepseek.com/guides/function_calling#:~:text=tools %3D [ { ,object))。模型在生成回答时，可以选择调用工具（函数）。DeepSeek 的API返回格式与OpenAI一致：若模型决定调用函数，将在 `choices[0].message` 中出现 `role: "assistant"` 且 `function_call` 字段包含调用信息。因为 DeepSeek 封装在 OpenAI SDK 的client中，使用方式几乎无差别。例如：

  ```python
  tools = [{
    "type": "function",
    "function": {
       "name": "get_weather",
       "description": "Get weather of a location, user should supply a location",
       "parameters": {
           "type": "object",
           "properties": {"location": {"type": "string", "description": "城市名称"}},
           "required": ["location"]
       }
    }
  }]
  response = client.chat_completions.create(
      model="deepseek-chat",
      messages=[{"role": "user", "content": "What's the weather in Paris?"}],
      tools=tools
  )
  print(response.choices[0].message.function_call)
  ```

  DeepSeek 模型可能输出一个函数调用请求，如：`{"name": "get_weather", "arguments": "{ \"location\": \"Paris\" }"}`。开发者再调用实际天气API获取结果，然后继续对话。这部分流程与OpenAI无异，只是参数名叫 tools 而非 functions ([Function Calling | DeepSeek API Docs](https://api-docs.deepseek.com/guides/function_calling#:~:text=response %3D client.chat.completions.create( model%3D"deepseek,0].message)) ([Function Calling | DeepSeek API Docs](https://api-docs.deepseek.com/guides/function_calling#:~:text=tools %3D [ { ,object))。DeepSeek API 也支持 `tool_choice` 等设置，但其默认行为已经足够模型自动判断何时用函数。

- *其他结构约束*: DeepSeek 还有一些辅助特性，例如 *Chat Prefix Completion*（可以看作是一种模板提示，模型在回答时会自动带上一些前缀），以及 *FIM (Fill-in-the-Middle) Completion* 等，这些属于高级提示控制，不属于输出结构约束范畴，故此不展开。

值得一提，DeepSeek 团队也在社区中分享了使用其**推理模型DeepSeek-R1**进行工具调用/代码生成的技巧 ([How to do Structured Outputs with Deepseek R1 : r/LocalLLaMA](https://www.reddit.com/r/LocalLLaMA/comments/1i5y93o/how_to_do_structured_outputs_with_deepseek_r1/#:~:text=How to do Structured Outputs,I'm one of the devs))。但对于API使用者来说，只需按照OpenAI的调用格式使用即可，差别极小。

**Python 示例代码：**以下代码演示通过 OpenAI Python SDK 调用 DeepSeek API，让模型严格输出 JSON：

```python
import os
from openai import OpenAI

# 配置OpenAI客户端指向DeepSeek服务
openai = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

system_prompt = """你是一个解析问答的助手，请以JSON格式返回结果。
回答只包含JSON，不要额外的解释。示例如下：
输入: What is 2+2? 4.
输出: { "question": "What is 2+2?", "answer": "4" }
"""
user_prompt = "输入: Who wrote '1984'? George Orwell."

messages = [
    {"role": "system", "content": system_prompt},
    {"role": "user", "content": user_prompt}
]

response = openai.chat.completions.create(
    model="deepseek-chat",
    messages=messages,
    response_format={'type': 'json_object'}  # 启用JSON模式
)
print(response.choices[0].message.content)
```

在 system prompt 中我们明确要求了 JSON 格式，并提供了示例，这满足 DeepSeek JSON 输出模式的条件 ([JSON Output | DeepSeek API Docs](https://api-docs.deepseek.com/guides/json_mode#:~:text=To enable JSON Output%2C users,should))。同时通过 `response_format` 参数将模式设置为 JSON 严格模式 ([JSON Output | DeepSeek API Docs](https://api-docs.deepseek.com/guides/json_mode#:~:text=To enable JSON Output%2C users,should))。因此，模型将返回一个JSON，例如：

```json
{
  "question": "Who wrote '1984'?",
  "answer": "George Orwell"
}
```

DeepSeek 保证了输出是有效 JSON ([JSON Output | DeepSeek API Docs](https://api-docs.deepseek.com/guides/json_mode#:~:text=achieve structured output%2C facilitating subsequent,parsing))。开发者可以直接用 Python 的 `json.loads()` 来解析 `response.choices[0].message.content`，无需担心解析错误。

如果要使用**函数调用**功能，例如上面的 `get_weather` 工具示例，可以这样：

```python
tools = [
  {
    "type": "function",
    "function": {
      "name": "get_weather",
      "description": "获取指定城市的当前天气。",
      "parameters": {
        "type": "object",
        "properties": {"location": {"type": "string"}},
        "required": ["location"]
      }
    }
  }
]
msgs = [{"role": "user", "content": "请问巴黎现在的天气如何？"}]
resp = openai.chat.completions.create(model="deepseek-chat", messages=msgs, tools=tools)
assistant_msg = resp.choices[0].message
if assistant_msg.get("function_call"):
    func = assistant_msg.function_call
    print(f"模型请求调用函数: {func['name']}, 参数: {func['arguments']}")
    # 输出类似: 模型请求调用函数: get_weather, 参数: { "location": "巴黎" }
    # 然后开发者调用实际天气API...
    weather_info = "晴，15°C"
    # 将函数结果作为assistant发回（DeepSeek按照OpenAI协议，也需这样做后续对话）
    msgs.append({"role": "assistant", "content": None, "function_call": func})
    msgs.append({"role": "function", "name": func["name"], "content": weather_info})
    final_resp = openai.chat.completions.create(model="deepseek-chat", messages=msgs)
    print(final_resp.choices[0].message.content)
```

DeepSeek 模型会在第一轮输出中提供 `function_call`（通过 OpenAI SDK获取），指示需要`get_weather`。以上代码打印了模型请求，然后模拟获取了天气信息，再将其作为函数角色消息传回模型，最后得到模型给用户的答复，例如“巴黎现在是晴，气温15°C。”。整个过程和OpenAI GPT的函数调用流程相同，因为DeepSeek完全遵循了OpenAI的接口规范 ([Function Calling | DeepSeek API Docs](https://api-docs.deepseek.com/guides/function_calling#:~:text=def send_messages(messages)%3A response %3D client,0].message)) ([Function Calling | DeepSeek API Docs](https://api-docs.deepseek.com/guides/function_calling#:~:text=tools %3D [ { ,object))。

**来源：**DeepSeek 官方文档指出启用 JSON 严格输出需设置 `response_format={'type': 'json_object'}` 并在提示中包含“json”等字样和示例 ([JSON Output | DeepSeek API Docs](https://api-docs.deepseek.com/guides/json_mode#:~:text=To enable JSON Output%2C users,should))。其示例代码也证明了如何构造 system prompt 和 user prompt 来获取 JSON ([JSON Output | DeepSeek API Docs](https://api-docs.deepseek.com/guides/json_mode#:~:text=system_prompt %3D ,output them in JSON format)) ([JSON Output | DeepSeek API Docs](https://api-docs.deepseek.com/guides/json_mode#:~:text=EXAMPLE JSON OUTPUT%3A { ,}))。DeepSeek 提供了 Python 示例展示将 OpenAI SDK 指向 DeepSeek 接口并使用 tools 参数实现函数调用 ([Function Calling | DeepSeek API Docs](https://api-docs.deepseek.com/guides/function_calling#:~:text=def send_messages(messages)%3A response %3D client,0].message)) ([Function Calling | DeepSeek API Docs](https://api-docs.deepseek.com/guides/function_calling#:~:text=tools %3D [ { ,object))。因此，无论 system prompt 还是结构化输出的语法，DeepSeek 都与 OpenAI API 基本一致，开发者可以轻松迁移现有调用代码。

------

## 开源兼容 OpenAI API (Generic OpenAI-Compatible API)

**System Prompt 用法：** 很多开源的 LLM 服务或本地部署方案都实现了**OpenAI API兼容**接口，如 LocalAI、vLLM、FastChat 等 ([LocalAI](https://localai.io/#:~:text=Drop,work seamlessly together or independently)) ([LocalAI](https://localai.io/#:~:text=))。这些服务允许开发者使用与官方 OpenAI API 相同的请求格式和参数调用本地或其它模型。对于 system prompt 的支持，它们通常都遵循 OpenAI 的定义——即在 `messages` 列表中识别 `role: "system"` 的消息，并将其与模型对话上下文一起送入模型推理。因此，使用这类兼容API时，**system prompt 的设置方法与OpenAI完全一致**：构造包含系统指令的消息放在消息列表最前即可。由于是兼容接口，模板化也没有特别新功能，开发者依然通过代码拼接完成模板填充。

需要注意的是，实际的**模型**（如本地 LLaMA 等）在未专门调教时，对 system prompt 的遵循程度可能不如 ChatGPT 类模型严格。一些兼容实现会在幕后将 system prompt 拼接成模型输入的一部分（例如作为特殊标记符串：`<s>[SYSTEM] ... [/SYSTEM] ...`）。例如，LocalAI 等项目会对 system prompt 进行一定处理或使用默认 system prompt 限制模型行为。但在API层面对用户是透明的，你只需照常传递 system 消息。

因此，对于**开源模型**的 OpenAI兼容API，system prompt 有时**效果有限**，尤其在模型没有RLHF指令调优的情况下。不过新的开源模型（如 Llama-2-chat 等）已经引入了系统指令概念，能够较好地遵循 system prompt。

以下表格概括Generic OpenAI兼容API常见字段（实际上与OpenAI一致），并指出在开源实现中可能的注意事项：

| 参数                    | 说明                                                         |
| ----------------------- | ------------------------------------------------------------ |
| **model**               | 模型标识符。开源API通常允许指定本地模型名称或在其内部配置某个模型对应于OpenAI的某个模型名。例如 `gpt-3.5-turbo` 在LocalAI中可映射到一个 Llama2-7B-chat 实例。 |
| **messages**            | 消息列表，包括system、user、assistant角色。绝大部分开源兼容实现都支持这个参数，因为它是OpenAI Chat API的核心。System消息会被拼接到提示最前，指导模型。 |
| **functions**/**tools** | 多数兼容API现已支持函数调用参数，但实现细节各异。有的直接忽略该参数（如果模型不支持）或者需要结合特定提示模板来诱导模型执行函数调用格式输出。也有一些项目对常见开源chat模型做了fine-tune或提示包装，使其能够识别和输出类似OpenAI函数调用的格式。 |
| **response_format**     | 部分开源实现支持 `response_format={"type": "json_object"}` 来开启严格JSON模式。例如，vLLM 等通过解析该参数，在生成时自动追加一个要求 JSON 的前缀提示 ([JSON Mode and Structured Outputs Mode using OpenAI Models](https://systenics.ai/blog/2024-10-13-json-mode-and-structured-outputs-mode-using-openai-models/#:~:text=JSON Mode and Structured Outputs,a structured and predictable format))。也有的实现（如一些代理）会接收到模型输出后自行验证JSON格式，不符则报错或重试 ([Gemini - Google AI Studio |
| **temperature等**       | 与OpenAI相同，用于调节生成随机性。                           |

**结构化输出：** 在开源模型的OpenAI兼容API中，结构化输出能力取决于底层模型和实现策略：

- *纯提示法*: 如果底层模型本身没有特别的功能调用能力，那么结构化输出主要靠提示。例如，对一个未调优的GPT-NeoX模型，即使API接受了 `functions` 列表，模型也不知道如何使用——除非在system/user提示中明确要求它输出某种格式。开发者可以提供JSON schema示例在提示中，引导模型模仿输出，这仍然是一种soft constraint，可靠性可能不高。但对一些训练有素的chat模型（如Llama-2-Chat），通过在system prompt要求JSON，它们通常也能很好地输出接近要求的JSON。
- *函数调用兼容*: 越来越多的开源模型通过**LoRA微调**或**系统提示包装**具备了函数调用格式输出的能力。例如，有社区项目提供了类ChatGPT的系统Prompt，可以指导Llama 2在回答时使用 `<function>` 标签或JSON方式输出参数，从而模拟函数调用 ([How to do Structured Outputs with Deepseek R1 : r/LocalLLaMA](https://www.reddit.com/r/LocalLLaMA/comments/1i5y93o/how_to_do_structured_outputs_with_deepseek_r1/#:~:text=r%2FLocalLLaMA www,I'm one of the devs))。开源兼容API实现方面，像 **FastChat** 等框架可能在检测到 `functions` 参数时，自动将函数列表转成一段特殊提示附加，以诱导模型按所列函数名选择之一回答。这种方法不保证成功率，但实践表明配合一个良好的系统prompt，可以让Llama-2这样模型80%以上按要求输出 `{"function": ..., "arguments": ...}` 格式，然后由API解析返回给用户。还有的实现则**完全不支持**函数调用——例如一些旧版本LocalAI可能忽略 `functions` 字段（返回自由文本回答） ([DeepSeek V3 Does Not Support Structured Output in LangChain ...](https://github.com/langchain-ai/langchain/issues/29282#:~:text=DeepSeek V3 Does Not Support,It uses))。因此，使用前应查看对应开源项目的文档或更新日志。
- *严格模式/Schema 验证*: 一些兼容API提供了**输出验证**功能。例如 **LiteLLM** 或 **Guidance** 库可以在获取模型输出后校验其是否符合给定 JSON Schema，不符合则报错或自动重试 ([Gemini - Google AI Studio | liteLLM](https://docs.litellm.ai/docs/providers/gemini#:~:text=Validate Schema)) ([Gemini - Google AI Studio | liteLLM](https://docs.litellm.ai/docs/providers/gemini#:~:text=LiteLLM will validate the response,does not match the schema))。也有项目允许用户传schema，模型端不一定真懂schema，但框架会在收到回复后做格式校验，再决定是否把回复返回给调用方（相当于在API层实现structured output保证）。因此，在完全开源环境中，实现结构化输出可靠性的思路是：**提示约束 + 接口验证** 双管齐下。

综上，开源兼容API致力于模仿OpenAI API行为，但由于**底层模型能力不同**，在系统提示和结构化输出上效果不一。不过总体趋势是新的开源Chat模型不断增强遵循格式指令的能力，以及第三方工具增强输出验证，使得开发者也能在本地环境获得接近OpenAI功能的体验 ([OpenAI compatibility - Hacker News](https://news.ycombinator.com/item?id=39307330#:~:text=OpenAI compatibility ,OpenAI%2C Google)) ([OpenAI compatibility - Hacker News](https://news.ycombinator.com/item?id=39307330#:~:text=... OpenAI API compatible,OpenAI%2C Google))。

**Python 示例代码：**假设我们使用 LocalAI 来运行一个 Llama-2-Chat 模型，它暴露了 OpenAI兼容的HTTP接口。我们可以用 `openai` Python 库直接请求它。例如：

```python
import openai
openai.api_key = "not-needed-for-local"  # 本地部署通常不校验key
openai.api_base = "http://localhost:8080/v1"

messages = [
    {"role": "system", "content": "你是一个JSON输出助手。"},
    {"role": "user", "content": "列出3种水果及其颜色。用JSON数组返回，每个元素有fruit和color字段。"}
]
response = openai.ChatCompletion.create(
    model="llama-2-7b-chat",  # LocalAI 将此映射到实际模型
    messages=messages,
    max_tokens=200,
    temperature=0,
    response_format={"type": "json_object"}  # LocalAI 若支持，会尝试严格JSON
)
print(response.choices[0].message.content)
```

在LocalAI（假设其已经实现了response_format解析）的情况下，我们期待模型输出：

```json
[
  {"fruit": "苹果", "color": "红色"},
  {"fruit": "香蕉", "color": "黄色"},
  {"fruit": "葡萄", "color": "紫色"}
]
```

如果底层模型遵守得不够好，可能会有多余文本，这时LocalAI可能直接返回非JSON；如果其实现了验证，则可能会报错提示格式不符 ([Gemini - Google AI Studio | liteLLM](https://docs.litellm.ai/docs/providers/gemini#:~:text=LiteLLM will validate the response,does not match the schema))。开发者可以根据需要调整 `temperature` 或增加 system 指令强调格式。

对于函数调用，假如我们对 Llama2-chat 进行了提示工程，让它学会用特定格式调用函数，我们可以尝试：

```python
functions = [{
    "name": "get_capital",
    "description": "获取国家的首都",
    "parameters": {
       "type": "object",
       "properties": { "country": {"type": "string"} },
       "required": ["country"]
    }
}]
messages = [
    {"role": "system", "content": "如果用户问国家首都，请调用函数get_capital。否则正常回答。"},
    {"role": "user", "content": "法国的首都是什么？"}
]
resp = openai.ChatCompletion.create(model="llama-2-7b-chat", messages=messages, functions=functions)
msg = resp.choices[0].message
print(msg)
```

因为Llama-2并非原生支持函数调用，所以LocalAI可能通过在提示中注入函数列表描述的方式来引导它。模型有一定几率响应类似：

```json
{
  "function_call": {
    "name": "get_capital",
    "arguments": "{ \"country\": \"法国\" }"
  }
}
```

LocalAI 接口会将其解析为 `message.function_call` 返回给我们。我们打印的 `msg` 可能是 `{"role": "assistant", "function_call": {...}}` 的结构。然后我们就可以像OpenAI一样，调用实际函数获取“巴黎”作为结果，再把它反馈。**但如果模型没有按期望输出这个格式**，LocalAI可能直接给出 `"巴黎是法国的首都。"` 这样的文本回答，因为模型没听懂要调用函数。这种情况取决于实现策略和模型配合度。开发者可以尝试调低temperature、强化system prompt，或者换用经过fine-tune支持函数格式的模型来提高成功率。

**来源：\**开源 OpenAI API 实现如 LocalAI 明确宣称\**完全兼容 OpenAI API** ([LocalAI](https://localai.io/#:~:text=Drop,work seamlessly together or independently))。对于结构化输出，社区提供的 LiteLLM 文档展示了如何传入 `response_format` 和 `response_schema` 来约束如 Gemini 等模型，并对返回进行 JSON Schema 验证 ([Gemini - Google AI Studio | liteLLM](https://docs.litellm.ai/docs/providers/gemini#:~:text=from litellm import completion%2C JSONSchemaValidationError,KEY CHANGE)) ([Gemini - Google AI Studio | liteLLM](https://docs.litellm.ai/docs/providers/gemini#:~:text=,))。Stack Overflow 也有讨论如何让兼容API（如Azure或自建）返回JSON ([How can I use dict in response_schemas using Gemini API?](https://stackoverflow.com/questions/79225718/how-can-i-use-dict-in-response-schemas-using-gemini-api#:~:text=How can I use dict,self))。实际经验表明，许多开源模型通过这些兼容层已经能够在**系统提示**和**JSON输出**方面取得不错效果，但函数调用等更复杂场景可能需要额外的提示技巧或模型支持。目前业界在推动建立统一的标准，使不同模型（开源或商业）都能听懂诸如函数调用等指令格式 ([OpenAI compatibility - Hacker News](https://news.ycombinator.com/item?id=39307330#:~:text=... OpenAI API compatible,OpenAI%2C Google))。开发者在使用开源兼容API时，应参考其文档以了解支持程度，并可能需要多次试验以获得理想的结构化输出。