export function truncateResourceBody(
  text: string,
  resourceKind: string,
  id: string,
  maxChars: number
): string {
  if (text.length <= maxChars) return text;
  const suffix = `\n\n---\n[Truncated by pn-core-mcp: ${text.length} chars → ${maxChars}; ${resourceKind} id=${id}. Use MCP resources or workspace files for full text.]`;
  const head = maxChars - suffix.length;
  if (head < 256) return text.slice(0, maxChars);
  return text.slice(0, head) + suffix;
}

export function maxResourceCharsFromEnv(env: NodeJS.ProcessEnv = process.env): number {
  const n = parseInt(env.PNCORE_MAX_RESOURCE_CHARS ?? "", 10);
  if (Number.isFinite(n) && n > 1024) return n;
  return 150_000;
}
