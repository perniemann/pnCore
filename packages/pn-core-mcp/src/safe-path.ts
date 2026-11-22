import { realpathSync } from "fs";
import { basename, dirname, join, resolve, sep } from "path";

export const safeBase = process.cwd();

/**
 * Resolve symlinks on the deepest existing ancestor of `p` and re-append the missing tail.
 * A path whose parent is a symlink out of the workspace resolves to its real location.
 */
export function realpathDeepest(p: string): string {
  const tail: string[] = [];
  let cur = p;
  for (;;) {
    try {
      return tail.length ? join(realpathSync(cur), ...tail) : realpathSync(cur);
    } catch {
      const parent = dirname(cur);
      if (parent === cur) return p;
      tail.unshift(basename(cur));
      cur = parent;
    }
  }
}

function within(base: string, target: string): boolean {
  return target === base || target.startsWith(base + sep);
}

/**
 * Contain `filePath` inside `base`, lexically and after resolving symlinks, so a symlinked
 * `.pncore` (or any directory) pointing outside the workspace is rejected.
 */
export function resolveInside(
  base: string,
  filePath: string
): { resolved: string } | { error: string } {
  const normalizedBase = resolve(base);
  const normalizedResolved = resolve(normalizedBase, filePath);
  if (!within(normalizedBase, normalizedResolved)) {
    return { error: "Path must be within process cwd" };
  }
  if (!within(realpathDeepest(normalizedBase), realpathDeepest(normalizedResolved))) {
    return { error: "Path must be within process cwd (symlink escapes the workspace)" };
  }
  return { resolved: normalizedResolved };
}

export function resolveSafePath(filePath: string): { resolved: string } | { error: string } {
  return resolveInside(safeBase, filePath);
}
