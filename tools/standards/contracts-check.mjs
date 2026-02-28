import { resolve } from "node:path";
import { readText } from "./shared.mjs";

const root = resolve(process.cwd());
const specPath = resolve(root, "packages/contracts/openapi/openapi.v1.yaml");

const requiredOperations = [
  "POST /auth/register",
  "POST /auth/verify-email",
  "POST /auth/login",
  "POST /auth/refresh",
  "POST /auth/logout",
  "GET /me",
  "PATCH /me/preferences",
  "GET /events",
  "POST /events",
  "GET /events/{eventId}",
  "PATCH /events/{eventId}",
  "DELETE /events/{eventId}",
  "POST /events/{eventId}/people",
  "PATCH /events/{eventId}/people/{personId}",
  "POST /events/{eventId}/entries",
  "PATCH /events/{eventId}/entries/{entryId}",
  "DELETE /events/{eventId}/entries/{entryId}",
  "POST /events/{eventId}/invites",
  "POST /invites/{token}/join",
  "GET /events/{eventId}/balances",
  "GET /events/{eventId}/analytics/daily-spend",
  "GET /events/{eventId}/analytics/category-spend",
  "POST /uploads/presign",
  "POST /guest/split/calculate"
];

const errors = [];
const specText = readText(specPath);

if (!specText.includes("openapi: 3.1.0")) {
  errors.push("OpenAPI version must be 3.1.0.");
}

if (!specText.includes("version: 1.0.0")) {
  errors.push("Frozen contract version must remain 1.0.0 in SB-003.");
}

for (const op of requiredOperations) {
  const [method, ...rest] = op.split(" ");
  const path = rest.join(" ");
  const pathLine = `  ${path}:`;
  const lines = specText.split("\n");
  const pathIndex = lines.findIndex((line) => line.trimEnd() === pathLine);
  if (pathIndex < 0) {
    errors.push(`Missing required path: ${path}`);
    continue;
  }

  let hasMethod = false;
  for (let i = pathIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^  \/[^:]+:$/.test(line)) {
      break;
    }
    if (line.trimStart().startsWith(`${method.toLowerCase()}:`)) {
      hasMethod = true;
      break;
    }
  }

  if (!hasMethod) {
    errors.push(`Missing required operation: ${op}`);
  }
}

if (!specText.includes("ErrorResponse:")) {
  errors.push("Missing schema: components.schemas.ErrorResponse");
}

if (!specText.includes("ValidationErrorResponse:")) {
  errors.push("Missing schema: components.schemas.ValidationErrorResponse");
}

if (!specText.includes("bearerAuth:")) {
  errors.push("Missing security scheme: components.securitySchemes.bearerAuth");
}

if (errors.length > 0) {
  console.error("Contract check failed:");
  for (const err of errors) {
    console.error(`- ${err}`);
  }
  process.exit(1);
}

console.log("Contract check passed.");
