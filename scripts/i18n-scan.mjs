#!/usr/bin/env node
/**
 * i18n scan — finds hardcoded user-facing strings in src/**.tsx
 * Heuristic: JSX text nodes >=3 chars containing alphabetic words.
 * Skips: imports, comments, className/style, test files, magic tokens.
 * Exit 0 always (report-only). Use --strict to fail on findings.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = "src";
const SKIP_DIRS = new Set(["__tests__", "node_modules", "integrations"]);
const STRICT = process.argv.includes("--strict");

// JSX text between > and < — at least one alphabetic word, length >=3
const JSX_TEXT = />([^<>{}\n]*[A-Za-z]{3,}[^<>{}\n]*)</g;
// String literal props that should be translated
const HUMAN_PROPS =
  /\b(?:title|placeholder|aria-label|label|alt|description)=["']([^"'<>{}\n]{3,})["']/g;

const findings = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (
      [".tsx", ".jsx"].includes(extname(p)) &&
      !p.includes(".test.") &&
      !p.includes(".spec.")
    )
      scan(p);
  }
}

function scan(file) {
  const src = readFileSync(file, "utf8");
  src.split("\n").forEach((line, i) => {
    const trimmed = line.trim();
    if (
      !trimmed ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("import")
    )
      return;
    let m;
    JSX_TEXT.lastIndex = 0;
    while ((m = JSX_TEXT.exec(line))) {
      const text = m[1].trim();
      if (!text || /^[A-Z_]+$/.test(text) || /^\d+$/.test(text)) continue;
      findings.push({ file, line: i + 1, kind: "jsx", text });
    }
    HUMAN_PROPS.lastIndex = 0;
    while ((m = HUMAN_PROPS.exec(line))) {
      findings.push({ file, line: i + 1, kind: "prop", text: m[1] });
    }
  });
}

walk(ROOT);

const byFile = new Map();
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, []);
  byFile.get(f.file).push(f);
}

const sorted = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 20);
console.log(`\ni18n scan — ${findings.length} hardcoded strings in ${byFile.size} files\n`);
console.log("Top 20 files:");
for (const [file, items] of sorted)
  console.log(`  ${items.length.toString().padStart(4)}  ${file}`);

if (process.argv.includes("--json")) {
  console.log("\n" + JSON.stringify(findings, null, 2));
}

if (STRICT && findings.length) process.exit(1);
