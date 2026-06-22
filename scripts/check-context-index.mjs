#!/usr/bin/env node
/**
 * Validate docs/refs/context-index.json against context-index.schema.json
 * and ensure non-null pointer paths exist under repo root.
 * Run from repo root: npm run check:context-index
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const indexPath = path.join(repoRoot, "docs/refs/context-index.json");
const schemaPath = path.join(repoRoot, "docs/refs/context-index.schema.json");

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (!fs.existsSync(indexPath)) fail(`Missing ${path.relative(repoRoot, indexPath)}`);
if (!fs.existsSync(schemaPath)) fail(`Missing ${path.relative(repoRoot, schemaPath)}`);

let index;
let schema;
try {
  index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
} catch (e) {
  fail(`Invalid JSON in context-index.json: ${e.message}`);
}
try {
  schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
} catch (e) {
  fail(`Invalid JSON in context-index.schema.json: ${e.message}`);
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);
if (!validate(index)) {
  console.error("context-index.json failed JSON Schema validation:");
  console.error(ajv.errorsText(validate.errors, { separator: "\n" }));
  process.exit(1);
}

const pointers = index.pointers || {};
for (const [key, rel] of Object.entries(pointers)) {
  if (rel == null || rel === "") continue;
  const abs = path.join(repoRoot, rel);
  if (!fs.existsSync(abs)) {
    fail(`Pointer "${key}" path does not exist: ${rel}`);
  }
}

console.log("context-index OK:", index.version, index.last_reviewed);
