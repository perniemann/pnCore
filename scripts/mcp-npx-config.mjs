/**
 * Shared npx-based MCP launch config for pn-core one-click install.
 * Uses the package bin (`pn-core`) so npx resolves paths inside the install tree.
 * Do not use `node packages/pn-core-mcp/dist/index.js` — that path is relative to CWD, not the package.
 */
export const PN_CORE_GIT_PACKAGE = "git+https://github.com/perniemann/pnCore.git#main";

export function npxPnCoreArgsForPackage(packageSpec = PN_CORE_GIT_PACKAGE) {
  return ["-y", `--package=${packageSpec}`, "--", "pn-core"];
}

export const npxPnCoreArgs = npxPnCoreArgsForPackage();

/**
 * Fail fast when the git package is private and the MCP child has no credentials.
 * Without this, git waits on a credential prompt that never appears — forever loading.
 */
export const portableNpxGitEnv = {
  GIT_TERMINAL_PROMPT: "0",
  GIT_ASKPASS: "echo",
};

/** Cross-platform: npx on PATH (Mac, Linux, Windows). */
export const mcpConfigNpx = {
  command: "npx",
  args: npxPnCoreArgs,
  env: portableNpxGitEnv,
};

/** Windows fallback when MCP host requires cmd /c. */
export const mcpConfigWindowsCmd = {
  command: "cmd",
  args: ["/c", "npx", ...npxPnCoreArgs],
  env: portableNpxGitEnv,
};

export function encodeMcpConfig(config) {
  return Buffer.from(JSON.stringify(config), "utf-8").toString("base64");
}

export function mcpInstallUrls(config) {
  const configBase64 = encodeMcpConfig(config);
  return {
    configBase64,
    https: `https://cursor.com/en/install-mcp?name=pn-core&config=${configBase64}`,
    cursor: `cursor://anysphere.cursor-deeplink/mcp/install?name=pn-core&config=${configBase64}`,
  };
}
