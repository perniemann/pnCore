#!/usr/bin/env node
/**
 * Validate contract JSON files as Draft 2020-12 JSON Schemas and test golden examples.
 * Uses ajv + ajv-formats (already in devDependencies).
 * Exit 0 on success; exit 1 on any schema error or example failure.
 * Called by: validate-parallel.mjs
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const __dir = dirname(fileURLToPath(import.meta.url));
const schemasDir = join(__dir, "..", "packages", "pn-core-mcp", "content", "reference", "schemas");

if (!existsSync(schemasDir)) {
  console.error(`validate-contracts: schemas dir not found: ${schemasDir}`);
  process.exit(1);
}

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

let failures = 0;

for (const file of readdirSync(schemasDir)) {
  if (!file.endsWith(".json")) continue;
  const filePath = join(schemasDir, file);
  let schema;
  try {
    schema = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error(`✗ ${file}: failed to parse JSON: ${err.message}`);
    failures++;
    continue;
  }

  if (!schema["$schema"]) {
    console.error(`✗ ${file}: missing $schema field`);
    failures++;
    continue;
  }

  let validate;
  try {
    validate = ajv.compile(schema);
  } catch (err) {
    console.error(`✗ ${file}: invalid JSON Schema: ${err.message}`);
    failures++;
    continue;
  }

  const examples = schema["$examples"] ?? [];
  if (examples.length === 0) {
    console.error(`✗ ${file}: no $examples found — at least one golden example is required`);
    failures++;
    continue;
  }

  let ok = true;
  for (let i = 0; i < examples.length; i++) {
    const valid = validate(examples[i]);
    if (!valid) {
      console.error(`✗ ${file}: example[${i}] failed validation:`);
      for (const err of validate.errors ?? []) {
        console.error(`  - ${err.instancePath || "(root)"}: ${err.message}`);
      }
      ok = false;
      failures++;
    }
  }

  if (ok) {
    console.log(`✓ ${file}: schema valid, ${examples.length} example(s) passed`);
  }
}

if (failures > 0) {
  console.error(`\nvalidate-contracts: ${failures} contract(s) failed`);
  process.exit(1);
} else {
  console.log(`\nvalidate-contracts: all contracts valid`);
}
