import { resolve } from "node:path";
import { ensureDirExists, ensureFileExists, REQUIRED_DIRS } from "./shared.mjs";

const root = resolve(process.cwd());
const errors = [];

if (typeof process.versions.node !== "string") {
  errors.push("Node.js runtime is required.");
} else {
  const major = Number(process.versions.node.split(".")[0] ?? 0);
  if (major < 20) {
    errors.push(`Node.js 20+ required. Current: ${process.versions.node}`);
  }
}

ensureFileExists(resolve(root, "package.json"), errors, "Missing root package.json.");
ensureFileExists(
  resolve(root, "packages/contracts/openapi/openapi.v1.yaml"),
  errors,
  "Missing OpenAPI contract at packages/contracts/openapi/openapi.v1.yaml."
);
for (const dir of REQUIRED_DIRS) {
  ensureDirExists(resolve(root, dir), errors, `Missing required path: ${dir}`);
}

for (const workspace of ["apps/backend", "apps/frontend", "infra/devops"]) {
  ensureFileExists(
    resolve(root, workspace, "package.json"),
    errors,
    `Missing workspace package.json at ${workspace}/package.json`
  );
}

if (errors.length > 0) {
  console.error("Bootstrap checks failed:");
  for (const err of errors) {
    console.error(`- ${err}`);
  }
  process.exit(1);
}

console.log("Bootstrap checks passed.");
console.log("Next steps:");
console.log("- npm run dev");
