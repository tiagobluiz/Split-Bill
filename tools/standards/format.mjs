import { resolve } from "node:path";
import { collectFiles, isTextFile, normalizeText, readText, writeText } from "./shared.mjs";

const root = resolve(process.cwd());
const mode = process.argv.includes("--check") ? "check" : "write";
const files = collectFiles(root).filter((file) => isTextFile(file));

const dirty = [];
for (const file of files) {
  const content = readText(file);
  const normalized = normalizeText(content);
  if (content === normalized) {
    continue;
  }

  dirty.push(file);
  if (mode === "write") {
    writeText(file, normalized);
  }
}

if (mode === "check" && dirty.length > 0) {
  console.error("Formatting check failed. Run: npm run format");
  for (const file of dirty) {
    console.error(`- ${file.replace(`${root}\\`, "")}`);
  }
  process.exit(1);
}

if (mode === "write") {
  console.log(`Formatted ${dirty.length} file(s).`);
} else {
  console.log("Formatting check passed.");
}
