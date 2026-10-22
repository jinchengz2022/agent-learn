import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

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

const inMemoryHistoryDemo = async () => {
  try {
    const history = new InMemoryChatMessageHistory();

    const systemMessage = new SystemMessage(
      "你是一个友好的做菜助手，帮助用户解决做菜问题。",
    );

    console.log("用户第一次提问：");
    const humanMessage1 = new HumanMessage(
      "我想做一道番茄炒蛋，请问需要哪些食材？",
    );
    await history.addMessage(humanMessage1);
    const answer1 = await history.getMessages();
    const message1 = [systemMessage, ...answer1];
    const res1 = await llm.invoke(message1);
    history.addMessage(res1);
    console.log("第一次提问结果", res1.content);

    console.log("用户第二次提问：");
    const humanMessage2 = new HumanMessage("炒菜时放料顺序是？");
    await history.addMessage(humanMessage2);
    const answer2 = await history.getMessages();
    const message2 = [systemMessage, ...answer2];
    const res2 = await llm.invoke(message2);
    history.addMessage(res2);
    console.log("第二次提问结果", res2.content);

    const allMsg = await history.getMessages();
    console.log(`共 ${allMsg.length} 条历史记录`);
  } catch (error) {
    console.error("memory error", error);
  }
};

inMemoryHistoryDemo()
