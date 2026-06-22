#!/usr/bin/env node
/**
 * HEAD/GET a curated URL list for smoke checks (portfolio, lab, socials).
 * Does not crawl SPAs or follow redirects beyond fetch default.
 *
 * URLs: comma-separated in env EMBEDDED_STUDIO_CHECK_URLS, or one URL per line
 * in file .embedded-studio-urls at repo root (gitignored by default if you add it).
 *
 * Usage: EMBEDDED_STUDIO_CHECK_URLS="https://example.com,https://example.org" node scripts/check-embedded-studio-urls.mjs
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const listFile = join(repoRoot, ".embedded-studio-urls");

function collectUrls() {
  const fromEnv = process.env.EMBEDDED_STUDIO_CHECK_URLS;
  if (fromEnv && fromEnv.trim()) {
    return fromEnv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (existsSync(listFile)) {
    return readFileSync(listFile, "utf8")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("#"));
  }
  console.error(
    "No URLs: set EMBEDDED_STUDIO_CHECK_URLS or create .embedded-studio-urls in repo root (one URL per line)."
  );
  process.exit(2);
}

async function checkOne(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return { url, status: res.status, ok: res.ok };
  } catch (e) {
    clearTimeout(t);
    return { url, status: 0, ok: false, error: String(e?.message || e) };
  }
}

async function main() {
  const urls = collectUrls();
  let failed = 0;
  for (const url of urls) {
    let row = await checkOne(url);
    if (row.status === 405 || row.status === 501) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
      try {
        const res = await fetch(url, {
          method: "GET",
          redirect: "follow",
          signal: ctrl.signal,
          headers: { Range: "bytes=0-0" },
        });
        clearTimeout(t);
        row = { url, status: res.status, ok: res.ok };
      } catch (e) {
        clearTimeout(t);
        row = { url, status: 0, ok: false, error: String(e?.message || e) };
      }
    }
    const line = row.ok
      ? `OK ${row.status} ${row.url}`
      : `FAIL ${row.status} ${row.url}${row.error ? ` (${row.error})` : ""}`;
    console.log(line);
    if (!row.ok) failed++;
  }
  process.exit(failed > 0 ? 1 : 0);
}

main();
