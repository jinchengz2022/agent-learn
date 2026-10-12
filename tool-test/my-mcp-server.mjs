import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// 数据库
const database = {
  users: {
    "001": {
      id: "001",
      name: "张三",
      email: "zhangsan@example.com",
      role: "admin",
    },
    "002": { id: "002", name: "李四", email: "lisi@example.com", role: "user" },
    "003": {
      id: "003",
      name: "王五",
      email: "wangwu@example.com",
      role: "user",
    },
  },
};

const server = new McpServer({
  name: "my-mcp-server",
  version: "1.0.0",
});

server.registerTool(
  "query_user",
  {
    description: "查询用户数据库数据",
    inputSchema: {
      userId: z.string().describe("用户 id"),
    },
  },
  async ({ userId }) => {
    const user = database.users[userId];

    if (!user) {
      return {
        content: [{ type: "text", text: `用户 id ${userId} 不存在` }],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `用户信息 ---- id:${user.id} name:${user.name} email: ${user.email}`,
        },
      ],
    };
  }
);

server.registerResource(
  "使用指南",
  "docs://guide",
  {
    description: "mcp 使用文档",
    mimeType: "text/plain",
  },
  async () => {
    return {
      contents: [
        {
          uri: "docs://guide",
          mimeType: "text/plain",
          text: `mcp server 使用指南 
      可查询用户数据
      使用：在 cursor 等 mcp client 中通过自然对话
      `,
        },
      ],
    };
  }
);


const transport = new StdioServerTransport();
await server.connect(transport);
