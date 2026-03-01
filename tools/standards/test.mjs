import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { REQUIRED_DIRS, normalizeText, readText } from "./shared.mjs";

const root = resolve(process.cwd());

assert.equal(
  normalizeText("a  \r\nb\t\r\n"),
  "a\nb\n",
  "normalizeText should trim trailing whitespace and normalize line endings"
);

for (const dir of REQUIRED_DIRS) {
  const readmePath = resolve(root, dir.split("/")[0], dir.split("/")[1] ?? "", "README.md");
  if (dir.startsWith("apps/") || dir.startsWith("packages/")) {
    assert.ok(existsSync(readmePath), `${dir} must include a README.md`);
    const content = readText(readmePath);
    assert.ok(content.length > 0, `${dir} must include a README.md`);
  }
}

const packageJson = JSON.parse(readText(resolve(root, "package.json")));
assert.ok(packageJson.private, "Root package.json must be private for monorepo safety");
assert.ok(
  Array.isArray(packageJson.workspaces) && packageJson.workspaces.length > 0,
  "Workspaces must be configured at root"
);
for (const scriptName of [
  "bootstrap",
  "dev",
  "lint",
  "contracts:check",
  "format",
  "format:check",
  "test"
]) {
  assert.ok(packageJson.scripts?.[scriptName], `Missing script: ${scriptName}`);
}

const backendPackage = JSON.parse(readText(resolve(root, "apps/backend/package.json")));
const frontendPackage = JSON.parse(readText(resolve(root, "apps/frontend/package.json")));
assert.ok(backendPackage.scripts?.dev, "Backend workspace must expose a dev script");
assert.ok(frontendPackage.scripts?.dev, "Frontend workspace must expose a dev script");

console.log("All bootstrap tests passed.");
