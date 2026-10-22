/**
 * Crash-safe file replacement: unique temp file in the target directory, fsync, rename.
 * POSIX rename(2) is atomic. On Windows a rename onto a file that antivirus or the search
 * indexer holds open fails transiently with EPERM / EBUSY / EACCES, so only there, and only
 * for those codes, the rename is retried with bounded backoff.
 */

import { randomBytes } from "crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { basename, dirname, join } from "path";

const TRANSIENT_WIN32_CODES = new Set(["EPERM", "EBUSY", "EACCES"]);
export const RENAME_MAX_ATTEMPTS = 10;
const RENAME_BACKOFF_START_MS = 10;
const RENAME_BACKOFF_CAP_MS = 250;

export type AtomicWriteDeps = {
  platform?: NodeJS.Platform;
  rename?: (from: string, to: string) => void;
  sleep?: (ms: number) => void;
};

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function renameWithRetry(from: string, to: string, deps: AtomicWriteDeps = {}): void {
  const platform = deps.platform ?? process.platform;
  const rename = deps.rename ?? renameSync;
  if (platform !== "win32") {
    rename(from, to);
    return;
  }
  const sleep = deps.sleep ?? sleepSync;
  let delay = RENAME_BACKOFF_START_MS;
  for (let attempt = 1; ; attempt++) {
    try {
      rename(from, to);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (!code || !TRANSIENT_WIN32_CODES.has(code) || attempt >= RENAME_MAX_ATTEMPTS) throw err;
      sleep(delay);
      delay = Math.min(delay * 2, RENAME_BACKOFF_CAP_MS);
    }
  }
}

/** Replace `path` with `data` so readers see either the old or the new content, never a mix. */
export function writeFileAtomic(path: string, data: string, deps: AtomicWriteDeps = {}): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `.${basename(path)}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`);
  try {
    const fd = openSync(tmp, "wx");
    try {
      writeFileSync(fd, data, "utf-8");
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameWithRetry(tmp, path, deps);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
      /* never created or already renamed */
    }
    throw err;
  }
}
