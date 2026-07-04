import { describe, it, expect, vi, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("content isolated env", () => {
  it("listCommands handles missing commands directory", async () => {
    const root = mkdtempSync(join(tmpdir(), "pncore-test-"));
    vi.stubEnv("PNCORE_CONTENT_PATH", root);
    try {
      const { listCommands } = await import("./content.js");
      expect(listCommands()).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("listCommands loads nested command from custom content root", async () => {
    const root = mkdtempSync(join(tmpdir(), "pncore-test-"));
    const cmdDir = join(root, "commands", "pn", "build");
    mkdirSync(cmdDir, { recursive: true });
    writeFileSync(
      join(cmdDir, "pn-build.md"),
      "---\nname: pn-build\ndescription: test\n---\n# build\n"
    );
    vi.stubEnv("PNCORE_CONTENT_PATH", root);
    try {
      const { listCommands, getCommand } = await import("./content.js");
      const cmds = listCommands();
      expect(cmds).toHaveLength(1);
      expect(cmds[0].menuPath).toBe("pn/build/pn-build");
      expect(getCommand("pn-build")).toContain("# build");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("parseFrontmatter warns on unknown keys in custom content", async () => {
    const root = mkdtempSync(join(tmpdir(), "pncore-test-"));
    mkdirSync(join(root, "commands"), { recursive: true });
    writeFileSync(
      join(root, "commands", "pn-test-cmd.md"),
      "---\nname: pn-test-cmd\ndescription: test\nunknownKey: x\n---\n# test\n"
    );
    vi.stubEnv("PNCORE_CONTENT_PATH", root);
    const errSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    try {
      const { listCommands } = await import("./content.js");
      listCommands();
      expect(errSpy).toHaveBeenCalled();
      expect(String(errSpy.mock.calls[0]?.[0])).toContain("unknownKey");
    } finally {
      errSpy.mockRestore();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("listCommands uses filename stem when name frontmatter is absent", async () => {
    const root = mkdtempSync(join(tmpdir(), "pncore-test-"));
    mkdirSync(join(root, "commands"), { recursive: true });
    writeFileSync(
      join(root, "commands", "pn-stem-only.md"),
      "---\ndescription: stem id\n---\n# stem\n"
    );
    vi.stubEnv("PNCORE_CONTENT_PATH", root);
    try {
      const { listCommands, getCommand } = await import("./content.js");
      const cmds = listCommands();
      expect(cmds).toHaveLength(1);
      expect(cmds[0].id).toBe("pn-stem-only");
      expect(getCommand("pn-stem-only")).toContain("# stem");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
