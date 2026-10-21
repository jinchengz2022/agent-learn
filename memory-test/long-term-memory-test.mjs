import "dotenv/config";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { FileSystemChatMessageHistory } from "@langchain/community/stores/message/file_system";
import path from "node:path";

const llm = new ChatOpenAI({
  apiKey:
    process.env.API_KEY ||
    "sk-ws-H.PLYPHDH.pInG.MEYCIQDaYqoWJ7impY3WpMy6jaPg5s5Uuh1RMUKtPtaCnWpoLAIhALi8nVY7K4sR7_0SDZg0dpufRYcnR9ImPT9rKsHjfD4Y",
  model: process.env.MODEL_NAME || "deepseek-v4.1-flash",
  configuration: {
    baseURL:
      process.env.BASE_URL ||
      "https://ws-614wr0b4y1arhulc.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
  },
  temperature: 0,
});

const longTermMemory = async () => {
  const filePath = path.join(process.cwd(), "chat_history.json");
  const sessionId = "user_session_1";

  const systemMessage = new SystemMessage(
    "你是一个友好的做菜助手，帮助用户解决做菜问题。",
  );

  const history = new FileSystemChatMessageHistory({
    filePath,
    sessionId,
  });

  console.log("用户第一次提问：");
  const userMsg1 = new HumanMessage("新疆大盘鸡怎么做？");
  await history.addMessage(userMsg1);
  const historyRes1 = await history.getMessages();
  const msg1 = [systemMessage, ...historyRes1];
  const aiRes1 = await llm.invoke(msg1);
  await history.addMessage(aiRes1);
  console.log("第一次回答：", aiRes1.content);

  console.log("用户第二次提问：");
  const userMsg2 = new HumanMessage("烹饪顺序是？");
  await history.addMessage(userMsg2);
  const historyRes2 = await history.getMessages();
  const msg2 = [systemMessage, ...historyRes2];
  const aiRes2 = await llm.invoke(msg2);
  await history.addMessage(aiRes2);
  console.log("第二次回答：", aiRes2.content);
};

const longTermMemory2 = async () => {
  const filePath = path.join(process.cwd(), "chat_history.json");
  const sessionId = "user_session_1";

  const systemMessage = new SystemMessage(
    "你是一个友好的做菜助手，帮助用户解决做菜问题。",
  );

  const history = new FileSystemChatMessageHistory({
    filePath,
    sessionId,
  });

  const restoreHistory = await history.getMessages();
  console.log('历史数据：',restoreHistory.length)

  console.log("用户第三次提问：");
  const userMsg1 = new HumanMessage("需要哪些食材？");
  await history.addMessage(userMsg1);
  const historyRes1 = await history.getMessages();
  const msg1 = [systemMessage, ...historyRes1];
  const aiRes1 = await llm.invoke(msg1);
  await history.addMessage(aiRes1);
  console.log("第三次回答：", aiRes1.content);
};
longTermMemory2()