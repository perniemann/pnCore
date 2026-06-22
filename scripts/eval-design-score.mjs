#!/usr/bin/env node
/**
 * Evaluate design output against machine-checkable criteria from docs/evaluation/PHILOSOPHY_DESIGN_VALIDATION.md.
 * Run from repo root: node scripts/eval-design-score.mjs <path-to-generated-output>
 * Path can be a directory (scans .html, .css, .tsx, .jsx) or a single file.
 *
 * Machine-checkable criteria:
 * - No generic fonts (Inter, Roboto, Space Grotesk, Geist)
 * - No purple gradient on white cliché
 * - prefers-reduced-motion respected when animation present
 * - Design tokens used (var(--*))
 * - No user-scalable=no (zoom disabled)
 * - Target size heuristic: interactive elements have min-width/min-height 24px+ or padding (WCAG 2.2 SC 2.5.8)
 * - Focus styles: :focus or :focus-visible present (WCAG 2.2 SC 2.4.11)
 *
 * Human-only criteria (not scored here): page mode, 3-layer typography structure, distinctive vs generic.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const GENERIC_FONTS = ["Inter", "Roboto", "Space Grotesk", "Geist", "Arial"];
const EXTENSIONS = new Set([".html", ".css", ".tsx", ".jsx", ".ts", ".js"]);

function collectFiles(dir, acc = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "node_modules" && e.name !== "dist" && e.name !== ".git") {
        collectFiles(full, acc);
      }
    } else if (EXTENSIONS.has(extname(e.name))) {
      acc.push(full);
    }
  }
  return acc;
}

function readContent(path) {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

function checkGenericFonts(content) {
  const found = [];
  for (const font of GENERIC_FONTS) {
    const re = new RegExp(
      `["']${font}["']|font-family:\\s*${font}|fontFamily:\\s*["']?${font}`,
      "i"
    );
    if (re.test(content)) found.push(font);
  }
  return found;
}

function checkPurpleGradient(content) {
  const purpleGradient =
    /purple|violet|#[0-9a-fA-F]{3,8}.*gradient|gradient.*purple|gradient.*violet/i;
  const purpleOnWhite =
    /(?:#[fF]{6}|white|#fff)\s*.*(?:purple|violet)|(?:purple|violet).*(?:#[fF]{6}|white)/i;
  return purpleGradient.test(content) || purpleOnWhite.test(content);
}

function checkReducedMotion(content) {
  const hasAnimation =
    /@keyframes|animation:|transition:/i.test(content) ||
    /transition-\w+|transitionOpacity|transitionColors|transitionTransform|transitionAll/i.test(
      content
    );
  const hasReducedMotion = /prefers-reduced-motion|prefersReducedMotion|reduce-motion/i.test(
    content
  );
  if (hasAnimation && !hasReducedMotion) return "warn";
  if (hasReducedMotion) return "pass";
  return hasAnimation ? "warn" : "pass";
}

function checkTokens(content) {
  return /var\(--|--[a-zA-Z0-9-]+\s*:/i.test(content);
}

function checkZoomDisabled(content) {
  return /user-scalable\s*=\s*no|user-scalable:no|maximum-scale\s*=\s*1/i.test(content);
}

function checkTargetSize(content) {
  const hasInteractive =
    /<button|<a\s|<input|<select|<textarea|role\s*=\s*["']button["']|role\s*=\s*["']link["']/i.test(
      content
    );
  const hasMinSize =
    /min-width\s*:\s*(2[4-9]|[3-9]\d|\d{3,})\s*px/i.test(content) ||
    /min-height\s*:\s*(2[4-9]|[3-9]\d|\d{3,})\s*px/i.test(content) ||
    /(?:width|height|min-width|min-height)\s*:\s*(44|48)\s*px/i.test(content) ||
    /min-h-\[(2[4-9]|[3-9]\d|\d{3,})px\]|min-w-\[(2[4-9]|[3-9]\d|\d{3,})px\]/i.test(content) ||
    /min-h-\[44px\]|min-w-\[44px\]/i.test(content);
  const hasPadding =
    /padding\s*:\s*(1[2-9]|[2-9]\d|\d{3,})\s*px/i.test(content) ||
    /padding-[xy]?\s*:\s*(1[2-9]|[2-9]\d|\d{3,})\s*px/i.test(content);
  const hasExplicitSmall = /(?:width|height|min-width|min-height)\s*:\s*(1[0-9]|2[0-3])\s*px/i.test(
    content
  );
  const hasTailwind16 = /\b(?:h-4\s+w-4|w-4\s+h-4|h-4.*w-4|w-4.*h-4)\b/.test(content);
  const hasFormControls =
    /(?:type\s*=\s*["']radio["']|type\s*=\s*["']checkbox["']|<input[\s\S]*?radio|checkbox)/i.test(
      content
    );
  const hasTailwindSmall = hasInteractive && hasTailwind16 && hasFormControls;
  if (hasExplicitSmall) return "fail";
  if (hasTailwindSmall) return "fail";
  if (hasInteractive && !hasMinSize && !hasPadding) return "warn";
  return "pass";
}

function checkFocusStyles(content) {
  const hasInteractive =
    /<button|<a\s|<input|<select|<textarea|role\s*=\s*["']button["']|role\s*=\s*["']link["']/i.test(
      content
    );
  const hasFocus =
    /:focus\b|:focus-visible|:focus-within|focus-visible:|focus:|outline\s*:|box-shadow\s*:.*focus|ring-2|ring-offset/i.test(
      content
    );
  if (hasInteractive && !hasFocus) return "warn";
  return "pass";
}

function runEvaluation(files) {
  const results = {
    genericFonts: { pass: true, found: [] },
    purpleGradient: { pass: true },
    reducedMotion: { pass: true, status: "pass" },
    tokens: { pass: false, found: false },
    zoomDisabled: { pass: true },
    targetSize: { pass: true, status: "pass" },
    focusStyles: { pass: true, status: "pass" },
  };

  let allContent = "";
  for (const f of files) {
    allContent += "\n" + readContent(f);
  }

  const fonts = checkGenericFonts(allContent);
  if (fonts.length > 0) {
    results.genericFonts.pass = false;
    results.genericFonts.found = fonts;
  }

  if (checkPurpleGradient(allContent)) {
    results.purpleGradient.pass = false;
  }

  const rm = checkReducedMotion(allContent);
  results.reducedMotion.status = rm;
  if (rm === "warn") results.reducedMotion.pass = false;

  if (checkTokens(allContent)) {
    results.tokens.found = true;
    results.tokens.pass = true;
  }

  if (checkZoomDisabled(allContent)) {
    results.zoomDisabled.pass = false;
  }

  const ts = checkTargetSize(allContent);
  results.targetSize.status = ts;
  if (ts === "fail") results.targetSize.pass = false;

  const fs = checkFocusStyles(allContent);
  results.focusStyles.status = fs;
  if (fs === "warn") results.focusStyles.pass = false;

  return results;
}

function main() {
  const pathArg = process.argv[2];
  if (!pathArg) {
    console.error(
      "Usage: node scripts/eval-design-score.mjs <path-to-output>\n" +
        "  path: directory (scans .html/.css/.tsx/.jsx) or single file"
    );
    process.exit(1);
  }

  const stat = statSync(pathArg);
  const files = stat.isDirectory() ? collectFiles(pathArg) : [pathArg];

  if (files.length === 0) {
    console.error("No .html, .css, .tsx, .jsx files found at:", pathArg);
    process.exit(1);
  }

  const r = runEvaluation(files);
  const passed =
    r.genericFonts.pass &&
    r.purpleGradient.pass &&
    r.reducedMotion.pass &&
    r.tokens.pass &&
    r.zoomDisabled.pass &&
    r.targetSize.pass;

  console.log("Design evaluation (machine-checkable criteria)\n");
  console.log("Generic fonts:", r.genericFonts.pass ? "PASS" : "FAIL");
  if (r.genericFonts.found.length > 0) {
    console.log("  Found:", r.genericFonts.found.join(", "));
  }
  console.log("No purple gradient:", r.purpleGradient.pass ? "PASS" : "FAIL");
  console.log(
    "Reduced motion:",
    r.reducedMotion.pass ? "PASS" : "WARN (animation present, no prefers-reduced-motion)"
  );
  console.log("Design tokens:", r.tokens.pass ? "PASS" : "FAIL (no var(--*) found)");
  console.log("Zoom not disabled:", r.zoomDisabled.pass ? "PASS" : "FAIL");
  console.log(
    "Target size (WCAG 2.5.8):",
    r.targetSize.pass
      ? "PASS"
      : r.targetSize.status === "fail"
        ? "FAIL (explicit small targets <24px)"
        : "WARN (interactive elements, no min-width/min-height 24px+ pattern)"
  );
  console.log(
    "Focus styles (WCAG 2.4.11):",
    r.focusStyles.pass ? "PASS" : "WARN (interactive elements, no :focus/:focus-visible)"
  );
  console.log("\nOverall:", passed ? "PASS" : "FAIL");
  console.log("\nNote: Page mode, typography hierarchy, and distinctiveness require human review.");

  process.exit(passed ? 0 : 1);
}

main();
