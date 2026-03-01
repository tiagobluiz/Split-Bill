import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const GENERATOR_IMAGE = "openapitools/openapi-generator-cli:v7.13.0";
const OUTPUT_DIR = "/local/generated/typescript-fetch";
const SPEC_PATH = "/local/openapi/openapi.v1.yaml";

const thisFile = fileURLToPath(import.meta.url);
const contractsRoot = resolve(dirname(thisFile), "..");
const sourceSpecPath = join(contractsRoot, "openapi", "openapi.v1.yaml");
const specContents = readFileSync(sourceSpecPath);
const specHash = createHash("sha256").update(specContents).digest("hex");

const volumePath = contractsRoot.replace(/\\/g, "/");

const generatorArgs = [
  "run",
  "--rm",
  "-v",
  `${volumePath}:/local`,
  GENERATOR_IMAGE,
  "generate",
  "-g",
  "typescript-fetch",
  "-i",
  SPEC_PATH,
  "-o",
  OUTPUT_DIR,
  "--additional-properties",
  [
    "npmName=@split-bill/contracts-client",
    "npmVersion=1.0.0",
    "supportsES6=true",
    "typescriptThreePlus=true",
    "withInterfaces=true",
    "useSingleRequestParameter=true",
    "enumPropertyNaming=UPPERCASE",
    "modelPropertyNaming=original",
    "hideGenerationTimestamp=true"
  ].join(",")
];

const dockerVersion = spawnSync("docker", ["--version"], {
  cwd: contractsRoot,
  encoding: "utf-8"
});

if (dockerVersion.status !== 0) {
  console.error("Docker is required to generate the TypeScript client.");
  process.exit(dockerVersion.status ?? 1);
}

const generation = spawnSync("docker", generatorArgs, {
  cwd: contractsRoot,
  stdio: "inherit"
});

if (generation.status !== 0) {
  process.exit(generation.status ?? 1);
}

const metadataPath = join(contractsRoot, "generated", "typescript-fetch", ".contract-generation.json");
mkdirSync(dirname(metadataPath), { recursive: true });
writeFileSync(
  metadataPath,
  `${JSON.stringify(
    {
      generatorImage: GENERATOR_IMAGE,
      inputSpec: "openapi/openapi.v1.yaml",
      inputSpecSha256: specHash,
      output: "generated/typescript-fetch"
    },
    null,
    2
  )}\n`,
  "utf-8"
);

console.log("TypeScript client generated.");
