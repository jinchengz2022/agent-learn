import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { JsonOutputToolsParser } from "@langchain/core/output_parsers/openai_tools";
import {
  execCommandTool,
  listDirTool,
  readFileTool,
  writeFileTool,
} from "../tool-test/all-tools.mjs";
import chalk from "chalk";

const llm = new ChatOpenAI({
  apiKey:
    process.env.API_KEY ||
    "sk-ws-H.PLYPHDH.pInG.MEYCIQDaYqoWJ7impY3WpMy6jaPg5s5Uuh1RMUKtPtaCnWpoLAIhALi8nVY7K4sR7_0SDZg0dpufRYcnR9ImPT9rKsHjfD4Y",
  model: process.env.MODEL_NAME || "qwen3.7-plus",
  configuration: {
    baseURL:
      process.env.BASE_URL ||
      "https://ws-614wr0b4y1arhulc.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
  },
  temperature: 0,
});

const history = new InMemoryChatMessageHistory();

const tools = [execCommandTool, listDirTool, readFileTool, writeFileTool];
const modelWithTools = llm.bindTools(tools);

const runAgentWithTools = async (q, maxIterations = 30) => {
  await history.addMessage(
    new SystemMessage(`你是一个项目管理助手，使用工具完成任务。

当前工作目录: ${process.cwd()}

工具：
1. read_file: 读取文件
2. write_file: 写入文件
3. execute_command: 执行命令（支持 workingDirectory 参数）
4. list_directory: 列出目录

重要规则 - execute_command：
- workingDirectory 参数会自动切换到指定目录
- 当使用 workingDirectory 时，绝对不要在 command 中使用 cd
- 错误示例: { command: "cd react-todo-app && pnpm install", workingDirectory: "react-todo-app" }
- 正确示例: { command: "pnpm install", workingDirectory: "react-todo-app" }

重要规则 - write_file：
- 当写入 React 组件文件（如 App.tsx）时，如果存在对应的 CSS 文件（如 App.css），在其他 import 语句后加上这个 css 的导入
`),
  );

  await history.addMessage(new HumanMessage(q));

  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.green("ai loading..."));

    const messages = await history.getMessages();
    const rawStreams = await modelWithTools.stream(messages);

    let fullAiMessage = null;
    const toolParser = new JsonOutputToolsParser();
    const printedLog = new Map();

    for await (const chunk of rawStreams) {
      fullAiMessage = fullAiMessage ? fullAiMessage.concat(chunk) : chunk;

      let parsedTolls = null;

      try {
        parsedTolls = await toolParser.parseResult([
          { message: fullAiMessage },
        ]);
      } catch (error) {
        console.log(chalk.red("parser error", error));
      }

      if (parsedTolls && parsedTolls.length > 0) {
        for (const toolCall of parsedTolls) {
          if (toolCall.type === "write_file" && toolCall.args?.content) {
            const toolCallId =
              toolCall.id || toolCall.args?.filePath || "normal";
            const currentContent = String(toolCall.args?.content) || "";
            const previousLength = printedLog.get(toolCallId);

            if (!previousLength) {
              printedLog.set(toolCallId, 0);
              console.log(
                chalk.blue(`write 工具调用：${toolCall.args?.filePath}`),
              );
            }

            if (currentContent.length > previousLength) {
              const newContent = currentContent.slice(previousLength);
              process.stdout.write(newContent);
              printedLog.set(toolCallId, currentContent.length);
            }
          }
        }
      } else {
        if (chunk.content) {
          process.stdout.write(
            typeof chunk.content === "string"
              ? chunk.content
              : JSON.stringify(chunk.content),
          );
        }
      }
    }

    await history.addMessage(fullAiMessage);

    if (!fullAiMessage.tool_calls || fullAiMessage.tool_calls.length === 0) {
      console.log(chalk.red(""));
      return fullAiMessage.content;
    }

    for (const toolCall of fullAiMessage.tool_calls) {
      const foundTool = tools.find((i) => i.name === toolCall.name);
      if (foundTool) {
        const toolRes = await foundTool.invoke(toolCall.args);
        await history.addMessage(
          new ToolMessage({
            content: toolRes,
            tool_call_id: toolCall.id,
          }),
        );
      }
    }
  }

  const finalMsgs = await history.getMessages();
  return finalMsgs[finalMsgs.length - 1];
};

const case1 = `创建一个功能丰富的 React TodoList 应用：

1. 创建项目：echo -e "n\nn" | pnpm create vite react-todo-app --template react-ts
2. 修改 src/App.tsx，实现完整功能的 TodoList：
 - 添加、删除、编辑、标记完成
 - 分类筛选（全部/进行中/已完成）
 - 统计信息显示
 - localStorage 数据持久化
3. 添加复杂样式：
 - 渐变背景（蓝到紫）
 - 卡片阴影、圆角
 - 悬停效果
4. 添加动画：
 - 添加/删除时的过渡动画
 - 使用 CSS transitions
5. 列出目录确认

注意：使用 pnpm，功能要完整，样式要美观，要有动画效果

去掉 main.tsx 里的 index.css 导入

之后在 react-todo-app 项目中：
1. 使用 pnpm install 安装依赖
2. 使用 pnpm run dev 启动服务器
`;

try {
  const res = await runAgentWithTools(case1);
} catch (error) {
  console.log(chalk.red("runAgentWithTools error"));
}
