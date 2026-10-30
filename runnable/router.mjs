import {
  RouterRunnable,
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

const router = new RouterRunnable({
  runnables: {
    add,
    min,
  },
});

const res1 = await router.invoke({ key: "add", input: 10 });
const res2 = await router.invoke({ key: "min", input: 100 });
const res3 = await router.invoke({ key: "add", input: 0 });
console.log(res1, res2, res3);
