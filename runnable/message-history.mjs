import "dotenv/config";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { ChatOpenAI } from "@langchain/openai";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

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
  temperature: 0.3,
});

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "你是一个简洁、有帮助的中文助手，会用 1-2 句话回答用户问题，重点给出明确、有用的信息。",
  ],
  new MessagesPlaceholder("history"),
  ["human", "{question}"],
]);

const simpleChain = prompt.pipe(llm).pipe(new StringOutputParser());

const messageHistories = new Map();

const getMessageHistory = (sessionId) => {
  if (!messageHistories.has(sessionId)) {
    messageHistories.set(sessionId, new InMemoryChatMessageHistory());
  }
  return messageHistories.get(sessionId);
};

// 创建带消息历史的链
const chain = new RunnableWithMessageHistory({
  runnable: simpleChain,
  getMessageHistory: (sessionId) => getMessageHistory(sessionId),
  inputMessagesKey: "question",
  historyMessagesKey: "history",
});

// 测试：第一次对话
console.log("--- 第一次对话（提供信息） ---");
const result1 = await chain.invoke(
  {
    question: "我喜欢青椒肉丝，青椒肉丝怎么做",
  },
  {
    configurable: {
      sessionId: "user-123",
    },
  },
);
console.log("回答:", result1);

// 测试：第二次对话
console.log("--- 第二次对话（询问之前的信息） ---");
const result2 = await chain.invoke(
  {
    question: "我刚才说我喜欢什么",
  },
  {
    configurable: {
      sessionId: "user-123",
    },
  },
);
console.log("回答:", result2);

// 测试：第三次对话
console.log("--- 第三次对话（继续询问） ---");
const result3 = await chain.invoke(
  {
    question: "我的喜欢的菜需要什么食材",
  },
  {
    configurable: {
      sessionId: "user-123",
    },
  },
);
console.log("回答:", result3);
