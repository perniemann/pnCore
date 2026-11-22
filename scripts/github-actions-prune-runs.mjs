#!/usr/bin/env node
/**
 * Prune GitHub Actions workflow history: keep the latest run per workflow, every run younger
 * than KEEP_DAYS (30), and every run on the head commit of an open pull request; remove the
 * rest (entire run by default, or log archives only with --logs-only). Deleting a run deletes
 * its check runs, and an open PR whose checks vanished can never automerge.
 * Requires GITHUB_TOKEN with repo scope (Actions read/write for fine-grained PATs).
 *
 * Usage:
 *   GITHUB_TOKEN=... node scripts/github-actions-prune-runs.mjs [owner/repo]
 *   GITHUB_TOKEN=... node scripts/github-actions-prune-runs.mjs --logs-only [owner/repo]
 *   GITHUB_TOKEN=... node scripts/github-actions-prune-runs.mjs --dry-run [--logs-only] [owner/repo]
 *
 * Default repo: perniemann/pnCore (from this workspace).
 *
 * Default mode deletes each old workflow **run** (same as before). With `--logs-only`,
 * only log files are removed (runs still appear in the UI; see GitHub REST
 * DELETE .../actions/runs/{run_id}/logs).
 */

import { fileURLToPath } from "url";

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const positionals = argv.filter((a) => !a.startsWith("--"));
const logsOnly = flags.has("--logs-only");
const dryRun = flags.has("--dry-run");

const ownerRepo = positionals[0] || "perniemann/pnCore";
const [owner, repo] = ownerRepo.split("/");
const token = process.env.GITHUB_TOKEN;

const base = "https://api.github.com";
const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  Authorization: `Bearer ${token}`,
};

async function checkRepoAccess() {
  const res = await fetch(`${base}/repos/${owner}/${repo}`, { headers });
  if (res.status === 404) {
    console.error(
      "Repo not found or token has no access. Ensure:\n" +
        "  - Token is for an account with read access to this repo.\n" +
        "  - Classic PAT: enable 'repo' scope. Fine-grained: add this repo and 'Actions: Read and write'.\n" +
        "  - If the repo is in an organization: authorize the token for that org (GitHub → Settings → Developer settings → Personal access tokens → Configure SSO)."
    );
    process.exit(1);
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Repo check failed: ${res.status} ${t}`);
  }
}

async function listAllRuns() {
  const runs = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const res = await fetch(
      `${base}/repos/${owner}/${repo}/actions/runs?per_page=100&page=${page}`,
      { headers }
    );
    if (!res.ok) {
      const t = await res.text();
      if (res.status === 404) {
        console.error(
          "Actions runs endpoint returned 404. Ensure the token has Actions access:\n" +
            "  - Classic PAT: 'repo' scope includes Actions.\n" +
            "  - Fine-grained: Repository permissions → Actions → Read and write."
        );
      }
      throw new Error(`List runs failed: ${res.status} ${t}`);
    }
    const data = await res.json();
    runs.push(...(data.workflow_runs || []));
    hasMore = data.workflow_runs?.length === 100;
    page += 1;
  }
  return runs;
}

async function deleteRun(runId) {
  const res = await fetch(`${base}/repos/${owner}/${repo}/actions/runs/${runId}`, {
    method: "DELETE",
    headers,
  });
  if (res.status === 204) return true;
  const t = await res.text();
  console.warn(`Delete run ${runId} failed: ${res.status} ${t}`);
  return false;
}

async function deleteRunLogs(runId) {
  const res = await fetch(`${base}/repos/${owner}/${repo}/actions/runs/${runId}/logs`, {
    method: "DELETE",
    headers,
  });
  if (res.status === 204) return true;
  const t = await res.text();
  console.warn(`Delete logs for run ${runId} failed: ${res.status} ${t}`);
  return false;
}

const KEEP_DAYS = 30;

async function openPrHeadShas() {
  const shas = new Set();
  for (let page = 1; ; page++) {
    const res = await fetch(
      `${base}/repos/${owner}/${repo}/pulls?state=open&per_page=100&page=${page}`,
      { headers }
    );
    if (!res.ok) throw new Error(`list open PRs failed: ${res.status}`);
    const prs = await res.json();
    for (const pr of prs) shas.add(pr.head.sha);
    if (prs.length < 100) return shas;
  }
}

/** Pure selection, exported for tests. */
export function selectPrunable(runs, { now = Date.now(), protectedShas = new Set() } = {}) {
  const byWorkflow = new Map();
  for (const run of runs) {
    const existing = byWorkflow.get(run.workflow_id);
    if (!existing || run.run_number > existing.run_number) byWorkflow.set(run.workflow_id, run);
  }
  const latest = new Set([...byWorkflow.values()].map((r) => r.id));
  const cutoff = now - KEEP_DAYS * 24 * 60 * 60 * 1000;
  return runs.filter(
    (r) =>
      !latest.has(r.id) && !protectedShas.has(r.head_sha) && Date.parse(r.created_at ?? "") < cutoff
  );
}

async function main() {
  if (!token) {
    console.error("Set GITHUB_TOKEN (repo scope) and run again.");
    process.exit(1);
  }
  await checkRepoAccess();
  const runs = await listAllRuns();
  if (runs.length === 0) {
    console.log("No workflow runs found.");
    return;
  }

  const toPrune = selectPrunable(runs, { protectedShas: await openPrHeadShas() });
  const keptCount = runs.length - toPrune.length;

  const mode = logsOnly ? "log archives (runs kept)" : "full run";
  console.log(`Total runs: ${runs.length}`);
  console.log(`Keeping (latest per workflow, < ${KEEP_DAYS} days, open-PR heads): ${keptCount}`);
  console.log(`To prune (${mode}): ${toPrune.length}`);
  if (dryRun) {
    console.log("Dry run — no deletions.");
    for (const run of toPrune) {
      console.log(`  would prune ${run.id} (${run.name} #${run.run_number})`);
    }
    return;
  }

  const remove = logsOnly ? deleteRunLogs : deleteRun;
  const verb = logsOnly ? "Deleted logs for run" : "Deleted run";

  let okCount = 0;
  let failCount = 0;

  for (const run of toPrune) {
    const ok = await remove(run.id);
    if (ok) {
      okCount++;
      console.log(`${verb} ${run.id} (${run.name} #${run.run_number})`);
    } else {
      failCount++;
    }
  }

  console.log(`Done: ${okCount} pruned, ${failCount} failed, ${keptCount} kept.`);
  if (failCount > 0) {
    console.error(
      "Some deletions failed (often missing actions:write on the token). " +
        "Run via Actions → Prune Actions history, or use a PAT with Actions read/write."
    );
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
