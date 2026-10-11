import { spawn } from "node:child_process";

const command = "ls -la";
const cwd = process.cwd();

const [cmd, ...args] = command.split(" ");

const child = spawn(cmd, args, { cwd, stdio: "inherit", shell: true });

let errMsg = '';

child.on('error', (error) => {
  errMsg = error.message;
})

child.on('close', (code) => {
  if(code === 0) {
    process.exit(0);
  } else {
    if(errMsg) {
      console.error('error: ', errMsg);
    }

    process.exit(code || 1)
  }
})
