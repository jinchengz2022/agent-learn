import {
  RunnableEach,
  RunnableLambda,
  RunnablePick,
  RunnableSequence,
} from "@langchain/core/runnables";
import "dotenv/config";

const info = {
  name: "lucy",
  age: 10,
  address: "beijing",
  sex: "female",
};

const chain = RunnableSequence.from([
  (i) => ({
    ...i,
    full: `name: ${i.name}`,
  }),
  new RunnablePick(["age", "full"]),
]);

const res = await chain.invoke(info);

console.log(res);
