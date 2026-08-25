#!/usr/bin/env node
/**
 * Optional sessionStart canary (fail-open). Never the primary project-context path.
 * Emits additional_context with a canary string. If the model does not echo it,
 * Cursor dropped the inject (known race). Agents must still call project_context.
 *
 * Env: PNCORE_SESSION_CANARY (override string), PNCORE_SESSION_CANARY_DISABLE=1
 */
import { randomUUID } from "crypto";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

try {
  await readStdin();
} catch {
  /* ignore */
}

if (process.env.PNCORE_SESSION_CANARY_DISABLE === "1") {
  process.stdout.write("{}\n");
  process.exit(0);
}

const canary =
  process.env.PNCORE_SESSION_CANARY?.trim() ||
  `PNCORE_SESSION_CANARY=${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}`;

const additional_context = [
  "## pnCore sessionStart canary (optional, fail-open)",
  "",
  "If you see this block, echo the canary once in your first reply so operators can confirm inject worked.",
  `Canary: \`${canary}\``,
  "",
  "Primary cold-session packet is still MCP `project_context` — call it when pn-core MCP is available.",
  "Do not treat this hook inject as the source of truth for artifacts or drift.",
].join("\n");

process.stdout.write(JSON.stringify({ additional_context }) + "\n");
process.exit(0);
