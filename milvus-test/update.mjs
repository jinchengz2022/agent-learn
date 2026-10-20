import "dotenv";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MilvusClient } from "@zilliz/milvus2-sdk-node";

const COLLECTION_NAME = "ai_diary";
const VECTOR_DIM = 1024;

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

const client = new MilvusClient({
  address: "localhost:19530",
});

const getEmbedding = async (text) => {
  const result = await embeddings.embedQuery(text);
  return result;
};

const main = async (id, content, date, mood, tags) => {
  try {
    console.log("connect milvus ...");
    await client.connectPromise;

    const updatedContent = {
      id,
      content,
      date,
      mood,
      tags,
    };

    const vector = await getEmbedding(updatedContent.content);
    const updateData = { ...updatedContent, vector };

    const res = await client.upsert({
      collection_name: COLLECTION_NAME,
      data: [updateData],
    });
  } catch (error) {
    console.error("Error connecting to Milvus:", error);
  }
};

main(
  "diary_001",
  "今天下了一整天的雨，心情很糟糕。工作上遇到了很多困难，感觉压力很大。一个人在家，感觉特别孤独。",
  "2026-01-10",
  "sad",
  ["生活", "散步", "朋友"],
);
