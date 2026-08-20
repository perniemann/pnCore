/**
 * No-shell dispose-verify execution. Jail first; never fall back to raw spawn
 * when a jail was requested and is missing.
 */
import { spawn, execFileSync } from "child_process";
import { basename, dirname } from "path";
import { existsSync } from "fs";
const OUTPUT_CAP = 8192;
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_TIMEOUT_MS = 300_000;
const SHELL_METACHARS = /[;&|`$<>(){}!\n\r]/;
const FORBIDDEN_BIN = new Set([
    "sh",
    "bash",
    "zsh",
    "dash",
    "fish",
    "cmd",
    "cmd.exe",
    "powershell",
    "pwsh",
    "npx",
]);
const ALLOWED_FREEFORM_BIN = new Set([
    "npm",
    "node",
    "ruff",
    "pytest",
    "pnpm",
    "yarn",
    "bun",
    "vitest",
    "tsc",
    "eslint",
    "prettier",
]);
export class VerifyPolicyError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
function envTruthy(name) {
    const v = process.env[name]?.trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes";
}
export function commandExists(name) {
    try {
        execFileSync("which", [name], { stdio: "ignore" });
        return true;
    }
    catch {
        return false;
    }
}
export function assertSafeArgv(argv, opts) {
    if (!Array.isArray(argv) || argv.length === 0) {
        throw new VerifyPolicyError("INVALID_ARGV", "argv must be a non-empty array");
    }
    for (const tok of argv) {
        if (typeof tok !== "string" || tok.trim() === "") {
            throw new VerifyPolicyError("INVALID_ARGV", "argv tokens must be non-empty strings");
        }
        if (SHELL_METACHARS.test(tok)) {
            throw new VerifyPolicyError("INVALID_ARGV", `argv token rejected (metacharacters): ${tok}`);
        }
    }
    const bin = basename(argv[0]);
    if (FORBIDDEN_BIN.has(bin)) {
        throw new VerifyPolicyError("INVALID_ARGV", `binary not allowed: ${bin}`);
    }
    if (argv.includes("-c") || argv.includes("--call") || argv.includes("-e")) {
        throw new VerifyPolicyError("INVALID_ARGV", "argv must not include -c, --call, or -e");
    }
    if (opts?.freeform && !ALLOWED_FREEFORM_BIN.has(bin)) {
        throw new VerifyPolicyError("INVALID_ARGV", `free-form argv[0] not in allowlist: ${bin}`);
    }
}
export function resolveSandboxBackend() {
    const forced = process.env.PNCORE_VERIFY_SANDBOX?.trim().toLowerCase();
    const inTest = envTruthy("VITEST") ||
        process.env.NODE_ENV === "test" ||
        (process.env.VITEST_WORKER_ID != null && process.env.VITEST_WORKER_ID !== "");
    if (forced === "unavailable")
        return "unavailable";
    if (forced === "test") {
        return inTest ? "test" : "unavailable";
    }
    if (forced === "restricted")
        return "restricted";
    if (forced === "bwrap" || forced === "bubblewrap") {
        return commandExists("bwrap") ? "bubblewrap" : "unavailable";
    }
    if (!forced && commandExists("bwrap"))
        return "bubblewrap";
    if (!forced && inTest)
        return "test";
    return "unavailable";
}
export function clampTimeoutMs(timeoutMs) {
    if (timeoutMs == null || !Number.isFinite(timeoutMs))
        return DEFAULT_TIMEOUT_MS;
    return Math.min(MAX_TIMEOUT_MS, Math.max(1_000, Math.floor(timeoutMs)));
}
export function tailOutput(buf) {
    if (buf.length <= OUTPUT_CAP)
        return buf;
    return buf.slice(buf.length - OUTPUT_CAP);
}
export function buildBwrapArgv(cwd, argv) {
    const nodeDir = dirname(process.execPath);
    const binds = [
        "bwrap",
        "--unshare-net",
        "--die-with-parent",
        "--dev",
        "/dev",
        "--proc",
        "/proc",
        "--ro-bind",
        "/usr",
        "/usr",
        "--ro-bind",
        "/bin",
        "/bin",
    ];
    for (const p of ["/lib", "/lib64", "/n", nodeDir]) {
        if (existsSync(p)) {
            binds.push("--ro-bind-try", p, p);
        }
    }
    binds.push("--bind", cwd, cwd, "--chdir", cwd, "--clearenv", "--setenv", "PATH", process.env.PATH ?? "/usr/bin:/bin", "--setenv", "HOME", cwd, "--setenv", "NODE_ENV", "test", "--setenv", "npm_config_update_notifier", "false", ...argv);
    return binds;
}
export function spawnVerify(opts) {
    const backend = opts.backend ?? resolveSandboxBackend();
    if (backend === "unavailable") {
        return Promise.reject(new VerifyPolicyError("DISPOSE_UNAVAILABLE", "Dispose-verify jail is unavailable. Set PNCORE_VERIFY_SANDBOX=restricted to opt into no-shell spawn without an OS jail, or install bwrap."));
    }
    const freeform = false;
    assertSafeArgv(opts.argv, { freeform });
    const timeoutMs = clampTimeoutMs(opts.timeoutMs);
    const spawnArgv = backend === "bubblewrap" ? buildBwrapArgv(opts.cwd, opts.argv) : opts.argv;
    const env = backend === "bubblewrap"
        ? undefined
        : {
            PATH: process.env.PATH ?? "/usr/bin:/bin",
            HOME: opts.cwd,
            NODE_ENV: "test",
            npm_config_update_notifier: "false",
        };
    return new Promise((resolve, reject) => {
        let stdout = "";
        let stderr = "";
        let timedOut = false;
        let settled = false;
        const child = spawn(spawnArgv[0], spawnArgv.slice(1), {
            cwd: opts.cwd,
            env,
            stdio: ["ignore", "pipe", "pipe"],
            shell: false,
        });
        const timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGKILL");
        }, timeoutMs);
        child.stdout?.on("data", (d) => {
            stdout += d.toString("utf-8");
        });
        child.stderr?.on("data", (d) => {
            stderr += d.toString("utf-8");
        });
        child.on("error", (err) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            reject(err);
        });
        child.on("close", (code) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            resolve({
                exitCode: timedOut ? 124 : (code ?? 1),
                timedOut,
                stdoutTail: tailOutput(stdout),
                stderrTail: tailOutput(stderr),
            });
        });
    });
}
export function sandboxLabel(backend) {
    if (backend === "bubblewrap")
        return { backend: "bubblewrap", jailed: true };
    if (backend === "unavailable")
        return { backend: "unavailable", jailed: false };
    return { backend: "unavailable", jailed: false };
}
