import { tool } from "@langchain/core/tools";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { z } from "zod";

const readFileTool = tool(
  async ({ filePath }) => {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      console.log(
        `  [工具调用] read_file("${filePath}") - 成功读取 ${content.length} 字节`
      );

      return `文件内容${content}`;
    } catch (error) {
      return `文件读取失败：${filePath}`;
    }
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

const writeFileTool = tool(
  async ({ filePath, content }) => {
    try {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await writeFile(filePath, content, "utf-8");

      console.log(
        `  [工具调用] write_file("${filePath}") - 成功读取 ${content.length} 字节`
      );
      return `文件写入成功： ${filePath}`;
    } catch (error) {
      return `文件写入失败：${filePath}`;
    }
  },
  {
    name: "write_file",
    description: "对指定路径写入内容",
    schema: z.object({
      filePath: z.string().describe("文件路径"),
      content: z.string().describe("要写入的文件内容"),
    }),
  }
);

const execCommandTool = tool(
  async ({ command, workingDirectory }) => {
    try {
      const cwd = workingDirectory || process.cwd();

      console.log(
        `  [工具调用] execCommand("${command}") - 工作目录：${workingDirectory}`
      );
      return new Promise((res, rej) => {
        const [cmd, ...args] = command.split(" ");
        const child = spawn(cmd, args, {
          cwd,
          stdio: "inherit",
          shell: true,
        });

        let errMsg = "";

        child.on("error", (error) => {
          errMsg = error.message;
        });

        child.on("close", (code) => {
          if (code === 0) {
            console.log(`工具调用：${command} success`);
            const cwdInfo = workingDirectory
              ? `\n 提示：命令在 ${workingDirectory} 执行成功，如果需要继续执行请使用 ${workingDirectory} 参数`
              : "";
            res(`命令执行成功：${command} ${cwdInfo}`);
          } else {
            console.log(`工具调用：${command} error`);
            res(`命令执行失败：code ${code} command ${command}`);
          }
        });
      });
    } catch (error) {
      return `命令执行失败失败：${filePath}`;
    }
  },
  {
    name: "execute_command",
    description: "执行系统命令，实时显示输出",
    schema: z.object({
      command: z.string().describe("执行的命令"),
      workingDirectory: z.string().describe("工作目录"),
    }),
  }
);

const listDirTool = tool(
  async ({ directory }) => {
    try {
      const files = await fs.readdir(directory);

      console.log(
        `  [工具调用] list_directory("${directory}") - 找到 ${files.length} 个文件`
      );
      return `目录内容： ${files.map((i) => `name: ${i}`).join("\n")}`;
    } catch (error) {
      return `展示目录失败：${directory}`;
    }
  },
  {
    name: "list_directory",
    description: "列出指定目录下的文件和文件夹",
    schema: z.object({
      derectoryPath: z.string().describe("目录路径"),
    }),
  }
);

export { listDirTool, execCommandTool, readFileTool, writeFileTool };
