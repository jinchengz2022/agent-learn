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
        "amap-maps-streamableHTTP": {
            "url": `https://mcp.amap.com/mcp?key=${process.env.AMAP_API_KEY}`
        },
        "filesystem": {
            "command": "npx",
            "args": [
                "-y",
                "@modelcontextprotocol/server-filesystem",
                process.env.ALLOWED_PATHS
            ]
        },
        "chrome-devtools": {
            "command": "npx",
            "args": [
                "-y",
                "chrome-devtools-mcp@latest"
            ]
        }
    },
});

const tools = await mcpClient.getTools();

const modelWithTools = model.bindTools(tools);

const runAgentWithTools = async (query, maxIterations = 30) => {
    const messages = [new HumanMessage(query)];

    for (let i = 0; i < maxIterations; i++) {
        console.log(chalk.green('ai loading ...'));

        const response = await modelWithTools.invoke(messages);

        messages.push(response);

        if (!response.tool_calls || response.tool_calls.length === 0) {
            return response.content;
        }

        for (const toolCall of response.tool_calls) {
            const foundToolCall = tools.find(tool => tool.name === toolCall.name);

            if (foundToolCall) {
                const toolRes = await foundToolCall.invoke(toolCall.args);
                messages.push(new ToolMessage({
                    content: toolRes,
                    toolCallId: toolCall.id,
                }));
            }
        }

    }

    return messages[messages.length - 1].content;
}

try {
    const query = "请告诉我北京故宫附近的5家酒店地址并将该信息写入到 /Users/jincheng/Desktop/agent-learn/tool-test/hotel.txt 文件中，最后使用浏览器打开展示该文件信息";
    const result = await runAgentWithTools(query);
    console.log(chalk.yellowBright(`\n最终结果: ${result}`));
} catch (error) {
    console.error(chalk.redBright(`\n运行出错: ${error.message}`));
}
mcpClient.close();
