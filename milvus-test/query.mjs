import "dotenv/config";
import { MilvusClient, MetricType } from "@zilliz/milvus2-sdk-node";
import { OpenAIEmbeddings } from "@langchain/openai";

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

const main = async (query) => {
  try {
    console.log("connect milvus ...");
    await client.connectPromise;

    console.log("query ...", query);
    const queryVector = await getEmbedding(query);
    console.log("query vector:");
    const searchRes = await client.search({
      collection_name: COLLECTION_NAME,
      vector: queryVector,
      metric_type: MetricType.COSINE,
      limit: 2,
      output_fields: ["id", "content", "date", "mood", "tags"],
    });

    searchRes.results.forEach((result, index) => {
      console.log(`Result ${index + 1}:`);
      console.log(`ID: ${result.id}`);
      console.log(`Content: ${result.content}`);
      console.log(`Date: ${result.date}`);
      console.log(`Mood: ${result.mood}`);
      console.log(`Tags: ${result.tags}`);
      console.log("-------------------------");
    });
  } catch (error) {
    console.error("Error connecting to Milvus:", error);
  }
};

main("户外活动日记");
