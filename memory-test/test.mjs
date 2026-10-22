import "dotenv";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import {
  MilvusClient,
  MetricType,
  DataType,
  IndexType,
} from "@zilliz/milvus2-sdk-node";
import { HumanMessage } from "@langchain/core/messages";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";

const COLLECTION_NAME = "ai_conversation_test1";
const VECTOR_DIM = 1024;

const conversations = [
  { input: "我之前提到的机器学习项目进展如何？" },
  { input: "我周末经常做什么？" },
  { input: "我的职业是什么？" },
];

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

const milvusClient = new MilvusClient({
  address: "localhost:19530",
});

const embeddings = new OpenAIEmbeddings({
  apiKey:
    process.env.API_KEY ||
    "sk-ws-H.PLYPHDH.pInG.MEYCIQDaYqoWJ7impY3WpMy6jaPg5s5Uuh1RMUKtPtaCnWpoLAIhALi8nVY7K4sR7_0SDZg0dpufRYcnR9ImPT9rKsHjfD4Y",
  model: process.env.EMBEDDING_MODEL_NAME || "text-embedding-v3",
  configuration: {
    baseURL:
      process.env.BASE_URL ||
      "https://ws-614wr0b4y1arhulc.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
  },
  dimensions: VECTOR_DIM,
});

const getEmbedding = async (text) => {
  const result = await embeddings.embedQuery(text);
  return result;
};

const insertToMilvus = async () => {
  try {
    await milvusClient.connectPromise;

    await milvusClient.createCollection({
      collection_name: COLLECTION_NAME,
      fields: [
        {
          name: "id",
          data_type: DataType.VarChar,
          max_length: 50,
          is_primary_key: true,
        },
        { name: "vector", data_type: DataType.FloatVector, dim: VECTOR_DIM },
        { name: "content", data_type: DataType.VarChar, max_length: 5000 },
        { name: "timestamp", data_type: DataType.VarChar, max_length: 100 },
        { name: "round", data_type: DataType.Int32 },
      ],
    });

    await milvusClient.createIndex({
      collection_name: COLLECTION_NAME,
      field_name: "vector",
      index_type: IndexType.IVF_FLAT,
      metric_type: MetricType.COSINE,
    });

    await milvusClient.loadCollection({ collection_name: COLLECTION_NAME });

    const conversations = [
      {
        id: "conv_001",
        content:
          "用户: 我叫赵六，是一名数据科学家\n助手: 很高兴认识你，赵六！数据科学是一个很有趣的领域。",
        round: 1,
        timestamp: new Date().toISOString(),
      },
      {
        id: "conv_002",
        content:
          "用户: 我最近在研究机器学习算法\n助手: 机器学习确实很有意思，你在研究哪些算法呢？",
        round: 2,
        timestamp: new Date().toISOString(),
      },
      {
        id: "conv_003",
        content:
          "用户: 我喜欢打篮球和看电影\n助手: 运动和文化娱乐都是很好的爱好！",
        round: 3,
        timestamp: new Date().toISOString(),
      },
      {
        id: "conv_004",
        content: "用户: 我周末经常去电影院\n助手: 看电影是很好的放松方式。",
        round: 4,
        timestamp: new Date().toISOString(),
      },
      {
        id: "conv_005",
        content:
          "用户: 我的职业是软件工程师\n助手: 软件工程师是个很有前景的职业！",
        round: 5,
        timestamp: new Date().toISOString(),
      },
    ];

    const insertData = await Promise.all(
      conversations.map(async (c) => ({
        ...c,
        vector: await getEmbedding(c.content),
      })),
    );

    await milvusClient.insert({
      data: insertData,
      collection_name: COLLECTION_NAME,
    });
  } catch (error) {
    console.log("insert error", error);
  }
};

const retrieveRelevantConversation = async (query, k = 2) => {
  
  try {
    const queryVector = await getEmbedding(query);

    const searchData = await milvusClient.search({
      collection_name: COLLECTION_NAME,
      vector: queryVector,
      limit: k,
      metric_type: MetricType.COSINE,
      output_fields: ["id", "content", "round", "timestamp"],
    });

    return searchData.results;
  } catch (error) {
    console.log("retrieveRelevantConversation error", error);
    return []
  }
};

const writeHistory = async () => {
  try {
    const history = new InMemoryChatMessageHistory();

    for (let i = 0; i < conversations.length; i++) {
      const { input } = conversations[i];
      const userInput = new HumanMessage(input);

      const retrievedConversation = await retrieveRelevantConversation(
        input,
        2,
      );

      let retriHistory = "";
      if (retrievedConversation.length > 0) {
        retriHistory = retrievedConversation
          .map((c, idx) => {
            console.log(
              `\n[历史对话 ${idx + 1}] 相似度: ${c.score.toFixed(4)}`,
            );
            console.log(`轮次: ${c.round}`);
            console.log(`内容: ${c.content}`);

            return `历史对话：${idx + 1}
        轮次：${c.round}
        内容: ${c.content}`;
          })
          .join("\n\n");
      }

      const contextMesgs = retriHistory
        ? [
            new HumanMessage(
              `相关历史会话：${retriHistory} \n\n 用户问题：${input}`,
            ),
          ]
        : [userInput];
      const aiRes = await llm.invoke(contextMesgs);

      await history.addMessage(userInput);
      await history.addMessage(aiRes);

      const conversationText = `用户问题：${userInput} \n\n AI 回答：${aiRes.content}`;
      const id = `conversation_${Date.now()}_${i + 1}`;
      const idVector = await getEmbedding(conversationText);

      await milvusClient.insert({
        collection_name: COLLECTION_NAME,
        data: [
          {
            id,
            vector: idVector,
            content: conversationText,
            round: i + 1,
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }
  } catch (error) {
    console.log("wirteHistory error", error);
  }
};

await insertToMilvus();
await writeHistory();
