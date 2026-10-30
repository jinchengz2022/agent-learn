import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import "dotenv/config";

const add = RunnableLambda.from((input) => {
  console.log("add input: ", input);
  return input + 1;
});

const min = RunnableLambda.from((input) => {
  console.log("min input", input);
  return input - 10;
});

const chain = RunnableSequence.from([add, min, add]);

const res = await chain.invoke(5);

console.log(`res ${res}`);
