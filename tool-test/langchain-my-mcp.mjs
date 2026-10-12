import "dotenv/config";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatOpenAI } from "@langchain/openai";
import chalk from "chalk";
import { ToolMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

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

const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    "my-mcp-server": {
      command: "node",
      args: ["/Users/jincheng/Desktop/agent-learn/tool-test/my-mcp-server.mjs"],
    },
  },
});

const listResource = await mcpClient.listResources();

let resourceContent = '';
for(const [serverName, resources] of Object.entries(listResource)) { 
  for(const resource of resources) {
    const content = await mcpClient.readResource(serverName, resource.uri);
    resourceContent += content[0].text;
  }
}

const tools = await mcpClient.getTools();
const modelWithTools = model.bindTools(tools);

const runAgentWithTools = async (query, maxIterations = 30) => { 
  const messages = [new SystemMessage(resourceContent), new HumanMessage(query)];

  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.greenBright('loading ...'));

    const response = await modelWithTools.invoke(messages);

    messages.push(response);

    if(!response.tool_calls || response.tool_calls.length === 0) {
      // console.log(`\n ai 最终回复 ${response.content}`);
      return response.content;
    }

    console.log(chalk.blueBright(`\n ai 调用工具 ${response.tool_calls.map((toolCall) => toolCall.tool_name).join(', ')}`));
    
    for(const toolCall of response.tool_calls) {
      const foundTool = tools.find((tool) => tool.name === toolCall.tool_name);

      if(foundTool) {
        const toolRes = await foundTool.invoke(toolCall.args);

        messages.push(new ToolMessage({
          content: toolRes,
          tool_call_id: toolCall.tool_call_id,
        }));
      }
    }
  }

  return messages[messages.length - 1].content;
}


try {
  // mcp server 使用指南是什么？
  const query = "调用 my-mcp-server 查询用户数据库中 006 的用户信息";
  const result = await runAgentWithTools(query);
  console.log(chalk.yellowBright(`\n最终结果: ${result}`));
  
  await mcpClient.close();
} catch (error) {
  console.error(chalk.redBright(`\n运行出错: ${error.message}`));
}