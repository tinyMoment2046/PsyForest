// Builds reader-question guides ("我现在遇到的事") from the imported book's chapter notes.
// Each guide answers one question a reader actually arrives with, instead of summarizing a chapter.
// Run: node scripts/build-kb-guides.ts [--book psychology-2e] [--only slug,slug]
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { chatJson } from "../packages/backend/src/providers/llm.ts";
import { closeDb } from "../packages/backend/src/db.ts";

const args = process.argv.slice(2);
const flag = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? fallback) : fallback;
};
const bookId = flag("book", "psychology-2e")!;
const only = flag("only")?.split(",").map((s) => s.trim()).filter(Boolean);
const model = flag("model", "default")!;

interface Question {
  slug: string;
  question: string;
  tags: string[];
  chapters: string[];
  audience: string;
}

const QUESTIONS: Question[] = [
  { slug: "rumination", question: "总是内耗，脑子里停不下来，怎么办？", tags: ["情绪与压力"], chapters: ["14", "07", "11"], audience: "反复回想、难以停下来的人" },
  { slug: "cant-sleep", question: "明明很累，却睡不着", tags: ["睡眠"], chapters: ["04", "14"], audience: "躺下就清醒、越睡越累的人" },
  { slug: "people-pleasing", question: "为什么我总在关系里讨好别人？", tags: ["关系"], chapters: ["12", "11"], audience: "怕冲突、习惯先满足别人的人" },
  { slug: "stress-body", question: "一有压力就心慌、胃痛，是身体出问题了吗？", tags: ["情绪与压力"], chapters: ["14", "03"], audience: "压力下出现身体反应的人" },
  { slug: "stick-to-it", question: "怎样才能坚持做一件事，而不是三天热度？", tags: ["自我"], chapters: ["06", "10"], audience: "反复开始又放弃的人" },
  { slug: "forget-books", question: "读过的书总是记不住，怎么办？", tags: ["学习"], chapters: ["08", "07"], audience: "想读得进去、留得下来的人" },
  { slug: "am-i-depressed", question: "我是不是抑郁了，怎么判断？", tags: ["情绪与压力"], chapters: ["15", "16"], audience: "持续低落、拿不准要不要求助的人" },
  { slug: "argue-better", question: "吵架时怎么说话，才不把关系吵坏？", tags: ["关系"], chapters: ["12", "10"], audience: "一争执就失控或冷战的人" },
  { slug: "procrastination", question: "拖延是因为懒吗？", tags: ["自我"], chapters: ["06", "07"], audience: "总是拖到最后一刻的人" },
  { slug: "therapy-worth", question: "心理咨询到底有没有用，什么时候该去？", tags: ["求助"], chapters: ["16", "15"], audience: "犹豫要不要开始咨询的人" },
];

const Guide = z.object({
  dek: z.string().describe("两句：把读者的处境说出来，再说这篇会帮他看清什么"),
  readMinutes: z.number().int().min(3).max(8),
  sections: z.array(z.object({
    heading: z.string().describe("小标题，读者语言，不要用教材术语"),
    body: z.string().describe("120-220 字，解释发生了什么、为什么会这样"),
  })).min(2).max(4),
  actions: z.array(z.object({
    title: z.string().describe("一个具体动作"),
    how: z.string().describe("怎么做，步骤或例子"),
    why: z.string().describe("为什么有效，一句"),
  })).min(2).max(5),
  myths: z.array(z.object({
    claim: z.string().describe("常见说法"),
    correction: z.string().describe("按材料纠正，别把话说满"),
  })).min(2).max(4),
  help: z.object({
    signs: z.array(z.string()).min(2).max(6).describe("出现这些情况就该找专业帮助"),
    note: z.string().describe("一句边界：本文不能替代诊断或治疗"),
  }),
  sources: z.array(z.string()).describe("依据的章节，形如 14 压力、生活方式和健康"),
});

const base = path.resolve(import.meta.dirname, `../apps/web/app/data/kb/books/${bookId}`);
const toc = JSON.parse(await readFile(path.join(base, "toc.json"), "utf8")) as {
  book: { title: string };
  chapters: Array<{ slug: string; title: string }>;
};
const notesDir = path.join(base, "notes");
const outDir = path.resolve(import.meta.dirname, "../apps/web/app/data/kb/guides");
await mkdir(outDir, { recursive: true });

