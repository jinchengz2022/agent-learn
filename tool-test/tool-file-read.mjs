import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import fs from "node:fs/promises";
import { z } from "zod";

const model = new ChatOpenAI({
  modelName: process.env.MODAL_NAME || "deepseek-v4.1-flash",
  temperature: 0,
  apiKey:
    process.env.API_KEY ||
    "sk-ws-H.PLYPHDH.pInG.MEYCIQDaYqoWJ7impY3WpMy6jaPg5s5Uuh1RMUKtPtaCnWpoLAIhALi8nVY7K4sR7_0SDZg0dpufRYcnR9ImPT9rKsHjfD4Y",
  configuration: {
    baseURL:
      process.env.BASE_URL ||
      "https://ws-614wr0b4y1arhulc.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
  },
});

const readFileTool = tool(
  async ({ filePath }) => {
    const content = await fs.readFile(filePath, "utf-8");
    console.log(
      `  [工具调用] read_file("${filePath}") - 成功读取 ${content.length} 字节`
    );

    return `文件内容${content}`;
  },
  {
    name: "read_file",
    description:
      "用此工具来读取文件内容。当用户要求读取文件、查看代码、分析文件内容时，调用此工具。输入文件路径（可以是相对路径或绝对路径）。",
    schema: z.object({
      filePath: z.string().describe("要读取的文件路径"),
    }),
  }
);

const tools = [readFileTool];

const modelWithTools = model.bindTools(tools);

const messages = [
  new SystemMessage(`
  你是一个代码助手，可以使用工具读取文件并解释代码
  
  工作流程：
  1. 用户要求读取文件时，立即调用 read_file 工具
  2. 等待工具返回文件内容
  3. 基于文件内容进行分析和解释
  
  可用工具：
  - read_file 读取文件内容（使用此工具来获取文件内容）
  `),
  new HumanMessage("请读取 ./src/tool-file-read.mjs 文件内容并解释代码,如果读不到请告诉我"),
];

let response = await modelWithTools.invoke(messages);

messages.push(response);

while (response.tool_calls && response.tool_calls.length > 0) {
  console.log(`监测到 ${response.tool_calls.length} 个工具调用`);

  const toolResults = await Promise.all(
    response.tool_calls.map(async (toolCall) => {
      const tool = tools.find((t) => t.name === toolCall.name);

      if (!tool) {
        return `找不到工具：${toolCall.name}`;
      }

      try {
        const result = await tool.invoke(toolCall.args);

        return result;
      } catch (e) {
        return JSON.stringify(e);
      }
    })
  );

  response.tool_calls.forEach((toolCall, idx) => {
    messages.push(
      new ToolMessage({
        content: toolResults[idx],
        tool_call_id: toolCall.id,
      })
    );
  });

  response = await modelWithTools.invoke(messages);
  messages.push(response);
}

console.log(`\n\n ${response.content}`);
