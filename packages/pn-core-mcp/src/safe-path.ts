import { resolve, sep } from "path";

export const safeBase = process.cwd();

export function resolveSafePath(filePath: string): { resolved: string } | { error: string } {
  const normalizedBase = resolve(safeBase);
  const normalizedResolved = resolve(normalizedBase, filePath);
  const isInside =
    normalizedResolved === normalizedBase || normalizedResolved.startsWith(normalizedBase + sep);
  if (!isInside) {
    return { error: "Path must be within process cwd" };
  }
  return { resolved: normalizedResolved };
}
