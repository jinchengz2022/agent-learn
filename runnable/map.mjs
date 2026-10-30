import { PromptTemplate } from "@langchain/core/prompts";
import {
  RunnableLambda,
  RunnableMap,
  RunnableSequence,
} from "@langchain/core/runnables";
import "dotenv/config";

const add = RunnableLambda.from((input) => {
  return input.initNum + 1;
});

const min = RunnableLambda.from((input) => {
  return input.initNum - 10;
});

const promptTemplate1 = PromptTemplate.fromTemplate("hello {q1}");
const promptTemplate2 = PromptTemplate.fromTemplate("good {q2}");

const chain = RunnableMap.from({
  add,
  min,
  add,
  p1: promptTemplate1,
  p2: promptTemplate2,
});

const input = {
  q1: "what's you name?",
  q2: "how old are you?",
  initNum: 10,
};

const res = await chain.invoke(input);

console.log(res);
