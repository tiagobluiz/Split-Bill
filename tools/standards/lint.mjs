import { relative, resolve } from "node:path";
import {
  REQUIRED_DIRS,
  collectFiles,
  ensureDirExists,
  ensureFileExists,
  isTextFile,
  normalizeText,
  readText
} from "./shared.mjs";

const root = resolve(process.cwd());
const errors = [];

for (const dir of REQUIRED_DIRS) {
  ensureDirExists(resolve(root, dir), errors, `Missing required directory: ${dir}`);
}

ensureFileExists(resolve(root, "package.json"), errors, "Missing root package.json");
ensureFileExists(resolve(root, ".editorconfig"), errors, "Missing .editorconfig");
ensureFileExists(resolve(root, ".gitattributes"), errors, "Missing .gitattributes");

const files = collectFiles(root);
for (const file of files) {
  if (!isTextFile(file)) {
    continue;
  }

  const content = readText(file);
  const normalized = normalizeText(content);
  if (content !== normalized) {
    const shortName = relative(root, file);
    errors.push(`Formatting drift in ${shortName}. Run: npm run format`);
  }
}

const rootPackage = JSON.parse(readText(resolve(root, "package.json")));
for (const scriptName of ["bootstrap", "dev", "lint", "format", "format:check", "test"]) {
  if (!rootPackage.scripts || !rootPackage.scripts[scriptName]) {
    errors.push(`Missing npm script: ${scriptName}`);
  }
}

for (const workspacePath of ["apps/backend", "apps/frontend", "infra/devops"]) {
  ensureFileExists(
    resolve(root, workspacePath, "package.json"),
    errors,
    `Missing workspace package.json: ${workspacePath}/package.json`
  );
}

if (errors.length > 0) {
  console.error("Lint failed:");
  for (const err of errors) {
    console.error(`- ${err}`);
  }
  process.exit(1);
}

console.log("Lint passed.");
