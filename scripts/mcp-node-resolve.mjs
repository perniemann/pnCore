#!/usr/bin/env node
/**
 * Resolve the Node executable Cursor should use for pn-core MCP (.nvmrc-aligned).
 * Used by mcp-config-write.mjs. Override with PNCORE_MCP_NODE (full path).
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

/**
 * @param {string} exePath
 * @returns {number | null}
 */
export function readNodeMajor(exePath) {
  const r = spawnSync(exePath, ["-p", "Number(process.version.slice(1).split('.')[0])"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (r.error || r.status !== 0) return null;
  const n = Number(String(r.stdout).trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {string} repoRoot
 * @returns {number | undefined}
 */
export function readNvmrcMajor(repoRoot) {
  const p = join(repoRoot, ".nvmrc");
  if (!existsSync(p)) return undefined;
  try {
    const raw = readFileSync(p, "utf8").trim();
    const m = /^(\d+)/.exec(raw);
    return m ? Number(m[1]) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * @param {string} repoRoot
 * @returns {number | undefined}
 */
export function readEnginesMinMajor(repoRoot) {
  try {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    const eng = pkg?.engines?.node;
    if (typeof eng !== "string") return undefined;
    const m = eng.match(/(\d+)/);
    return m ? Number(m[1]) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * @param {string} a semver-like "22.1.0"
 * @param {string} b semver-like "22.2.0"
 * @returns {number}
 */
function semverCmp(a, b) {
  const pa = String(a)
    .replace(/^v/, "")
    .split(".")
    .map((x) => Number(x));
  const pb = String(b)
    .replace(/^v/, "")
    .split(".")
    .map((x) => Number(x));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

/**
 * Pick latest v{major}.* under baseDir (directory names like v22.22.0).
 *
 * @param {string} baseDir
 * @param {number} wantedMajor
 * @param {string} nodeExeRelative e.g. 'node.exe' or 'bin/node'
 * @returns {string | null}
 */
function latestNodeUnderVersionDirs(baseDir, wantedMajor, nodeExeRelative) {
  if (!existsSync(baseDir)) return null;
  let best = null;
  let bestVer = null;
  for (const ent of readdirSync(baseDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const mm = /^v(\d+)\.(\d+)\.(\d+)/.exec(ent.name);
    if (!mm || Number(mm[1]) !== wantedMajor) continue;
    const ver = `${mm[1]}.${mm[2]}.${mm[3]}`;
    const exe = join(baseDir, ent.name, ...nodeExeRelative.split("/"));
    try {
      if (!statSync(exe).isFile()) continue;
    } catch {
      continue;
    }
    if (!bestVer || semverCmp(ver, bestVer) > 0) {
      bestVer = ver;
      best = exe;
    }
  }
  return best;
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {number} wantedMajor
 * @param {NodeJS.Platform} platform
 * @returns {string | null}
 */
function tryNvmInstalls(env, wantedMajor, platform) {
  const winHome = env.NVM_HOME?.trim();
  const unixDir = env.NVM_DIR?.trim();

  if (platform === "win32" && winHome) {
    const exe = latestNodeUnderVersionDirs(winHome, wantedMajor, "node.exe");
    if (exe && readNodeMajor(exe) === wantedMajor) return exe;
  }

  if (unixDir) {
    const unixBase = join(unixDir, "versions", "node");
    const exe = latestNodeUnderVersionDirs(unixBase, wantedMajor, "bin/node");
    if (exe && readNodeMajor(exe) === wantedMajor) return exe;
  }

  return null;
}

/**
 * Choose node command for MCP config.
 *
 * @param {object} opts
 * @param {string} opts.repoRoot
 * @param {NodeJS.ProcessEnv} [opts.env]
 * @param {string} [opts.currentExecPath]
 * @param {NodeJS.Platform} [opts.platform]
 * @returns {{ command: string; pinnedBy: string; warn?: string }}
 */
export function resolveMcpNode(opts) {
  const env = opts.env ?? process.env;
  const currentExecPath = opts.currentExecPath ?? process.execPath;
  const platform = opts.platform ?? process.platform;

  const pinnedEnv = env.PNCORE_MCP_NODE?.trim();
  if (pinnedEnv) {
    return { command: pinnedEnv, pinnedBy: "PNCORE_MCP_NODE" };
  }

  const wantedMajor = readNvmrcMajor(opts.repoRoot) ?? readEnginesMinMajor(opts.repoRoot) ?? 22;
  const execMajor = readNodeMajor(currentExecPath);
  if (execMajor === wantedMajor) {
    return {
      command: currentExecPath,
      pinnedBy: `.nvmrc/engines (major ${wantedMajor} — current process)`,
    };
  }

  const nvmExe = tryNvmInstalls(env, wantedMajor, platform);
  if (nvmExe) {
    return { command: nvmExe, pinnedBy: `nvm (NVM_HOME/NVM_DIR) v${wantedMajor}.x` };
  }

  const pathMajor = execMajor;
  let warn;
  if (pathMajor !== wantedMajor) {
    warn = `PATH "node" is major ${pathMajor ?? "?"}; repo expects ${wantedMajor} (see .nvmrc). Set PNCORE_MCP_NODE to a v${wantedMajor} node.exe or run this script from a shell where nvm/fnm selects v${wantedMajor}.`;
  }

  return { command: "node", pinnedBy: "PATH (generic node)", warn };
}
