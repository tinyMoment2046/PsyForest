// Tidies the imported knowledge-base sections: drops the leftovers LibreTexts/OpenStax pages carry
// around their text — the contributors block, the image credits（来源 …）in captions and alt text, and
// bracket pairs left empty once a credit is gone. Titles are trimmed.
//
// Run after scripts/import-kb.ts: node scripts/tidy-kb.ts
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.resolve(import.meta.dirname, "../apps/web/app/data/kb/sections");

/** A credit in brackets: （来源 …） or （来源：“…” /Wikimedia Commons）. */
const CREDIT = /[（(]来源[^）)]{0,600}[）)]/g;
/** The same credit that lost its opening bracket in translation, left against the closing one. */
const CREDIT_STRAY = /来源[：:][^）)<>]{0,300}[）)]/g;
/** LibreTexts' contributor template: a heading and a list naming the template only. */
const CONTRIBUTORS = /<div>\s*<div>\s*<h2>\s*Contributors and Attributions\s*<\/h2>\s*<ul>[\s\S]*?<\/ul>\s*<\/div>\s*<\/div>/gi;
/** A bracket pair a removed credit left behind. */
const EMPTY_BRACKETS = /[（(]\s*[）)]/g;

function tidyHtml(html: string): string {
  return html
    .replace(CONTRIBUTORS, "")
    .replace(CREDIT, "")
    .replace(CREDIT_STRAY, "")
    .replace(EMPTY_BRACKETS, "")
    // Machine translation doubled the full stop, or left it beside the source's own.
    .replace(/。\s*[.。]/g, "。")
    // A space before Chinese punctuation, usually left behind by a citation or a footnote marker.
    .replace(/[ \u00a0]+([，。；：！？、）])/g, "$1")
    .replace(/[\s\u00a0]+(<\/?(?:figcaption|p|li|h[1-6]))/g, "$1")
    .replace(/(<\/(?:figcaption|p|li|h[1-6])>)[\s\u00a0]+/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const files = (await readdir(DIR)).filter((f) => f.endsWith(".json")).sort();
let changed = 0;
let credits = 0;
for (const file of files) {
  const full = path.join(DIR, file);
  const data = JSON.parse(await readFile(full, "utf8")) as { title: string; chapter: string; html: string };
  const before = data.html;
  const found = (before.match(CREDIT) ?? []).length + (before.match(CREDIT_STRAY) ?? []).length + (before.match(CONTRIBUTORS) ?? []).length;
  const after = tidyHtml(before);
  const title = data.title.trim();
  if (after !== before || title !== data.title) {
    await writeFile(full, JSON.stringify({ ...data, title, html: after }), "utf8");
    changed++;
    credits += found;
  }
}
console.log(`${files.length} sections, ${changed} rewritten, ${credits} credits/contributor blocks removed`);
