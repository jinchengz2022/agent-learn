import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import mysql from "mysql2/promise";

const llm = new ChatOpenAI({
  apiKey:
    process.env.API_KEY ||
    "sk-ws-H.PLYPHDH.pInG.MEYCIQDaYqoWJ7impY3WpMy6jaPg5s5Uuh1RMUKtPtaCnWpoLAIhALi8nVY7K4sR7_0SDZg0dpufRYcnR9ImPT9rKsHjfD4Y",
  model: process.env.MODEL_NAME || "qwen3.7-plus",
  configuration: {
    baseURL:
      process.env.BASE_URL ||
      "https://ws-614wr0b4y1arhulc.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
  },
  temperature: 0,
});

const connectionConfig = {
  host: "localhost",
  port: 3306,
  user: "root",
  password: "202411",
  multipleStatements: true,
};

const friendSchema = z.object({
  name: z.string().describe("姓名"),
  gender: z.string().describe("性别（男/女）"),
  birth_date: z
    .string()
    .describe("出生日期，格式：YYYY-MM-DD，如果无法确定具体日期，根据年龄估算"),
  company: z.string().nullable().describe("公司名称，如果没有则返回 null"),
  title: z.string().nullable().describe("职位/头衔，如果没有则返回 null"),
  phone: z.string().nullable().describe("手机号，如果没有则返回 null"),
  wechat: z.string().nullable().describe("微信号，如果没有则返回 null"),
});

const friendsArraySchema = z.array(friendSchema).describe("好友信息数组");

const structureModel = llm.withStructuredOutput(friendsArraySchema);

const extractAndInsertData = async (text) => {
  const connection = await mysql.createConnection(connectionConfig);

  try {
    await connection.query("USE hello");

    const prompt = `请从以下文本中提取所有好友信息，文本中可能包含一个或多个人的信息。请将每个人的信息分别提取出来，返回一个数组。

${text}

要求：
1. 如果文本中包含多个人，请为每个人创建一个对象
2. 每个对象包含以下字段：
   - 姓名：提取文本中的人名
   - 性别：提取性别信息（男/女）
   - 出生日期：如果能找到具体日期最好，否则根据年龄描述估算（格式：YYYY-MM-DD）
   - 公司：提取公司名称
   - 职位：提取职位/头衔信息
   - 手机号：提取手机号码
   - 微信号：提取微信号
3. 如果某个字段在文本中找不到，请返回 null
4. 返回格式必须是一个数组，即使只有一个人也要放在数组中`;

    const aiRes = await structureModel.invoke(prompt);

    if (aiRes.length === 0) {
      console.log("没有提取到有效信息");
      return { count: 0, insertIds: [] };
    }
    console.log("extract data: ", JSON.stringify(aiRes));

    const insertSql = `
      INSERT INTO friends (
        name,
        gender,
        birth_date,
        company,
        title,
        phone,
        wechat
      ) VALUES ?;
    `;

    const values = aiRes.map((i) => [
      i.name,
      i.gender,
      i.birth_date || null,
      i.company,
      i.title,
      i.phone,
      i.wechat,
    ]);

    const [insertData] = await connection.query(insertSql, [values]);
    console.log(`成功插入：${insertData.affectedRows} 条数据`);

    return { count: insertData.affectedRows, insertIds: [] };
  } catch (error) {
    console.log("extract error", error);
  } finally {
    connection.end();
    return { count: 0, insertIds: [] };
  }
};

const main = async () => {
  try {
    const info =
      "我最近认识了几个新朋友。第一个是张总，女的，看起来30出头，在腾讯做技术总监，手机13800138000，微信是zhangzong2024。第二个是李工，男，大概28岁，在阿里云做架构师，电话15900159000，微信号lee_arch。还有一个是陈经理，女，35岁左右，在美团做产品经理，手机号是18800188000，微信chenpm2024。";

    const res = await extractAndInsertData(info);
    console.log("success", res.count);
  } catch (error) {
    console.log("error", error);
  }
};

main();
