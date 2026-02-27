import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

export const REQUIRED_DIRS = [
  "apps/backend",
  "apps/frontend",
  "packages/contracts",
  "infra",
  "docs",
  "tools/standards"
];

const IGNORED_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "target",
  "out"
]);

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".json",
  ".yml",
  ".yaml",
  ".xml",
  ".html",
  ".css",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".kt",
  ".kts",
  ".java",
  ".sql",
  ".gradle",
  ".properties",
  ".editorconfig",
  ".gitattributes",
  ".gitignore"
]);

export function collectFiles(rootDir) {
  const results = [];
  walk(rootDir, results);
  return results;
}

function walk(dir, results) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIR_NAMES.has(entry.name)) {
        continue;
      }
      walk(join(dir, entry.name), results);
      continue;
    }

    results.push(join(dir, entry.name));
  }
}

export function isTextFile(filePath) {
  const ext = extname(filePath);
  if (TEXT_EXTENSIONS.has(ext)) {
    return true;
  }

  return ["LICENSE", "README"].some((prefix) =>
    filePath.toUpperCase().includes(prefix)
  );
}

export function ensureFileExists(path, errors, message) {
  try {
    const info = statSync(path);
    if (!info.isFile()) {
      errors.push(message);
    }
  } catch {
    errors.push(message);
  }
}

export function ensureDirExists(path, errors, message) {
  try {
    const info = statSync(path);
    if (!info.isDirectory()) {
      errors.push(message);
    }
  } catch {
    errors.push(message);
  }
}

export function normalizeText(text) {
  const lf = text.replace(/\r\n/g, "\n");
  const trimmed = lf
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n");

  return trimmed.endsWith("\n") ? trimmed : `${trimmed}\n`;
}

export function readText(path) {
  return readFileSync(path, "utf8");
}

export function writeText(path, content) {
  writeFileSync(path, content, "utf8");
}
