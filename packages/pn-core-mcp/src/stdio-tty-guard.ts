/**
 * Terminal (TTY) stdin is not an MCP host. A successful `npx … -- pn-core` then
 * sits forever with no output — that is the loading-state bug. Exit after a
 * stderr line so pre-warm finishes and the npx cache stays warm.
 *
 * MCP hosts pipe stdin (isTTY !== true). Override: PNCORE_MCP_ALLOW_TTY=1.
 */

export const TTY_USAGE =
  "pn-core is a stdio MCP server (no interactive prompt). " +
  "Cursor and Claude spawn it with piped stdin. This terminal would sit idle, so it is exiting. " +
  "If you pre-warmed via npx, the cache is warm — reload pn-core in the MCP host. " +
  "Override: PNCORE_MCP_ALLOW_TTY=1.";

type StdinLike = { isTTY?: boolean };
type StderrLike = { write: (chunk: string) => unknown };
type ExitFn = (code: number) => void;

export function isInteractiveStdin(
  stdin: StdinLike = process.stdin,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (env.PNCORE_MCP_ALLOW_TTY === "1") return false;
  return stdin.isTTY === true;
}

export function defaultExit(code: number): void {
  process.exit(code);
}

/** @returns true if the process was asked to exit */
export function exitIfInteractiveStdin(
  stdin: StdinLike = process.stdin,
  stderr: StderrLike = process.stderr,
  env: NodeJS.ProcessEnv = process.env,
  exitFn: ExitFn = defaultExit
): boolean {
  if (!isInteractiveStdin(stdin, env)) return false;
  stderr.write(`${TTY_USAGE}\n`);
  exitFn(0);
  return true;
}
