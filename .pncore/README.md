# `.pncore/` (local workspace state)

Machine-local data created when you use **pn-core** in Cursor. This directory is only partially tracked in Git: see [Environment](#environment).

## Setup

- Nothing to install. The folder exists so clones have a place for local runtime files.
- The **skill load log** appears only after the MCP has successfully handled at least one `get_skill` call with this repository as the process working directory.

## Environment

- **Path (workspace-relative):** `.pncore/skill-load-log.jsonl` (same as `resolve(process.cwd(), ".pncore", "skill-load-log.jsonl")` in the MCP server).
- **Git:** See root `.gitignore` — `skill-load-log.jsonl` and other runtime files are ignored; this `README.md` is the exception and is committed.

## Usage

1. Open **this repository** as the Cursor workspace.
2. Use pn-core in a way that calls **`get_skill`** with a skill `id` (e.g. agents loading a skill, or the MCP tool directly). The first successful append creates `.pncore/skill-load-log.jsonl` if it did not exist.
3. **Metrics dashboard (M3 “hot skills”):** from the repo root, run `npm run dashboard` and open `http://localhost:4173/`, then use **Refresh** to read the log from disk.

## Log line format (M3)

Each line is one JSON object, for example:

```json
{"ts":"2026-04-22T12:00:00.000Z","id":"pn-writing-plans"}
```

Optional `run_id` may be present. Used to rank which skills are loaded most often (**M3** input for the deferred **T3** skill-token split — rankings alone do not ship T3). Full aggregation example:

```bash
node -e "
  const {readFileSync} = require('fs');
  const p = '.pncore/skill-load-log.jsonl';
  const t = readFileSync(p,'utf-8').trim();
  if (!t) { console.log('(empty)'); process.exit(0); }
  const c = {};
  for (const l of t.split('\n')) { const {id} = JSON.parse(l); c[id] = (c[id]||0)+1; }
  Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,20).forEach(([id,n])=>console.log(n, id));
"
```

(Run from workspace root, after the log file exists.)

## Scripts

| Command | Description |
| --- | --- |
| `npm run dashboard` | Serves [docs/dashboard/](../docs/dashboard/) and `/api/snapshot` (including M3 hot skills from the log) on port `4173` by default. |

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| No `.pncore` folder (except this README) | Normal until the first file is written, or you have not committed the version of the repo that includes this README. |
| No `skill-load-log.jsonl` | No `get_skill` success yet, or the MCP’s `cwd` is not this repo — confirm the project root is the open workspace. |
| Dashboard shows **0** hot-skill events | Log missing or empty; trigger `get_skill` via any MCP host (Cursor, Cloud Agent, etc.), then refresh the dashboard. |

## Other files

Other paths under `.pncore/` may be created (for example usage or gate logs) depending on tools and environment variables. They remain **untracked** like the skill load log.

## See also

- [Metrics dashboard](../docs/dashboard/README.md) — live vs static mode and data sources.
