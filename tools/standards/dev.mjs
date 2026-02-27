import { spawn } from "node:child_process";

const commands = [
  { name: "backend", args: ["run", "dev", "--workspace", "@split-bill/backend"] },
  { name: "frontend", args: ["run", "dev", "--workspace", "@split-bill/frontend"] }
];

const children = [];

for (const cmd of commands) {
  const child = spawn("npm", cmd.args, {
    stdio: "inherit",
    shell: true
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      shutdown(code ?? 1);
    }
  });

  children.push(child);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

function shutdown(code) {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  process.exit(code);
}
