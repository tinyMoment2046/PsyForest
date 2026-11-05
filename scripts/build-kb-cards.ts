// Builds method cards ("方法卡") from specific book sections, following the distillation method:
// source anchor → reusable method → when to use → limits → a worked example → retrieval self-test.
// Run: node scripts/build-kb-cards.ts [--only slug,slug]
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import { z } from "zod";
import { chatJson } from "../packages/backend/src/providers/llm.ts";
import { closeDb } from "../packages/backend/src/db.ts";
import { HIT_THRESHOLD, score } from "../apps/web/app/features/kb/search.ts";

const args = process.argv.slice(2);
const flag = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? fallback) : fallback;
};
const only = flag("only")?.split(",").map((s) => s.trim()).filter(Boolean);
const bookId = "psychology-2e";

interface Def {
  slug: string;
  title: string;
  tags: string[];
  sections: Array<{ chapter: string; section: string }>;
}

const DEFS: Def[] = [
  { slug: "label-the-emotion", title: "情绪上来时，怎么先让自己缓一下？", tags: ["情绪与压力"], sections: [{ chapter: "10", section: "04" }, { chapter: "14", section: "04" }] },
  { slug: "reappraise", title: "同一件事越想越糟，怎么换个角度？", tags: ["情绪与压力"], sections: [{ chapter: "14", section: "04" }] },
  { slug: "spaced-retrieval", title: "读过的内容怎么才记得住？", tags: ["学习"], sections: [{ chapter: "08", section: "04" }] },
  { slug: "habit-loop", title: "想养成一个新习惯，从哪里下手？", tags: ["自我"], sections: [{ chapter: "06", section: "03" }] },
  { slug: "sleep-rhythm", title: "作息乱了，怎么把睡眠调回来？", tags: ["睡眠"], sections: [{ chapter: "04", section: "02" }, { chapter: "04", section: "04" }] },
  { slug: "ask-for-support", title: "难受的时候，怎么开口求助？", tags: ["关系", "求助"], sections: [{ chapter: "14", section: "04" }, { chapter: "16", section: "05" }] },
];

const base = path.resolve(import.meta.dirname, `../apps/web/app/data/kb/books/${bookId}`);
const toc = JSON.parse(await readFile(path.join(base, "toc.json"), "utf8")) as {
  book: { title: string };
  chapters: Array<{ slug: string; title: string; sections: Array<{ slug: string; title: string; file: string }> }>;
};
const outDir = path.resolve(import.meta.dirname, "../apps/web/app/data/kb/cards");
await mkdir(outDir, { recursive: true });

const strip = (html: string) => cheerio.load(html).root().text().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

const Card = z.object({
  problem: z.string().describe("卡片只解决的那一个问题，读者语言，一句话"),
  method: z.array(z.object({
    step: z.string().describe("动作名，动词开头"),
    detail: z.string().describe("具体怎么做，含例子或判断标准"),
  })).min(3).max(6),
  scenes: z.array(z.string()).min(2).max(4).describe("什么时候用，具体到场景"),
  limits: z.array(z.string()).min(2).max(4).describe("不适用/别拿它做什么，或可能失效的条件"),
  keywords: z.array(z.string()).min(4).max(8).describe("检索词：读者可能用的说法，不要只写术语"),
  aliases: z.array(z.string()).min(6).max(10).describe("读者可能用来问同一件事的其他说法，口语化，覆盖不同措辞"),
  example: z.object({
    before: z.string().describe("一个具体输入或处境"),
    after: z.string().describe("按这张卡处理后变成什么样"),
  }),
  queries: z.array(z.object({
    q: z.string().describe("读者可能问的一句话"),
    expect: z.enum(["hit", "miss"]).describe("是否应该命中这张卡"),
  })).min(4).max(5),
});