const system = [
  "你在为一个中文心理学自学站写读者问答。读者不是来学教材，他是带着一个具体困扰来的。",
  "写作要求：",
  "1. 直接回答标题里的问题，不要先讲学科背景，不要按教材章节顺序复述。",
  "2. 用第二人称、短句、具体场景；避免“值得注意的是”“综上所述”等套话。",
  "3. 解释只使用提供的材料（章节拆解）里的事实与机制；可以改写、打比方，不能新增研究结论、数字或疗法。",
  "4. 动作要今天就能做，写清步骤；不要承诺“根治”“彻底解决”。",
  "5. 不做诊断：不根据症状清单说读者“患有”某种障碍。涉及心理障碍时只讲“什么情况值得去评估”。",
  "6. 求助部分要具体：出现哪些信号、去哪里（精神科/心理治疗/危机热线），并保留“本文不替代诊断”。",
  "7. 不要自创比喻或场景来“讲生动”；材料里没有的类比、数字和案例都不要写。解释不清的地方就直说机制。",
  "8. 每段第一句先给结论，再展开；段落不超过 4 句。",
  "9. 只返回 JSON，键名严格按给定结构，不得改名或增加顶层键。",
  '{"dek":"...","readMinutes":4,"sections":[{"heading":"...","body":"..."}],"actions":[{"title":"...","how":"...","why":"..."}],"myths":[{"claim":"...","correction":"..."}],"help":{"signs":["..."],"note":"..."},"sources":["14 压力、生活方式和健康"]}',
].join("\n");

const queue = QUESTIONS.filter((q) => !only || only.includes(q.slug));
const results: string[] = [];

async function build(q: Question) {
  const materials: string[] = [];
  for (const chapter of q.chapters) {
    const file = path.join(notesDir, `${chapter}.json`);
    try {
      const note = JSON.parse(await readFile(file, "utf8"));
      const chapterTitle = toc.chapters.find((c) => c.slug === chapter)?.title ?? chapter;
      const n = note.note;
      materials.push([
        `## ${chapter} ${chapterTitle}`,
        `概念：${n.concepts.map((c: any) => `${c.name}（${c.explanation}）`).join("；")}`,
        `机制：${n.mechanism.map((m: any) => `${m.step}：${m.detail}`).join("；")}`,
        `误区：${n.misconceptions.map((m: any) => `${m.claim} → ${m.correction}`).join("；")}`,
        `例子：${n.examples.map((e: any) => `${e.scene} → ${e.reading}`).join("；")}`,
      ].join("\n"));
    } catch {
      /* a missing chapter note is skipped; the guide can still be written from the rest */
    }
  }

  const result = await chatJson({
    model,
    purpose: "kb_guide",
    subject: `kbguide:${bookId}:${q.slug}`,
    promptVersion: "kb-guide-v3",
    system,
    user: `读者问题：${q.question}\n读者画像：${q.audience}\n\n可用的章节材料：\n\n${materials.join("\n\n").slice(0, 40_000)}`,
    schema: Guide,
    maxTokens: 3000,
    temperature: 0.5,
    timeoutMs: 180_000,
  });

  const payload = {
    slug: q.slug,
    question: q.question,
    tags: q.tags,
    deck: result.data.dek,
    readMinutes: result.data.readMinutes,
    sections: result.data.sections,
    actions: result.data.actions,
    myths: result.data.myths,
    help: result.data.help,
    sources: result.data.sources,
    book: { id: bookId, title: toc.book.title },
    generatedAt: new Date().toISOString().slice(0, 10),
    model: result.model,
  };
  await writeFile(path.join(outDir, `${q.slug}.json`), JSON.stringify(payload, null, 1), "utf8");
  results.push(q.slug);
  console.log(JSON.stringify({ guide: q.slug, receipt: result.receiptId }));
}

const workers = Array.from({ length: 3 }, async () => {
  for (;;) {
    const q = queue.shift();
    if (!q) return;
    try {
      await build(q);
    } catch (error) {
      console.error(JSON.stringify({ guide: q.slug, error: String((error as Error)?.message ?? error).slice(0, 160) }));
    }
  }
});
await Promise.all(workers);
await closeDb();
console.log(JSON.stringify({ written: results.length, guides: results }));
