import { resolve, sep } from "path";
export const safeBase = process.cwd();
export function resolveInside(base, filePath) {
    const normalizedBase = resolve(base);
    const normalizedResolved = resolve(normalizedBase, filePath);
    const isInside = normalizedResolved === normalizedBase || normalizedResolved.startsWith(normalizedBase + sep);
    if (!isInside) {
        return { error: "Path must be within process cwd" };
    }
    return { resolved: normalizedResolved };
}
export function resolveSafePath(filePath) {
    return resolveInside(safeBase, filePath);
}
