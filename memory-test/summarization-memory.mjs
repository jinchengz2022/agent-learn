import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  getBufferString,
  trimMessages,
} from "@langchain/core/messages";
import { getEncoding } from "js-tiktoken";

const llm = new ChatOpenAI({
  apiKey:
    process.env.API_KEY ||
    "sk-ws-H.PLYPHDH.pInG.MEYCIQDaYqoWJ7impY3WpMy6jaPg5s5Uuh1RMUKtPtaCnWpoLAIhALi8nVY7K4sR7_0SDZg0dpufRYcnR9ImPT9rKsHjfD4Y",
  model: process.env.MODEL_NAME || "qwen3.8-flash",
  configuration: {
    baseURL:
      process.env.BASE_URL ||
      "https://ws-614wr0b4y1arhulc.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
  },
  temperature: 0,
});

const countTokens = (messages, enc) => {
  let total = 0;

  for (const msg of messages) {
    const content =
      typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content);

    total += enc.encode(content).length;
  }

  return total;
};

const summarizationDemo = async () => {
  const history = new InMemoryChatMessageHistory();
  const maxMessages = 5;
  const keepRecentTokens = 80
  const maxTokens = 200;
  const enc = getEncoding("cl100k_base");

  const messages = [
    { type: "human", content: "我想学做红烧肉，你能教我吗？" },
    {
      type: "ai",
      content:
        "当然可以！红烧肉是一道经典的中式菜肴。首先需要准备五花肉、冰糖、生抽、老抽、料酒等材料。",
    },
    { type: "human", content: "五花肉需要切多大块？" },
    {
      type: "ai",
      content:
        "建议切成3-4厘米见方的块，这样既容易入味，口感也更好。切好后可以用开水焯一下去除血沫。",
    },
    { type: "human", content: "炒糖色的时候有什么技巧吗？" },
    {
      type: "ai",
      content:
        "炒糖色是关键步骤。用小火慢慢炒，等冰糖完全融化变成焦糖色，冒小泡时就可以下肉了。注意不要炒过头，否则会发苦。",
    },
    { type: "human", content: "需要炖多长时间？" },
    {
      type: "ai",
      content:
        "一般需要炖40-60分钟，用小火慢炖，直到肉变得软糯入味。可以用筷子戳一下，能轻松戳透就说明好了。",
    },
    { type: "human", content: "最后收汁的时候要注意什么？" },
    {
      type: "ai",
      content:
        "收汁时要用大火，不断翻动，让汤汁均匀包裹在肉块上。看到汤汁变得浓稠，颜色红亮就可以出锅了。",
    },
  ];

  messages.forEach((d) => {
    if (d.type === "ai") {
      history.addMessage(new AIMessage(d.content));
    } else {
      history.addMessage(new HumanMessage(d.content));
    }
  });

  let allMsg = await history.getMessages();
  const totalCountTokens = countTokens(allMsg, enc);

  if (totalCountTokens >= maxTokens) {
    const recentMsgs = [];
    let recentTokens = 0;

    for (let i = allMsg.length - 1; i > 0; i--) {
      const msg = allMsg[i];
      const content =
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content);
          const currentMsgToken = enc.encode(content).length;

          if(recentTokens + currentMsgToken >= keepRecentTokens) {
            recentMsgs.unshift(msg)
            recentTokens += currentMsgToken
          }
    }

    const msgsToSummarize = allMsg.slice(0, allMsg.length - recentMsgs.length)
    const summarizeTokens = countTokens(msgsToSummarize, enc)

    console.log('被保留的消息数量：',msgsToSummarize.length)
    console.log('被保留的 Tokens ：',summarizeTokens)

    const summary = await summartizeHistory(msgsToSummarize);

    await history.clear();

    for (const msg of recentMsgs) {
      await history.addMessage(msg);
    }

    console.log("总结的信息：", summary);
  }
};

const summartizeHistory = async (messages) => {
  if (messages.length === 0) return "";

  const coversationText = getBufferString(messages, {
    humanPrefix: "用户",
    aiPrefix: "助手",
  });

  const summaryPrompt = `请总结一下内容，保留重要信息

${coversationText}

总结：`;

  const aiRes = await llm.invoke([new SystemMessage(summaryPrompt)]);

  return aiRes.content;
};

summarizationDemo();
