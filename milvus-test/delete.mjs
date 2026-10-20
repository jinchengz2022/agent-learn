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

const main = async () => {
  try {
    console.log("connect milvus ...");
    await client.connectPromise;

    const id = "diary_004"; // Specify the ID of the document to delete
    const res = await client.delete({
      collection_name: COLLECTION_NAME,
      filter: `id == "${id}"`, // 注意这里的 filter 语法，确保与 Milvus 的查询语法一致
    });
    console.log(`Deleted to id. res: ${res.delete_cnt}`);

    const ids = ["diary_004", "diary_005"];
    const idsStr = ids.map((id) => `"${id}"`).join(",");
    const batchDeleteRes = await client.delete({
      collection_name: COLLECTION_NAME,
      filter: `id in [${idsStr}]`,
    });
    console.log(`Batch deleted ids. res: ${batchDeleteRes.delete_cnt}`);

    const filterToMood = "happy";
    const moodDeleteRes = await client.delete({
      collection_name: COLLECTION_NAME,
      filter: `mood == "${filterToMood}"`,
    });
    console.log(
      `Deleted documents with mood "${filterToMood}". res: ${moodDeleteRes.delete_cnt}`
    );
  } catch (error) {
    console.error("Error connecting to Milvus:", error);
  }
};

main();
