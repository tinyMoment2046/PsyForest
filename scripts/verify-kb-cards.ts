// Cross-card retrieval self-test: each card's own test questions must rank that card first.
// Writes the ranks back into cards/<slug>.json and a summary to data/kb/cards-summary.json.
// Run: node scripts/verify-kb-cards.ts
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { HIT_THRESHOLD, score } from "../apps/web/app/features/kb/search.ts";

const dir = path.resolve(import.meta.dirname, "../apps/web/app/data/kb/cards");
const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
const cards = await Promise.all(files.map(async (f) => ({ file: f, data: JSON.parse(await readFile(path.join(dir, f), "utf8")) })));

let passed = 0;
let total = 0;

for (const { file, data } of cards) {
  const tests = (data.tests ?? []).map((t: { question: string; expect: "hit" | "miss" }) => {
    const ranked = cards
      .map((c) => ({ slug: c.data.slug, score: score(c.data, t.question) }))
      .sort((a, b) => b.score - a.score);
    const top = ranked[0]!;
    const own = ranked.find((r) => r.slug === data.slug)!;
    const ok = t.expect === "hit" ? top.slug === data.slug : top.score < HIT_THRESHOLD;
    total++;
    if (ok) passed++;
    return {
      question: t.question,
      expect: t.expect,
      top: top.slug,
      score: Number(own.score.toFixed(2)),
      passed: ok,
    };
  });
  await writeFile(path.join(dir, file), JSON.stringify({ ...data, tests }, null, 1), "utf8");
}

await writeFile(
  path.resolve(import.meta.dirname, "../apps/web/app/data/kb/cards-summary.json"),
  JSON.stringify({ tested: total, passed, accuracy: Number((passed / Math.max(total, 1)).toFixed(2)), generatedAt: new Date().toISOString().slice(0, 10) }, null, 1),
  "utf8",
);
console.log(JSON.stringify({ cards: cards.length, tested: total, passed }));
