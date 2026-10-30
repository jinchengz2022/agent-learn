import {
  RunnableBranch,
  RunnableLambda,
  RunnableSequence,
} from "@langchain/core/runnables";
import "dotenv/config";

const big = RunnableLambda.from((input) => {
  return input > 10;
});

const small = RunnableLambda.from((input) => {
  return input <= 10;
});

const firstNum = RunnableLambda.from((input) => {
  return input + 20;
});
const secondNum = RunnableLambda.from((input) => {
  return input - 15;
});
const defaultNum = RunnableLambda.from((input) => {
  return input;
});

// if else
const chain = RunnableBranch.from([
  [big, secondNum],
  [small, firstNum],
  defaultNum,
]);

const testArr = [5, 20];

for (const a of testArr) {
  console.log("input num: ", a);

  const res = await chain.invoke(a);

  console.log(`res ${res}`);
}
