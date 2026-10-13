import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { Document } from '@langchain/core/documents'
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory'
import chalk from "chalk";

const model = new ChatOpenAI({
    modelName: process.env.MODAL_NAME || "deepseek-v4.1-flash",
    temperature: 0,
    apiKey:
        process.env.API_KEY ||
        "sk-ws-H.PLYPHDH.pInG.MEYCIQDaYqoWJ7impY3WpMy6jaPg5s5Uuh1RMUKtPtaCnWpoLAIhALi8nVY7K4sR7_0SDZg0dpufRYcnR9ImPT9rKsHjfD4Y",
    configuration: {
        baseURL:
            process.env.BASE_URL ||
            "https://ws-614wr0b4y1arhulc.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    },
});

const embeddings = new OpenAIEmbeddings({
    apiKey: process.env.API_KEY || "sk-ws-H.PLYPHDH.pInG.MEYCIQDaYqoWJ7impY3WpMy6jaPg5s5Uuh1RMUKtPtaCnWpoLAIhALi8nVY7K4sR7_0SDZg0dpufRYcnR9ImPT9rKsHjfD4Y",
    model: process.env.EMBEDDING_MODEL_NAME || "text-embedding-v3",
    configuration: {
        baseURL:
            process.env.BASE_URL ||
            "https://ws-614wr0b4y1arhulc.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    },
})

const documents = [
    new Document({
        pageContent: 'Tom 今年10岁',
        metadata: {
            chapter: 1,
            character: 'Tom',
            type: '角色介绍',
            mood: '悲伤',
        }
    }),
    new Document({
        pageContent: 'Tom 喜欢交朋友，喜欢运动',
        metadata: {
            chapter: 2,
            character: 'Tom',
            type: '角色介绍',
            mood: '快乐',
        }
    }),
    new Document({
        pageContent: 'Tom 不喜欢别人大声说话',
        metadata: {
            chapter: 3,
            character: 'Tom',
            type: '角色介绍',
            mood: '幸福',
        }
    }),
]

const vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddings);

// 看是否需要，这里可以限制查询最相关的信息的数量
// const retriever = vectorStore.asRetriever({ k: 3 });

const questions = ['Tom 的性格特征？']

for (const q of questions) {
    const scoredResults = await vectorStore.similaritySearchWithScore(q, 3);

    scoredResults.forEach(([doc, scoreRes], idx) => {
        const score = scoreRes ? scoreRes : null;
        const similarity = score ? score.toFixed(4) : 'N/A'
        console.log(chalk.red(`相似度：${similarity}`));

    });

    const context = scoredResults.map(([doc], idx) => `片段 ${idx + 1}\n${doc.pageContent}`).join('\n\n')

    const prompt = `你是一个心理医生，基于下面的人物信息回答问题。
    人物信息：${context}

    问题：${q}

    医生的回答：
    `

    console.log(chalk.green('ai answer'));
    const res = await model.invoke(prompt);
    console.log(chalk.blueBright(res.content));
    console.log('\n');
}