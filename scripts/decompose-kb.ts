// Turns an imported book chapter into a structured study note (a "拆解"): concepts, mechanism,
// examples, misconceptions, practice and a quiz, written from the chapter's own material.
// Stored as books/<id>/notes/<chapter>.json; rendered at /kb/<id>/notes/<chapter>.
// Run: node scripts/decompose-kb.ts --book psychology-2e --chapter 01 [--model default]
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import { z } from "zod";
import { chatJson } from "../packages/backend/src/providers/llm.ts";
import { closeDb } from "../packages/backend/src/db.ts";

const args = process.argv.slice(2);
const flag = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? fallback) : fallback;
};
const bookId = flag("book");
const chapterSlug = flag("chapter");
const model = flag("model", "default")!;
if (!bookId || !chapterSlug) {
  console.error("usage: node scripts/decompose-kb.ts --book <id> --chapter <01> [--model default]");
  process.exit(1);
}

const base = path.resolve(import.meta.dirname, `../apps/web/app/data/kb/books/${bookId}`);
const toc = JSON.parse(await readFile(path.join(base, "toc.json"), "utf8")) as {
  book: { title: string; authors: string };
  chapters: Array<{ slug: string; title: string; sections: Array<{ slug: string; title: string; file: string }> }>;
};
const chapter = toc.chapters.find((c) => c.slug === chapterSlug);
if (!chapter) throw new Error(`no chapter ${chapterSlug}`);
if (!args.includes("--force") && (await readdir(path.join(base, "notes")).catch(() => [] as string[])).includes(`${chapter.slug}.json`)) {
  console.log(JSON.stringify({ book: bookId, chapter: chapter.slug, skipped: "exists" }));
  await closeDb();
  process.exit(0);
}

const strip = (html: string) => {
  const $ = cheerio.load(html);
  $("figcaption").append("\n");
  return $.root().text().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
};

const parts: string[] = [];
for (const section of chapter.sections) {
  const data = JSON.parse(await readFile(path.join(base, "sections", `${section.file}.json`), "utf8")) as { title: string; html: string };
  const text = strip(data.html);
  parts.push(`## ${section.slug} ${data.title}\n${text.slice(0, 9000)}`);
}
const material = parts.join("\n\n").slice(0, 120_000);

const Note = z.object({
  oneLine: z.string().describe("一句话说清这一章在讲什么，不超过 40 字"),
  overview: z.string().describe("120-200 字的导读：这一章回答什么问题，为什么值得读"),
  concepts: z.array(z.object({
    name: z.string(),
    explanation: z.string().describe("用日常语言解释，必要时给出一个具体例子"),
    confusion: z.string().describe("最容易和什么混淆，或常见误用"),
  })).min(3).max(8),
  mechanism: z.array(z.object({
    step: z.string().describe("短标题"),
    detail: z.string().describe("这一步发生了什么，条件是什么"),
  })).min(2).max(8),
  examples: z.array(z.object({
    scene: z.string().describe("一个具体生活场景"),
    reading: z.string().describe("用本章概念怎么理解它"),
  })).min(2).max(6),
  misconceptions: z.array(z.object({
    claim: z.string().describe("常见说法"),
    correction: z.string().describe("按本章材料，哪里不准确"),
  })).min(2).max(6),
  practice: z.array(z.object({
    action: z.string().describe("读者今天就能做的一件小事"),
    boundary: z.string().describe("适用边界或不该拿它做什么"),
  })).min(2).max(6),
  quiz: z.array(z.object({
    question: z.string(),
    answer: z.string().describe("两三句内答完"),
  })).min(3).max(6),
  takeaway: z.string().describe("读完这一章最该带走的一句话"),
});

const system = [
  "你在为中文心理学自学站写“章节拆解”。读者是心理学爱好者，不是研究者。",
  "把下面这一章重新组织成一份能读懂、能用上的笔记，而不是复述原文。",
  "硬规则：",
  "1. 只使用材料中的事实与观点；可以压缩、改写、打比方，但不能新增研究结论、数字、人名或疗法。",
  "2. 原文是机器翻译腔时，用清楚的中文重写，不要保留生硬句式。",
  "3. 概念解释要说清“是什么、不是什么、容易和什么混淆”，不要只给定义。",
  "4. 机制部分写清步骤与成立条件；例子必须能对上正文里的概念，不能编造实验。",
  "5. 误区纠正要克制：材料没支持的就写“材料没有说明”，不要断言。",
  "6. 练习只写安全的日常动作，明确它不替代心理咨询或治疗。",
  "7. 全文避免“值得注意的是”“总而言之”等套话；句子短，具体。",
  "只返回 JSON。结构必须严格等于下面的键名与层级，不得改名、不得增加顶层键：",
  '{"oneLine":"...","overview":"...","concepts":[{"name":"...","explanation":"...","confusion":"..."}],"mechanism":[{"step":"...","detail":"..."}],"examples":[{"scene":"...","reading":"..."}],"misconceptions":[{"claim":"...","correction":"..."}],"practice":[{"action":"...","boundary":"..."}],"quiz":[{"question":"...","answer":"..."}],"takeaway":"..."}',
].join("\n");

const user = `书名：${toc.book.title}\n章节：${chapter.slug} ${chapter.title}\n\n${material}`;

const result = await chatJson({
  model,
  purpose: "kb_decompose",
  subject: `kb:${bookId}:${chapter.slug}`,
  promptVersion: "kb-note-v3",
  system,
  user,
  schema: Note,
  maxTokens: 4000,
  temperature: 0.4,
  timeoutMs: 180_000,
  attemptTag: flag("tag"),
});

const outDir = path.join(base, "notes");
await mkdir(outDir, { recursive: true });
const payload = {
  chapter: chapter.slug,
  title: chapter.title,
  generatedAt: new Date().toISOString().slice(0, 10),
  model: result.model,
  source: chapter.sections.map((s) => ({ slug: s.slug, title: s.title })),
  note: result.data,
};
await writeFile(path.join(outDir, `${chapter.slug}.json`), JSON.stringify(payload, null, 1), "utf8");
await closeDb();
console.log(JSON.stringify({ book: bookId, chapter: chapter.slug, chars: material.length, concepts: result.data.concepts.length, receipt: result.receiptId }));
