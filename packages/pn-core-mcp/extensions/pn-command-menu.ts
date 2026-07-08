/**
 * Pi /pn command — single main-menu entry (like /model) with selector UI for pn workflows.
 * Leaf templates live in plugins/pnCore/prompts/ but are not registered via pi.prompts.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AutocompleteItem,
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { DynamicBorder, getSelectListTheme } from "@earendil-works/pi-coding-agent";
import { Container, SelectList, type SelectItem, Text } from "@earendil-works/pi-tui";

interface PiCommandIndexEntry {
  id: string;
  category: string;
  description: string;
  file: string;
}

interface PiCommandIndex {
  version: number;
  commands: PiCommandIndexEntry[];
}

const EXTENSION_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(EXTENSION_DIR, "..", "..", "..");
const PLUGIN_ROOT = join(REPO_ROOT, "plugins", "pnCore");
const INDEX_PATH = join(PLUGIN_ROOT, "pi-command-index.json");
const PROMPTS_DIR = join(PLUGIN_ROOT, "prompts");

function loadCommandIndex(): PiCommandIndexEntry[] {
  if (!existsSync(INDEX_PATH)) {
    return [];
  }
  try {
    const raw = JSON.parse(readFileSync(INDEX_PATH, "utf8")) as PiCommandIndex;
    const commands = Array.isArray(raw.commands) ? raw.commands : [];
    return commands.filter((entry) => resolveCommand(entry));
  } catch {
    return [];
  }
}

function parseCommandMarkdown(filePath: string): string {
  const raw = readFileSync(filePath, "utf8");
  const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
  return match ? match[1].trim() : raw.trim();
}

function resolveCommand(entry: PiCommandIndexEntry): PiCommandIndexEntry | undefined {
  const filePath = join(PROMPTS_DIR, entry.file);
  if (!existsSync(filePath)) return undefined;
  return entry;
}

function runCommand(entry: PiCommandIndexEntry, ctx: ExtensionContext): void {
  const filePath = join(PROMPTS_DIR, entry.file);
  const body = parseCommandMarkdown(filePath);
  if (!body) {
    ctx.ui.notify(`Empty command template: ${entry.id}`, "error");
    return;
  }
  ctx.ui.setEditorText(body);
  ctx.ui.notify(`Loaded /${entry.id}`, "info");
  if (entry.id === "pn-program" || entry.id === "pn-build") {
    ctx.ui.notify(
      "Orchestrator lead: pass leadModelTier in workflow_step state; delegate parallel work to subagents (see pn-orchestrator-lead rule).",
      "info"
    );
  }
}

async function showPnCommandSelector(
  commands: PiCommandIndexEntry[],
  ctx: ExtensionContext
): Promise<void> {
  if (ctx.mode !== "tui") {
    ctx.ui.notify("/pn requires interactive TUI mode", "error");
    return;
  }
  if (commands.length === 0) {
    ctx.ui.notify(
      "pnCore command index missing — run npm run sync:content and pi install",
      "error"
    );
    return;
  }

  const items: SelectItem[] = commands.map((cmd) => ({
    value: cmd.id,
    label: cmd.id,
    description: `${cmd.category} — ${cmd.description}`,
  }));

  const result = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
    const container = new Container();
    container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));
    container.addChild(new Text(theme.fg("accent", theme.bold("pnCore commands"))));
    container.addChild(new Text(theme.fg("dim", "Build, design, audit, and ship workflows")));

    const selectList = new SelectList(items, Math.min(items.length, 14), getSelectListTheme());
    selectList.onSelect = (item) => done(item.value);
    selectList.onCancel = () => done(null);

    container.addChild(selectList);
    container.addChild(new Text(theme.fg("dim", "↑↓ navigate • enter select • esc cancel")));
    container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));

    return {
      render(width: number) {
        return container.render(width);
      },
      invalidate() {
        container.invalidate();
      },
      handleInput(data: string) {
        selectList.handleInput(data);
        tui.requestRender();
      },
    };
  });

  if (!result) return;
  const entry = commands.find((c) => c.id === result);
  if (!entry) return;
  runCommand(entry, ctx);
}

export function registerPnCommandMenu(pi: ExtensionAPI): void {
  let commands = loadCommandIndex();

  pi.on("session_start", () => {
    commands = loadCommandIndex();
  });

  pi.registerCommand("pn", {
    description: "pnCore workflows (build, design, audit, ship)",
    getArgumentCompletions(prefix: string): AutocompleteItem[] | null {
      const needle = prefix.trim().toLowerCase();
      const matches = commands.filter(
        (c) => c.id.startsWith(needle) || c.id.replace(/^pn-/, "").startsWith(needle)
      );
      if (matches.length === 0) return null;
      return matches.slice(0, 12).map((c) => ({
        value: c.id,
        label: c.id,
        description: c.description,
      }));
    },
    handler: async (args, ctx) => {
      commands = loadCommandIndex();
      const arg = args.trim();
      if (arg) {
        const normalized = arg.replace(/^\//, "");
        const entry =
          commands.find((c) => c.id === normalized) ??
          commands.find((c) => c.id === `pn-${normalized}`);
        if (!entry || !resolveCommand(entry)) {
          ctx.ui.notify(`Unknown pn command "${arg}". Use /pn to open the menu.`, "warning");
          return;
        }
        runCommand(entry, ctx);
        return;
      }
      await showPnCommandSelector(commands, ctx);
    },
  });
}
