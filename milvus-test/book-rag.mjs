import "dotenv/config";
import { MilvusClient, MetricType } from "@zilliz/milvus2-sdk-node";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";

const COLLECTION_NAME = "ai_books";
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
  temperature: 0.7,
});

const client = new MilvusClient({
  address: "localhost:19530",
});

const getEmbedding = async (text) => {
  const result = await embeddings.embedQuery(text);
  return result;
};

const retrieveRelevantContent = async (q, k = 3) => {
  try {
    const queryVector = await getEmbedding(q);

    const searchRes = await client.search({
      collection_name: COLLECTION_NAME,
      vector: queryVector,
      metric_type: MetricType.COSINE,
      limit: k,
      output_fields: [
        "id",
        "book_id",
        "book_name",
        "chapter_num",
        "index",
        "content",
      ],
    });
    return searchRes.results;
  } catch (error) {
    console.error("Error retrieving relevant content:", error);
    return [];
  }
};

const answerBookQuestion = async (question, k = 3) => {
  try {
    console.log("question:", question);

    const relevantContents = await retrieveRelevantContent(question, k);

    if (relevantContents.length === 0) {
      console.log("No relevant content found.");
      return "No relevant content found.";
    }

    const context = relevantContents
      .map((item, index) => {
        return `片段： ${index + 1}:\n 内容：${item.content}\n`;
      })
      .join("\n");

    const prompt = `你是一个专业的《海鸥才不管那么多》小说助手。请根据以下内容回答用户的问题。
  如果无法从内容中找到答案，请礼貌地说明无法回答。
  
  请根据以下书本部分回答下面问题：
  ${context}

  用户问题：${question}
  
  回答要求：
  1. 如果片段中有相关信息，请结合小说内容给出详细、准确的回答
2. 可以综合多个片段的内容，提供完整的答案
3. 如果片段中没有相关信息，请如实告知用户
4. 回答要准确，符合小说的情节和人物设定
5. 可以引用原文内容来支持你的回答

AI 助手的回答:
  `;

    console.log("ai answer:");
    const aiRes = await llm.invoke(prompt);

    return aiRes.content;
  } catch (error) {
    console.error("Error answering book question:", error);
  }
};

const main = async (question) => {
  try {
    console.log("connect milvus ...");
    await client.connectPromise;

    try {
      await client.loadCollection({ collection_name: COLLECTION_NAME });
      console.log(`Collection ${COLLECTION_NAME} loaded.`);
    } catch (error) {
      console.error(`Error loading collection ${COLLECTION_NAME}:`, error);
    }

    const answer = await answerBookQuestion(question, 3);
    console.log("Final Answer:", answer);
  } catch (error) {
    console.error("Error connecting to Milvus:", error);
  }
};

main("蒂娜是谁");
