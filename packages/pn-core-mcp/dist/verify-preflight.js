/**
 * In-call preflight for workflow_verify: declared inputs, environment variables, and the
 * command are checked immediately before spawn, in the same call, so a missing dependency is
 * reported as missing_input instead of surfacing later as a behavioral test failure.
 */
import { createHash } from "crypto";
import { accessSync, constants, existsSync, readFileSync, statSync } from "fs";
import { delimiter, isAbsolute, join, resolve } from "path";
import { resolveInside } from "./safe-path.js";
const ACCESS_MODE = {
    read: constants.R_OK,
    write: constants.W_OK,
    execute: constants.X_OK,
};
const ACCESS_REASON = {
    read: "not readable",
    write: "not writable",
    execute: "not executable",
};
function canAccess(path, mode) {
    try {
        accessSync(path, mode);
        return true;
    }
    catch {
        return false;
    }
}
function findOnPath(cmd, env, platform) {
    const dirs = (env.PATH ?? env.Path ?? "").split(delimiter).filter(Boolean);
    const exts = platform === "win32"
        ? ["", ...(env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean)]
        : [""];
    for (const dir of dirs) {
        for (const ext of exts) {
            const candidate = join(dir, cmd + ext);
            if (!existsSync(candidate))
                continue;
            if (platform === "win32" || canAccess(candidate, constants.X_OK))
                return true;
        }
    }
    return false;
}
function checkCommand(argv0, cwd, env, platform) {
    const isPath = argv0.includes("/") || argv0.includes("\\") || isAbsolute(argv0);
    const ok = isPath
        ? existsSync(resolve(cwd, argv0)) && canAccess(resolve(cwd, argv0), constants.X_OK)
        : findOnPath(argv0, env, platform);
    return ok
        ? { kind: "command", target: argv0, ok }
        : {
            kind: "command",
            target: argv0,
            ok,
            reason: isPath ? "not found or not executable" : "not on PATH",
        };
}
function checkInput(input, cwd, workspaceRoot) {
    const target = input.path;
    const safe = resolveInside(workspaceRoot, resolve(cwd, input.path));
    if ("error" in safe)
        return { kind: "input", target, ok: false, reason: "outside workspace" };
    const abs = safe.resolved;
    if (!existsSync(abs))
        return { kind: "input", target, ok: false, reason: "missing" };
    if (input.access && !canAccess(abs, ACCESS_MODE[input.access])) {
        return { kind: "input", target, ok: false, reason: ACCESS_REASON[input.access] };
    }
    if (input.sha256) {
        if (!statSync(abs).isFile())
            return { kind: "input", target, ok: false, reason: "not a file" };
        const actual = createHash("sha256").update(readFileSync(abs)).digest("hex");
        if (actual !== input.sha256.toLowerCase()) {
            return { kind: "input", target, ok: false, reason: `sha256 mismatch (actual ${actual})` };
        }
    }
    return { kind: "input", target, ok: true };
}
export function runPreflight(opts) {
    const env = opts.env ?? process.env;
    const platform = opts.platform ?? process.platform;
    const checks = [checkCommand(opts.argv[0], opts.cwd, env, platform)];
    for (const input of opts.inputs ?? [])
        checks.push(checkInput(input, opts.cwd, opts.workspaceRoot));
    for (const name of opts.env_required ?? []) {
        const present = typeof env[name] === "string" && env[name] !== "";
        checks.push(present
            ? { kind: "env", target: name, ok: true }
            : { kind: "env", target: name, ok: false, reason: "unset or empty" });
    }
    return { ok: checks.every((c) => c.ok), checks };
}