const system = [
  "你在为一本书做“方法卡”：从指定小节里抽出一个可复用的做法，写成一张能检索、能照做的卡。",
  "硬规则：",
  "1. 只使用材料里的方法与事实；可以改写、压缩，不能补充材料没有的技巧、数字或疗效承诺。",
  "2. 方法必须是动作序列，读者照着能做；不要写成概念解释或章节摘要。",
  "3. 限制要具体：什么情况下不做、可能没效果、需要专业帮助的情形。",
  "4. 关键词写读者会脱口而出的说法（“脑子停不下来”“睡不着”）；aliases 再给 6–10 种不同问法，覆盖口语、情绪描述和具体处境。",
  "5. 例子用日常场景，不编造研究或数据。",
  "6. queries 给出 4–5 个读者可能的问题：3–4 个应当命中本卡，1 个明确无关（expect=miss）。",
  "7. 只返回 JSON，键名严格如下，不得改名或增加顶层键：",
  '{"problem":"...","method":[{"step":"...","detail":"..."}],"scenes":["..."],"limits":["..."],"keywords":["..."],"aliases":["..."],"example":{"before":"...","after":"..."},"queries":[{"q":"...","expect":"hit"}]}',
].join("\n");

const queue = DEFS.filter((d) => !only || only.includes(d.slug));
const results: string[] = [];

async function build(def: Def) {
  const parts: string[] = [];
  const sources: Array<{ chapter: string; chapterTitle: string; section: string; sectionTitle: string }> = [];
  for (const ref of def.sections) {
    const chapter = toc.chapters.find((c) => c.slug === ref.chapter);
    const section = chapter?.sections.find((s) => s.slug === ref.section);
    if (!chapter || !section) continue;
    const data = JSON.parse(await readFile(path.join(base, "sections", `${section.file}.json`), "utf8")) as { html: string };
    parts.push(`## 第${chapter.slug}章 ${chapter.title} · ${section.title}\n${strip(data.html).slice(0, 12_000)}`);
    sources.push({ chapter: chapter.slug, chapterTitle: chapter.title, section: section.slug, sectionTitle: section.title });
  }

  const result = await chatJson({
    model: "default",
    purpose: "kb_card",
    subject: `kbcard:${bookId}:${def.slug}`,
    promptVersion: "kb-card-v2",
    system,
    user: `读者问题：${def.title}\n\n材料：\n\n${parts.join("\n\n")}`,
    schema: Card,
    maxTokens: 3000,
    temperature: 0.4,
    timeoutMs: 180_000,
  });

  // Run the card's own retrieval tests against the scorer the page uses.
  const searchable = { title: def.title, problem: result.data.problem, scenes: result.data.scenes, keywords: result.data.keywords, aliases: result.data.aliases };
  const tests = result.data.queries.map((q) => {
    const s = score(searchable, q.q);
    return { question: q.q, expect: q.expect, score: Number(s.toFixed(2)), hit: s >= HIT_THRESHOLD, passed: (s >= HIT_THRESHOLD) === (q.expect === "hit") };
  });

  const payload = {
    slug: def.slug,
    title: def.title,
    tags: def.tags,
    problem: result.data.problem,
    method: result.data.method,
    scenes: result.data.scenes,
    limits: result.data.limits,
    keywords: result.data.keywords,
    aliases: result.data.aliases,
    example: result.data.example,
    sources,
    book: { id: bookId, title: toc.book.title },
    tests,
    generatedAt: new Date().toISOString().slice(0, 10),
    model: result.model,
  };
  await writeFile(path.join(outDir, `${def.slug}.json`), JSON.stringify(payload, null, 1), "utf8");
  results.push(def.slug);
  console.log(JSON.stringify({ card: def.slug, passed: tests.filter((t) => t.passed).length, total: tests.length, receipt: result.receiptId }));
}

const workers = Array.from({ length: 3 }, async () => {
  for (;;) {
    const def = queue.shift();
    if (!def) return;
    try {
      await build(def);
    } catch (error) {
      console.error(JSON.stringify({ card: def.slug, error: String((error as Error)?.message ?? error).slice(0, 160) }));
    }
  }
});
await Promise.all(workers);
await closeDb();
console.log(JSON.stringify({ written: results.length, cards: results }));
