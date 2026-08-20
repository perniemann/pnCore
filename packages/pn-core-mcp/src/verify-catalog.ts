/**
 * Pinned verify command catalog. Agents name a commandId; the server owns argv.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

export type CatalogEntry = {
  commandId: string;
  argv: string[];
  detect: (cwd: string) => boolean;
};

function readPackageScripts(cwd: string): Record<string, string> | null {
  const pkgPath = join(cwd, "package.json");
  if (!existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { scripts?: unknown };
    if (!pkg.scripts || typeof pkg.scripts !== "object" || Array.isArray(pkg.scripts)) return null;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(pkg.scripts as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim() !== "") out[k] = v;
    }
    return out;
  } catch {
    return null;
  }
}

function hasScript(cwd: string, name: string): boolean {
  const scripts = readPackageScripts(cwd);
  return scripts != null && Object.hasOwn(scripts, name);
}

export const VERIFY_CATALOG: readonly CatalogEntry[] = [
  {
    commandId: "npm_test",
    argv: ["npm", "test"],
    detect: (cwd) => hasScript(cwd, "test"),
  },
  {
    commandId: "npm_test_full",
    argv: ["npm", "run", "test:full"],
    detect: (cwd) => hasScript(cwd, "test:full"),
  },
  {
    commandId: "npm_validate",
    argv: ["npm", "run", "validate"],
    detect: (cwd) => hasScript(cwd, "validate"),
  },
  {
    commandId: "ruff_check",
    argv: ["ruff", "check", "."],
    detect: (cwd) => existsSync(join(cwd, "ruff.toml")) || existsSync(join(cwd, "pyproject.toml")),
  },
  {
    commandId: "pytest",
    argv: ["pytest", "-q"],
    detect: (cwd) =>
      existsSync(join(cwd, "pytest.ini")) ||
      existsSync(join(cwd, "pyproject.toml")) ||
      existsSync(join(cwd, "conftest.py")),
  },
];

export function getCatalogEntry(commandId: string): CatalogEntry | undefined {
  return VERIFY_CATALOG.find((e) => e.commandId === commandId);
}

export function resolveCatalogArgv(
  commandId: string,
  cwd: string
): { argv: string[] } | { error: string } {
  const entry = getCatalogEntry(commandId);
  if (!entry) return { error: `Unknown commandId: ${commandId}` };
  if (!entry.detect(cwd)) {
    return { error: `commandId ${commandId} is not detected in ${cwd}` };
  }
  return { argv: [...entry.argv] };
}
