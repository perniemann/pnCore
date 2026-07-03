#!/usr/bin/env node
/** Strip IDE trailers from stdin commit message (for git rebase --exec). */
import { execFileSync } from "child_process";
import { writeFileSync } from "fs";

let m = execFileSync("git", ["log", "-1", "--format=%B"], { encoding: "utf8" });
m = m
  .split(/\r?\n/)
  .filter(
    (line) =>
      !/^Made-with:/i.test(line) &&
      !/^Co-authored-by:.*cursoragent@cursor\.com/i.test(line) &&
      !/^Co-authored-by:.*Cursor\s*<cursor@cursor\.com>/i.test(line)
  )
  .join("\n")
  .replace(/\n{3,}/g, "\n\n")
  .trim();
writeFileSync("/tmp/amendmsg", m ? `${m}\n` : "\n");
execFileSync("git", ["commit", "--amend", "-F", "/tmp/amendmsg", "--no-edit"], {
  stdio: "inherit",
});
