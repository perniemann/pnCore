/**
 * Terminal (TTY) stdin is not an MCP host. A successful `npx … -- pn-core` then
 * sits forever with no output — that is the loading-state bug. Exit after a
 * stderr line so pre-warm finishes and the npx cache stays warm.
 *
 * MCP hosts pipe stdin (isTTY !== true). Override: PNCORE_MCP_ALLOW_TTY=1.
 */
export declare const TTY_USAGE: string;
type StdinLike = {
    isTTY?: boolean;
};
type StderrLike = {
    write: (chunk: string) => unknown;
};
type ExitFn = (code: number) => void;
export declare function isInteractiveStdin(stdin?: StdinLike, env?: NodeJS.ProcessEnv): boolean;
export declare function defaultExit(code: number): void;
/** @returns true if the process was asked to exit */
export declare function exitIfInteractiveStdin(stdin?: StdinLike, stderr?: StderrLike, env?: NodeJS.ProcessEnv, exitFn?: ExitFn): boolean;
export {};
