#!/usr/bin/env node
/**
 * Validate a Best-of-N judge JSON against the best-of-n.contract.json schema.
 *
 * Run: node scripts/validate-best-of-n-contract.mjs <json-file>
 *
 * Exit 0 on valid; exit 1 on schema violation or read error.
 * Exports: validate(data) -> { valid: boolean, errors: AjvError[] }
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv/dist/2020.js";
import { resolveBestOfNSelection } from "./best-of-n-select.mjs";
import { loadBestOfNFeaturesFromConfig } from "./load-best-of-n-features.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(
  __dir,
  "..",
  "packages",
  "pn-core-mcp",
  "content",
  "reference",
  "schemas",
  "best-of-n.contract.json"
);

let _validate;
function getValidator() {
  if (!_validate) {
    const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf-8"));
    const compilableSchema = { ...schema };
    delete compilableSchema.$examples;
    const ajv = new Ajv({ strict: false, allErrors: true });
    _validate = ajv.compile(compilableSchema);
  }
  return _validate;
}

/**
 * Semantic coherence check: when llm_scores are present, verify winner_id is
 * the top scorer and that auto_selected / human_gate_required match the
 * computed delta against features.bestOfN.autoSelectMinDelta (or CLI override).
 *
 * @param {unknown} data
 * @param {{ minDelta?: number }} [opts]
 * @returns {{ coherent: boolean, issues: string[] }}
 */
export function validateSelectionCoherence(data, opts = {}) {
  if (
    !data ||
    typeof data !== "object" ||
    !Array.isArray(data.llm_scores) ||
    data.llm_scores.length === 0
  ) {
    return { coherent: true, issues: [] };
  }

  const issues = [];

  const minDelta =
    typeof opts.minDelta === "number" && opts.minDelta >= 0
      ? opts.minDelta
      : loadBestOfNFeaturesFromConfig().autoSelectMinDelta;

  let resolved;
  try {
    resolved = resolveBestOfNSelection({
      llm_scores: data.llm_scores,
      objective_gate_results: data.objective_gate_results,
      minDelta,
    });
  } catch (err) {
    issues.push(`selection resolution failed: ${err.message}`);
    return { coherent: false, issues };
  }

  if (data.winner_id !== resolved.winner_id) {
    issues.push(
      `winner_id mismatch: contract has "${data.winner_id}" but top scorer is "${resolved.winner_id}"`
    );
  }

  if (typeof data.auto_selected === "boolean" && data.auto_selected !== resolved.auto_selected) {
    issues.push(
      `auto_selected mismatch: contract has ${data.auto_selected} but delta ${resolved.score_delta} yields ${resolved.auto_selected}`
    );
  }

  if (
    typeof data.human_gate_required === "boolean" &&
    data.human_gate_required !== resolved.human_gate_required
  ) {
    issues.push(
      `human_gate_required mismatch: contract has ${data.human_gate_required} but delta ${resolved.score_delta} yields ${resolved.human_gate_required}`
    );
  }

  return { coherent: issues.length === 0, issues };
}

/** @param {unknown} data @param {{ minDelta?: number }} [opts] @returns {{ valid: boolean, errors: import('ajv').ErrorObject[] }} */
export function validate(data, opts = {}) {
  const v = getValidator();
  const valid = v(data);
  if (!valid) {
    return { valid: false, errors: v.errors ?? [] };
  }

  const coherence = validateSelectionCoherence(data, opts);
  if (!coherence.coherent) {
    return {
      valid: false,
      errors: coherence.issues.map((msg) => ({
        instancePath: "",
        schemaPath: "#/semantics",
        keyword: "semantics",
        params: {},
        message: msg,
      })),
    };
  }

  return { valid: true, errors: [] };
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: validate-best-of-n-contract.mjs <json-file>");
    process.exit(1);
  }
  let data;
  try {
    data = JSON.parse(readFileSync(resolve(filePath), "utf-8"));
  } catch (err) {
    console.error(`error: could not read/parse ${filePath}: ${err.message}`);
    process.exit(1);
  }
  const result = validate(data);
  if (!result.valid) {
    console.error(`invalid: ${filePath}`);
    for (const err of result.errors) {
      console.error(`  ${err.instancePath || "(root)"}: ${err.message}`);
    }
    process.exit(1);
  }
  console.log(`ok: ${filePath}`);
  process.exit(0);
}
