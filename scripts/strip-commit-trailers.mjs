#!/usr/bin/env node
/**
 * Removes IDE and agent trailer lines from commit message files (prepare-commit-msg hook).
 * Policy: commit-trailer-policy.mjs (no Co-authored-by, Made-with, or agent trailers).
 */
import { readFileSync, writeFileSync } from "fs";
import { stripTrailers } from "./commit-trailer-policy.mjs";

const path = process.argv[2];
if (!path) process.exit(0);

writeFileSync(path, stripTrailers(readFileSync(path, "utf8")), "utf8");
