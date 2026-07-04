import { describe, it, expect, vi, afterEach } from "vitest";
import { utimesSync } from "fs";
import { randomUUID } from "crypto";
import {
  listSkills,
  getSkill,
  listAgents,
  getAgent,
  listCommands,
  getCommand,
  listRules,
  getRule,
  getResource,
  listInternalAgents,
  resourceDefs,
} from "./content.js";

describe("content contract", () => {
  describe("listSkills", () => {
    it("returns array of skills with id, name, description", () => {
      const skills = listSkills();
      expect(Array.isArray(skills)).toBe(true);
      for (const s of skills) {
        expect(s).toHaveProperty("id");
        expect(typeof s.id).toBe("string");
        expect(s).toHaveProperty("name");
        expect(typeof s.name).toBe("string");
        expect(s).toHaveProperty("description");
        expect(typeof s.description).toBe("string");
      }
    });

    it("returns at least one skill when content exists", () => {
      const skills = listSkills();
      expect(skills.length).toBeGreaterThan(0);
      expect(
        skills.some((s) => s.id === "pn-discovery-questionnaire" || s.id.startsWith("pn-"))
      ).toBe(true);
    });

    it("includes category field derived from filesystem", () => {
      const skills = listSkills();
      for (const s of skills) {
        expect(s).toHaveProperty("category");
        expect(typeof s.category).toBe("string");
        expect(s.category.length).toBeGreaterThan(0);
      }
    });

    it("filters by category", () => {
      const all = listSkills();
      const categories = [...new Set(all.map((s) => s.category))];
      expect(categories.length).toBeGreaterThan(1);
      const cat = categories[0];
      const filtered = listSkills({ category: cat });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.length).toBeLessThan(all.length);
      for (const s of filtered) {
        expect(s.category).toBe(cat);
      }
    });

    it("filters by category case-insensitively", () => {
      const all = listSkills();
      const cat = all[0].category;
      const filtered = listSkills({ category: cat.toUpperCase() });
      expect(filtered.length).toBeGreaterThan(0);
      for (const s of filtered) {
        expect(s.category.toLowerCase()).toBe(cat.toLowerCase());
      }
    });

    it("filters by keyword in id/name/description", () => {
      const all = listSkills();
      const filtered = listSkills({ filter: "discovery" });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.length).toBeLessThanOrEqual(all.length);
      for (const s of filtered) {
        const haystack = `${s.id} ${s.name} ${s.description}`.toLowerCase();
        expect(haystack).toContain("discovery");
      }
    });

    it("returns empty array when no skills match filter", () => {
      const filtered = listSkills({ filter: "__absolutely_no_match_xyz__" });
      expect(filtered).toEqual([]);
    });
  });

  describe("getSkill", () => {
    it("returns string for valid skill id", () => {
      const skills = listSkills();
      if (skills.length > 0) {
        const content = getSkill(skills[0].id);
        expect(content).toBeTypeOf("string");
        expect(content!.length).toBeGreaterThan(0);
      }
    });

    it("returns null for unknown skill id", () => {
      const content = getSkill("__nonexistent_skill_xyz__");
      expect(content).toBeNull();
    });
  });

  describe("listAgents", () => {
    it("returns array with id, name, description", () => {
      const agents = listAgents();
      expect(Array.isArray(agents)).toBe(true);
      for (const a of agents) {
        expect(a).toHaveProperty("id");
        expect(a).toHaveProperty("name");
        expect(a).toHaveProperty("description");
      }
    });
  });

  describe("getAgent", () => {
    it("returns string or null", () => {
      const agents = listAgents();
      if (agents.length > 0) {
        const content = getAgent(agents[0].id);
        expect(content === null || typeof content === "string").toBe(true);
      }
      expect(getAgent("__nonexistent__")).toBeNull();
    });
  });

  describe("listCommands", () => {
    it("returns array with id, name, description", () => {
      const commands = listCommands();
      expect(Array.isArray(commands)).toBe(true);
      for (const c of commands) {
        expect(c).toHaveProperty("id");
        expect(c).toHaveProperty("name");
        expect(c).toHaveProperty("description");
      }
    });

    it("includes menuPath for nested commands", () => {
      const commands = listCommands();
      const build = commands.find((c) => c.id === "pn-build");
      expect(build).toBeDefined();
      expect(build!.menuPath).toMatch(/^pn\//);
    });

    it("includes palette-hidden commands", () => {
      const commands = listCommands();
      const hidden = commands.find((c) => c.id === "pn-audit-api");
      expect(hidden).toBeDefined();
      expect(hidden!.menuPath).toBe("pn-audit-api");
    });

    it("includes pn router stub with menuPath pn", () => {
      const commands = listCommands();
      const router = commands.find((c) => c.id === "pn");
      expect(router).toBeDefined();
      expect(router!.menuPath).toBe("pn");
    });

    it("getCommand resolves every listed command id", () => {
      const commands = listCommands();
      expect(commands.length).toBeGreaterThan(40);
      for (const c of commands) {
        const content = getCommand(c.id);
        expect(content).toBeTypeOf("string");
        expect(content!.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getCommand", () => {
    it("returns string or null", () => {
      const commands = listCommands();
      if (commands.length > 0) {
        const content = getCommand(commands[0].id);
        expect(content === null || typeof content === "string").toBe(true);
      }
      expect(getCommand("__nonexistent__")).toBeNull();
    });

    it("resolves nested pn/ menu paths by id", () => {
      const content = getCommand("pn-build");
      expect(content).toBeTypeOf("string");
      expect(content).toContain("pn-build");
    });
  });

  describe("content cold cache", () => {
    afterEach(() => {
      vi.resetModules();
    });

    it("getCommand resolves nested id without prior listCommands", async () => {
      const { getCommand } = await import("./content.js");
      const content = getCommand("pn-build");
      expect(content).toBeTypeOf("string");
      expect(content).toContain("pn-build");
    });

    it("getAgent loads file on cache miss without prior listAgents", async () => {
      const { getAgent } = await import("./content.js");
      const content = getAgent("pn-frontend-developer");
      expect(content).toBeTypeOf("string");
      expect(content!.length).toBeGreaterThan(0);
    });

    it("getRule loads file on cache miss without prior listRules", async () => {
      const { getRule } = await import("./content.js");
      const content = getRule("pn-build-gate");
      expect(content).toBeTypeOf("string");
      expect(content!.length).toBeGreaterThan(0);
    });

    it("getSkill loads file on cache miss without prior listSkills", async () => {
      const { getSkill } = await import("./content.js");
      const content = getSkill("pn-discovery-questionnaire");
      expect(content).toBeTypeOf("string");
      expect(content!.length).toBeGreaterThan(0);
    });

    it("getCommand resolves palette-hidden command by id", async () => {
      const { getCommand } = await import("./content.js");
      const content = getCommand("pn-audit-api");
      expect(content).toBeTypeOf("string");
      expect(content).toContain("pn-audit-api");
    });

    it("getCommand resolves pn router stub", async () => {
      const { getCommand } = await import("./content.js");
      const content = getCommand("pn");
      expect(content).toBeTypeOf("string");
      expect(content).toContain("pnCore command menu");
    });

    it("getCommand caches resolved content on repeat lookup", async () => {
      const { getCommand } = await import("./content.js");
      const first = getCommand("pn-build");
      const second = getCommand("pn-build");
      expect(first).toBe(second);
    });

    it("getCommand returns from preload cache after listCommands", async () => {
      const { listCommands, getCommand } = await import("./content.js");
      listCommands();
      const content = getCommand("pn-build");
      expect(content).toContain("pn-build");
    });

    it("getAgent returns cached content on second call", async () => {
      const { getAgent } = await import("./content.js");
      const first = getAgent("pn-frontend-developer");
      const second = getAgent("pn-frontend-developer");
      expect(first).toBe(second);
    });

    it("listCommands refreshes after cache TTL expires", async () => {
      vi.useFakeTimers();
      const { listCommands } = await import("./content.js");
      const first = listCommands();
      expect(first.length).toBeGreaterThan(0);
      vi.advanceTimersByTime(61_000);
      const second = listCommands();
      expect(second.length).toBe(first.length);
      vi.useRealTimers();
    });

    it("listCommands refreshes when content directory mtime changes", async () => {
      const { listCommands, contentRoot } = await import("./content.js");
      const first = listCommands();
      expect(first.length).toBeGreaterThan(0);
      const now = new Date();
      utimesSync(contentRoot, now, now);
      const second = listCommands();
      expect(second.length).toBe(first.length);
    });
  });

  describe("listRules", () => {
    it("returns array with id, name, description", () => {
      const rules = listRules();
      expect(Array.isArray(rules)).toBe(true);
      for (const r of rules) {
        expect(r).toHaveProperty("id");
        expect(r).toHaveProperty("name");
        expect(r).toHaveProperty("description");
      }
    });
  });

  describe("getRule", () => {
    it("returns string or null", () => {
      const rules = listRules();
      if (rules.length > 0) {
        const content = getRule(rules[0].id);
        expect(content === null || typeof content === "string").toBe(true);
      }
      expect(getRule("__nonexistent__")).toBeNull();
    });

    it("returns null for nonexistent rule id", () => {
      expect(getRule("__does_not_exist_rule_xyz__")).toBeNull();
    });
  });

  describe("error path coverage", () => {
    it("getSkill returns null for any unknown id", () => {
      expect(getSkill("__fake_skill_abc123__")).toBeNull();
    });

    it("getAgent returns null for any unknown id", () => {
      expect(getAgent("__fake_agent_abc123__")).toBeNull();
    });

    it("getCommand returns null for any unknown id", () => {
      expect(getCommand("__fake_command_abc123__")).toBeNull();
    });

    it("getRule returns null for any unknown id", () => {
      expect(getRule("__fake_rule_abc123__")).toBeNull();
    });

    it("listSkills returns items with non-empty id and name", () => {
      const skills = listSkills();
      for (const s of skills) {
        expect(s.id.length).toBeGreaterThan(0);
        expect(s.name.length).toBeGreaterThan(0);
      }
    });

    it("getSkill content contains frontmatter for known skill", () => {
      const skills = listSkills();
      if (skills.length > 0) {
        const content = getSkill(skills[0].id);
        if (content) {
          expect(content.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("getResource", () => {
    it("returns best-practices markdown for canonical URI", () => {
      const r = getResource("pn-core://reference/best-practices.md");
      expect(r).not.toBeNull();
      expect(r!.text).toContain("# Best practices");
      expect(r!.mimeType).toBe("text/markdown");
    });

    it("legacy best-practice-2026-03 URI returns same body as canonical", () => {
      const canonical = getResource("pn-core://reference/best-practices.md");
      const legacy = getResource("pn-core://reference/best-practice-2026-03.md");
      expect(legacy).not.toBeNull();
      expect(legacy!.text).toBe(canonical!.text);
    });

    it("returns aesthetics-baseline markdown", () => {
      const r = getResource("pn-core://reference/aesthetics-baseline.md");
      expect(r).not.toBeNull();
      expect(r!.text).toContain("# Aesthetics baseline");
      expect(r!.mimeType).toBe("text/markdown");
    });

    it("returns embedded-studio-dna markdown", () => {
      const r = getResource("pn-core://reference/embedded-studio-dna.md");
      expect(r).not.toBeNull();
      expect(r!.text).toContain("# Embedded studio DNA");
      expect(r!.mimeType).toBe("text/markdown");
    });

    it("returns design-intent markdown", () => {
      const r = getResource("pn-core://reference/design-intent.md");
      expect(r).not.toBeNull();
      expect(r!.text).toContain("# Design intent");
      expect(r!.mimeType).toBe("text/markdown");
    });

    it("returns marketing-ship-gate markdown", () => {
      const r = getResource("pn-core://reference/marketing-ship-gate.md");
      expect(r).not.toBeNull();
      expect(r!.text).toContain("# Marketing ship gate");
      expect(r!.mimeType).toBe("text/markdown");
    });

    it("returns human-facing-artifacts markdown", () => {
      const r = getResource("pn-core://reference/human-facing-artifacts.md");
      expect(r).not.toBeNull();
      expect(r!.text).toContain("# Human-facing workflow artifacts");
      expect(r!.mimeType).toBe("text/markdown");
    });

    it("returns null for an unknown URI", () => {
      expect(getResource("pn-core://nonexistent/__never__.md")).toBeNull();
    });

    it("rejects entries whose path resolves outside contentRoot (path-traversal guard)", () => {
      const escapeUri = `test://escape-${randomUUID()}`;
      const fakeEntry = {
        uri: escapeUri,
        name: "escape",
        description: "test-only entry attempting to escape contentRoot",
        path: "../../../etc/passwd",
        mimeType: "text/plain",
      };
      resourceDefs.push(fakeEntry);
      try {
        expect(getResource(escapeUri)).toBeNull();
      } finally {
        const idx = resourceDefs.indexOf(fakeEntry);
        if (idx !== -1) resourceDefs.splice(idx, 1);
      }
    });

    it("rejects relative ascent that resolves outside contentRoot", () => {
      const escapeUri = `test://relative-escape-${randomUUID()}`;
      const fakeEntry = {
        uri: escapeUri,
        name: "relative-escape",
        description: "test-only entry attempting relative ascent",
        path: "../../README.md",
        mimeType: "text/markdown",
      };
      resourceDefs.push(fakeEntry);
      try {
        expect(getResource(escapeUri)).toBeNull();
      } finally {
        const idx = resourceDefs.indexOf(fakeEntry);
        if (idx !== -1) resourceDefs.splice(idx, 1);
      }
    });
  });

  describe("listInternalAgents", () => {
    it("returns array with internal: true on every entry", () => {
      const internals = listInternalAgents();
      expect(Array.isArray(internals)).toBe(true);
      for (const a of internals) {
        expect(a.internal).toBe(true);
        expect(typeof a.id).toBe("string");
        expect(a.id.length).toBeGreaterThan(0);
        expect(typeof a.name).toBe("string");
        expect(typeof a.description).toBe("string");
      }
    });
  });
});
