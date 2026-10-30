import {
  RunnableLambda,
  RunnableMap,
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import "dotenv/config";

const add = RunnableLambda.from((input) => {
  return input + 1;
});

const min = RunnableLambda.from((input) => {
  return input - 10;
});

const runnablemap = RunnableMap.from({
  add,
  min,
  original: new RunnablePassthrough(),
});

const chain = RunnableSequence.from([add, runnablemap]);

const res = await chain.invoke(5);

console.log(res);
