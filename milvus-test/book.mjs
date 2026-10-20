import "dotenv";
import {
  MilvusClient,
  IndexType,
  MetricType,
  DataType,
} from "@zilliz/milvus2-sdk-node";
import { OpenAIEmbeddings } from "@langchain/openai";
import { EPubLoader } from "@langchain/community/document_loaders/fs/epub";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const COLLECTION_NAME = "ai_books";
const VECTOR_DIM = 1024;
const BOOK_PATH = "/Users/jincheng/Downloads/海鸥才不管那么多.epub";
const CHUNK_SIZE = 500;
const BOOK_NAME = "海鸥才不管那么多";

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

const ensureCollection = async (bookId) => {
  try {
    const collectionExists = await client.hasCollection({
      collection_name: COLLECTION_NAME,
    });

    if (!collectionExists.value) {
      await client.createCollection({
        collection_name: COLLECTION_NAME,
        fields: [
          {
            name: "id",
            data_type: DataType.VarChar,
            is_primary_key: true,
            max_length: 100,
          },
          { name: "book_id", data_type: DataType.VarChar, max_length: 100 },
          { name: "book_name", data_type: DataType.VarChar, max_length: 100 },
          { name: "chapter_num", data_type: DataType.Int32 },
          { name: "index", data_type: DataType.Int32 },
          {
            name: "content",
            data_type: DataType.VarChar,
            max_length: 10000,
          },
          { name: "vector", data_type: DataType.FloatVector, dim: VECTOR_DIM },
        ],
      });

      await client.createIndex({
        collection_name: COLLECTION_NAME,
        field_name: "vector",
        index_type: IndexType.IVF_FLAT,
        metric_type: MetricType.COSINE,
        params: { nlist: 1024 },
      });
      console.log(`Collection ${COLLECTION_NAME} created.`);

      await client.loadCollection({
        collection_name: COLLECTION_NAME,
      });

      console.log(`Collection ${COLLECTION_NAME} loaded.`);
    } else {
      await client.dropCollection({ collection_name: COLLECTION_NAME });

      ensureCollection(bookId); // 递归调用以重新创建集合
      console.log(`Collection ${COLLECTION_NAME} already exists.`);
    }
  } catch (error) {
    console.error("Error ensuring collection:", error);
  }
};

const insertChunkBatch = async (bookId, chapterIndex, chunks) => {
  if (chunks.length === 0) {
    return 0;
  }

  try {
    const insertData = await Promise.all(
      chunks.map(async (chunk, chunkIndex) => {
        const vector = await getEmbedding(chunk);
        const obj = {
          id: `${bookId}_${chapterIndex}_${chunkIndex}`,
          book_id: bookId,
          book_name: BOOK_NAME,
          chapter_num: chapterIndex,
          index: chunkIndex,
          content: chunk,
          vector,
        };
        return obj;
      }),
    );

    const insertRes = await client.insert({
      collection_name: COLLECTION_NAME,
      data: insertData,
    });

    return Number(insertRes.insert_cnt) || 0;
  } catch (error) {
    console.error("Error inserting chunks:", error);
    return 0;
  }
};

const loadAndProcessEPubStreaming = async (bookId) => {
  try {
    console.log("Loading and processing EPUB file...");

    const loader = new EPubLoader(BOOK_PATH, {
      splitChapters: true,
    });

    const documents = await loader.load();
    console.log(`Loaded ${documents.length} documents from EPUB.`);

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: 50,
    });

    let totalInserted = 0;

    for (
      let chapterIndex = 0;
      chapterIndex < documents.length;
      chapterIndex++
    ) {
      const chapter = documents[chapterIndex];
      const chapterContent = chapter.pageContent;
      const chunks = await textSplitter.splitText(chapterContent);

      if (chunks.length === 0) {
        console.log(
          `No chunks generated for chapter ${chapterIndex}. Skipping...`,
        );
        continue;
      }

      const insertCount = await insertChunkBatch(bookId, chapterIndex + 1, chunks);
      totalInserted += insertCount;
    }

    return totalInserted;
  } catch (err) {
    console.error("Error loading and processing EPUB:", err);
  }
};



const main = async () => {
  try {
    console.log("connect milvus ...");
    await client.connectPromise;

    const bookId = 1;

    await ensureCollection(bookId);

    await loadAndProcessEPubStreaming(bookId);

    console.log("loaded ...");
  } catch (error) {
    console.error("Error connecting to Milvus:", error);
  }
};

main();
