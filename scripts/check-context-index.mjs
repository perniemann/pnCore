#!/usr/bin/env node
/**
 * Validate docs/refs/context-index.json against context-index.schema.json,
 * ensure non-null pointer paths exist under repo root, and enforce artifact lifecycle rules.
 * Run from repo root: npm run check:context-index
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const indexPath = path.join(repoRoot, "docs/refs/context-index.json");
const schemaPath = path.join(repoRoot, "docs/refs/context-index.schema.json");

/** Pointers that hold an artifact id rather than a repo path. */
export const ID_POINTERS = new Set(["current_checkpoint"]);

/**
 * Lifecycle rules the JSON Schema cannot express:
 * - pointers.current_checkpoint names an existing artifact whose lifecycle is "current"
 * - at most one "current" artifact per type
 * - artifact ids are unique
 * - lifecycle "superseded" requires superseded_by, and only it may carry one
 * - every superseded_by names another existing artifact, with no cycles
 */
export function lifecycleErrors(index) {
  const errors = [];
  const artifacts = Array.isArray(index?.artifacts)
    ? index.artifacts.filter((a) => a && typeof a === "object" && typeof a.id === "string")
    : [];
  const byId = new Map();
  for (const a of artifacts) {
    if (byId.has(a.id)) errors.push(`duplicate artifact id "${a.id}"`);
    else byId.set(a.id, a);
  }

  const currentId = index?.pointers?.current_checkpoint;
  if (typeof currentId === "string" && currentId !== "") {
    const current = byId.get(currentId);
    if (!current) {
      errors.push(`pointers.current_checkpoint "${currentId}" is not an artifact id`);
    } else if (current.lifecycle !== "current") {
      errors.push(
        `pointers.current_checkpoint "${currentId}" has lifecycle ${current.lifecycle ?? "(unset)"}, expected "current"`
      );
    }
  }

  const currentByType = new Map();
  for (const a of artifacts) {
    if (a.lifecycle !== "current") continue;
    const ids = currentByType.get(a.type) ?? [];
    ids.push(a.id);
    currentByType.set(a.type, ids);
  }
  for (const [type, ids] of currentByType) {
    if (ids.length > 1) {
      errors.push(`more than one "current" ${type} artifact: ${ids.join(", ")}`);
    }
  }

  for (const a of artifacts) {
    const next = a.superseded_by;
    if (a.lifecycle === "superseded" && typeof next !== "string") {
      errors.push(`artifact "${a.id}" is superseded but has no superseded_by`);
    }
    if (typeof next !== "string") continue;
    if (a.lifecycle !== "superseded") {
      errors.push(
        `artifact "${a.id}" has superseded_by but lifecycle ${a.lifecycle ?? "(unset)"}, expected "superseded"`
      );
    }
    if (next === a.id) {
      errors.push(`artifact "${a.id}" supersedes itself`);
    } else if (!byId.has(next)) {
      errors.push(`artifact "${a.id}" superseded_by "${next}" does not exist`);
    }
  }

  const reported = new Set();
  for (const a of artifacts) {
    const seen = [a.id];
    let cursor = byId.get(a.superseded_by);
    while (cursor && cursor.id !== a.id && !seen.includes(cursor.id)) {
      seen.push(cursor.id);
      cursor = byId.get(cursor.superseded_by);
    }
    if (cursor?.id === a.id && seen.length > 1 && !seen.some((id) => reported.has(id))) {
      seen.forEach((id) => reported.add(id));
      errors.push(`superseded_by cycle: ${[...seen, a.id].join(" -> ")}`);
    }
  }
  return errors;
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function main() {
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
    if (rel == null || rel === "" || ID_POINTERS.has(key)) continue;
    const abs = path.join(repoRoot, rel);
    if (!fs.existsSync(abs)) {
      fail(`Pointer "${key}" path does not exist: ${rel}`);
    }
  }

  const artifacts = Array.isArray(index.artifacts) ? index.artifacts : [];
  for (const art of artifacts) {
    if (!art || typeof art !== "object") continue;
    const rel = art.path;
    if (typeof rel !== "string" || rel === "") {
      fail(`Artifact "${art.id ?? "?"}" missing path`);
    }
    const abs = path.join(repoRoot, rel);
    if (!fs.existsSync(abs)) {
      fail(`Artifact "${art.id}" path does not exist: ${rel}`);
    }
  }

  const lifecycle = lifecycleErrors(index);
  if (lifecycle.length > 0) {
    fail(`context-index lifecycle errors:\n- ${lifecycle.join("\n- ")}`);
  }

  console.log(
    "context-index OK:",
    index.version,
    index.last_reviewed,
    `artifacts=${artifacts.length}`
  );
}

if (Boolean(process.argv[1]) && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}
