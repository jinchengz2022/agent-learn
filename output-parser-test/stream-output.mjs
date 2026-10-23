import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import {
  JsonOutputParser,
  StructuredOutputParser,
} from "@langchain/core/output_parsers";
import { z } from "zod";
import {
  JsonOutputToolsParser
} from "@langchain/core/output_parsers/openai_tools";

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

const jsonOutputParser = new JsonOutputParser();
const jsonOutputToolParser = new JsonOutputToolsParser();
const structuredOutputParser = StructuredOutputParser.fromNamesAndDescriptions({
  name: "姓名",
  birth_year: "年龄",
  nationality: "国际",
  major_achievements: "成就",
  famous_theory: "理论",
});

const question1 = `请介绍一下爱因斯坦的信息。请以 JSON 格式返回，包含以下字段：name（姓名）、birth_year（出生年份）、nationality（国籍）、major_achievements（主要成就，数组）、famous_theory（著名理论）。

${jsonOutputParser.getFormatInstructions()}
`;

const question2 = `请介绍一下爱因斯坦的信息。请以 JSON 格式返回，包含以下字段：name（姓名）、birth_year（出生年份）、nationality（国籍）、major_achievements（主要成就，数组）、famous_theory（著名理论）。

${structuredOutputParser.getFormatInstructions()}
`;

// 使用 zod 定义复杂的输出结构
const scientistSchema = z.object({
  name: z.string().describe("科学家的全名"),
  birth_year: z.number().describe("出生年份"),
  death_year: z.number().optional().describe("去世年份，如果还在世则不填"),
  nationality: z.string().describe("国籍"),
  fields: z.array(z.string()).describe("研究领域列表"),
  awards: z
    .array(
      z.object({
        name: z.string().describe("奖项名称"),
        year: z.number().describe("获奖年份"),
        reason: z.string().optional().describe("获奖原因"),
      }),
    )
    .describe("获得的重要奖项列表"),
  major_achievements: z.array(z.string()).describe("主要成就列表"),
  famous_theories: z
    .array(
      z.object({
        name: z.string().describe("理论名称"),
        year: z.number().optional().describe("提出年份"),
        description: z.string().describe("理论简要描述"),
      }),
    )
    .describe("著名理论列表"),
  education: z
    .object({
      university: z.string().describe("主要毕业院校"),
      degree: z.string().describe("学位"),
      graduation_year: z.number().optional().describe("毕业年份"),
    })
    .optional()
    .describe("教育背景"),
  biography: z.string().describe("简短传记，100字以内"),
});
const zodParser = StructuredOutputParser.fromZodSchema(scientistSchema);

const question3 = `请介绍一下居里夫人（Marie Curie）的详细信息，包括她的教育背景、研究领域、获得的奖项、主要成就和著名理论。

${zodParser.getFormatInstructions()}
`;

const modelWithTool = llm.bindTools([
  {
    name: "extract_info",
    description: "科学家信息",
    schema: scientistSchema,
  },
]);

const modelWithStructureTool = llm.withStructuredOutput(scientistSchema);

console.log("q \n");

const main = async () => {
  console.log("llm start...");

  const res = await llm.stream("请介绍一下居里夫人");
  let fullContent = "";
  let chunkCount = 0;

  for await (const chunk of res) {
    chunkCount++;
    const content = chunk.content;
    fullContent += content;

    process.stdout.write(content);
  }
};

const structureStreamingDemo = async () => {
  console.log("llm start...");

  // 生成 json 后才输出，看不出 streaming 效果
  // const res = await modelWithStructureTool.stream('请介绍一下居里夫人');
  // let fullContent = '';
  // let chunkCount = 0;

  // for await(const chunk of res) {
  //   chunkCount++;
  //   console.log(JSON.stringify(chunk, null, 2));
  // }

  // 边生成边打印最后 parser
  const res = await llm.stream(question3);
  let fullContent = "";
  let chunkCount = 0;

  for await (const chunk of res) {
    chunkCount++;
    const content = chunk.content;
    fullContent += content;

    process.stdout.write(content);
  }
};

const chain = modelWithTool.pipe(jsonOutputToolParser);

const toolCallStreamingDemo = async () => {
  console.log("llm start...");

  // const res = await modelWithTool.stream('爱因斯坦的详细信息')

  // let chunkIndex = 0;

  // for await(const chunk of res) {
  //   chunkIndex++;

  //   if(chunk.tool_call_chunks && chunk.tool_call_chunks.length > 0) {
  //     process.stdout.write(chunk.tool_call_chunks[0].args)
  //   }
  // }

  const res = await chain.stream("爱因斯坦的详细信息");

  for await (const chunk of res) {
    if(chunk.length > 0) {
      const toolCall = chunk[0]
      console.log(toolCall.args);
      
    }
  }
};

toolCallStreamingDemo();
