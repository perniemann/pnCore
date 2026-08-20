import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getCatalogEntry, resolveCatalogArgv, VERIFY_CATALOG } from "./verify-catalog.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const passCwd = join(__dirname, "fixtures", "verify-pass");
const scriptsCwd = join(__dirname, "fixtures", "verify-scripts");

describe("verify-catalog", () => {
  it("resolves npm_test when package.json has test script", () => {
    const r = resolveCatalogArgv("npm_test", passCwd);
    expect(r).toEqual({ argv: ["npm", "test"] });
  });

  it("rejects unknown commandId", () => {
    const r = resolveCatalogArgv("not_a_cmd", passCwd);
    expect(r).toHaveProperty("error");
  });

  it("rejects npm_test_full when script missing", () => {
    const r = resolveCatalogArgv("npm_test_full", passCwd);
    expect(r).toHaveProperty("error");
  });

  it("rejects npm_validate when script missing", () => {
    const r = resolveCatalogArgv("npm_validate", passCwd);
    expect(r).toHaveProperty("error");
  });

  it("does not detect ruff/pytest in the npm fixture", () => {
    expect(getCatalogEntry("ruff_check")?.detect(passCwd)).toBe(false);
    expect(getCatalogEntry("pytest")?.detect(passCwd)).toBe(false);
  });

  it("exposes five catalog entries", () => {
    expect(VERIFY_CATALOG.map((e) => e.commandId)).toEqual([
      "npm_test",
      "npm_test_full",
      "npm_validate",
      "ruff_check",
      "pytest",
    ]);
  });

  it("returns undefined for unknown getCatalogEntry", () => {
    expect(getCatalogEntry("nope")).toBeUndefined();
  });

  it("resolves test:full and validate when those scripts exist", () => {
    expect(resolveCatalogArgv("npm_test_full", scriptsCwd)).toEqual({
      argv: ["npm", "run", "test:full"],
    });
    expect(resolveCatalogArgv("npm_validate", scriptsCwd)).toEqual({
      argv: ["npm", "run", "validate"],
    });
  });

  it("detects ruff and pytest from python project files", () => {
    const dir = mkdtempSync(join(tmpdir(), "pn-verify-"));
    try {
      writeFileSync(join(dir, "pyproject.toml"), "[project]\nname='x'\n");
      expect(getCatalogEntry("ruff_check")?.detect(dir)).toBe(true);
      expect(getCatalogEntry("pytest")?.detect(dir)).toBe(true);
      writeFileSync(join(dir, "ruff.toml"), "");
      writeFileSync(join(dir, "pytest.ini"), "");
      writeFileSync(join(dir, "conftest.py"), "");
      expect(getCatalogEntry("ruff_check")?.detect(dir)).toBe(true);
      expect(getCatalogEntry("pytest")?.detect(dir)).toBe(true);
      expect(resolveCatalogArgv("ruff_check", dir)).toEqual({ argv: ["ruff", "check", "."] });
      expect(resolveCatalogArgv("pytest", dir)).toEqual({ argv: ["pytest", "-q"] });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("treats invalid package.json as no scripts", () => {
    const dir = mkdtempSync(join(tmpdir(), "pn-verify-bad-"));
    try {
      writeFileSync(join(dir, "package.json"), "{not json");
      expect(resolveCatalogArgv("npm_test", dir)).toHaveProperty("error");
      writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: ["nope"] }));
      expect(resolveCatalogArgv("npm_test", dir)).toHaveProperty("error");
      writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: { test: 1 } }));
      expect(resolveCatalogArgv("npm_test", dir)).toHaveProperty("error");
      const emptyDir = mkdtempSync(join(tmpdir(), "pn-verify-empty-"));
      expect(resolveCatalogArgv("npm_test", emptyDir)).toHaveProperty("error");
      rmSync(emptyDir, { recursive: true, force: true });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
