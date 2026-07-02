/**
 * Portable vs dev MCP config classification and helpers.
 * Canonical npx launch shapes live in mcp-npx-config.mjs — do not duplicate args here.
 */
import {
  mcpConfigNpx,
  mcpConfigWindowsCmd,
  npxPnCoreArgs,
  PN_CORE_GIT_PACKAGE,
} from "./mcp-npx-config.mjs";

export const PNCORE_GIT_PACKAGE = PN_CORE_GIT_PACKAGE;

export const PNCORE_MCP_SERVER_REL = "packages/pn-core-mcp/dist/index.js";

/** Root package bins that npx resolves inside the install tree. */
export const PORTABLE_PN_CORE_BINS = ["pn-core", "pn-core-mcp"];

/** @param {NodeJS.Platform} [platform] */
export function portableMcpServerEntry(platform = process.platform) {
  return platform === "win32" ? { ...mcpConfigWindowsCmd } : { ...mcpConfigNpx };
}

/**
 * @param {{ command?: string; args?: string[] } | undefined} entry
 * @returns {boolean}
 */
export function isPortablePnCoreEntry(entry) {
  if (!entry?.args?.length) return false;
  const hasGit = entry.args.some(
    (a) => typeof a === "string" && a.includes("github.com/perniemann/pnCore")
  );
  const hasBin = entry.args.some((a) => PORTABLE_PN_CORE_BINS.includes(a));
  return hasGit && hasBin && !entry.args.includes("node");
}

/**
 * Broken portable config: `node packages/pn-core-mcp/dist/index.js` resolves from Cursor cwd,
 * not the npx install dir (e.g. C:\\Users\\you\\packages\\... MODULE_NOT_FOUND).
 *
 * @param {{ command?: string; args?: string[] } | undefined} entry
 * @returns {boolean}
 */
export function isBrokenRelativeNodePortableEntry(entry) {
  if (!entry?.args?.length) return false;
  if (
    !entry.args.some((a) => typeof a === "string" && a.includes("github.com/perniemann/pnCore"))
  ) {
    return false;
  }
  return entry.args.includes("node") && entry.args.includes(PNCORE_MCP_SERVER_REL);
}

/**
 * @param {{ command?: string; args?: string[] } | undefined} entry
 * @returns {boolean}
 */
export function isLocalDevPnCoreEntry(entry) {
  if (!entry?.args?.length) return false;
  return entry.args.some((a) => {
    if (typeof a !== "string") return false;
    if (/^[a-zA-Z]:[\\/]/.test(a)) return true;
    if (a.startsWith("/") && a.includes(PNCORE_MCP_SERVER_REL)) return true;
    if (a.includes("\\pnCore\\") || a.includes("/pnCore/")) return true;
    return false;
  });
}

/**
 * @param {{ command?: string; args?: string[] } | undefined} entry
 * @returns {{ portable: boolean; localDev: boolean; brokenPortable: boolean; reason: string }}
 */
export function classifyPnCoreEntry(entry) {
  if (!entry) {
    return {
      portable: false,
      localDev: false,
      brokenPortable: false,
      reason: "missing pn-core entry",
    };
  }
  if (isBrokenRelativeNodePortableEntry(entry)) {
    return {
      portable: false,
      localDev: false,
      brokenPortable: true,
      reason: "broken npx config (relative node path — use pn-core bin)",
    };
  }
  if (isPortablePnCoreEntry(entry)) {
    return {
      portable: true,
      localDev: false,
      brokenPortable: false,
      reason: "npx git install (portable)",
    };
  }
  if (isLocalDevPnCoreEntry(entry)) {
    return {
      portable: false,
      localDev: true,
      brokenPortable: false,
      reason: "absolute local path (dev-only)",
    };
  }
  return {
    portable: false,
    localDev: false,
    brokenPortable: false,
    reason: "unknown pn-core command shape",
  };
}

/** Warm-cache one-liner for docs and troubleshooting. */
export function warmCacheShellCommand(platform = process.platform) {
  const inner = npxPnCoreArgs.join(" ");
  if (platform === "win32") {
    return `cmd /c "npx ${inner}"`;
  }
  return `npx ${inner}`;
}
