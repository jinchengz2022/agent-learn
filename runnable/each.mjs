import {
  RunnableEach,
  RunnableLambda,
  RunnableSequence,
} from "@langchain/core/runnables";
import "dotenv/config";

const add = RunnableLambda.from((input) => {
  return input + 1;
});

const min = RunnableLambda.from((input) => {
  return input - 10;
});

const processItem = RunnableSequence.from([add, min]);

const chain = new RunnableEach({
  bound: processItem,
});

const res = await chain.invoke([5, -10]);

console.log(res);
