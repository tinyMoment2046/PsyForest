// Builds the cross-book concept index from every chapter note:
//   apps/web/app/data/kb/concepts.json
// Run after decompose-kb.ts:  node scripts/index-kb-concepts.ts
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const KB = path.resolve(import.meta.dirname, "../apps/web/app/data/kb");
const library = JSON.parse(await readFile(path.join(KB, "library.json"), "utf8")) as {
  books: Array<{ id: string; title: string }>;
};

interface Entry {
  name: string;
  explanation: string;
  confusion: string;
  bookId: string;
  bookTitle: string;
  chapter: string;
  chapterTitle: string;
  href: string;
}

const entries: Entry[] = [];
for (const book of library.books) {
  const dir = path.join(KB, "books", book.id, "notes");
  const files = (await readdir(dir).catch(() => [] as string[])).filter((f) => f.endsWith(".json"));
  const toc = JSON.parse(await readFile(path.join(KB, "books", book.id, "toc.json"), "utf8")) as {
    chapters: Array<{ slug: string; title: string }>;
  };
  for (const file of files) {
    const note = JSON.parse(await readFile(path.join(dir, file), "utf8"));
    const chapterSlug = file.replace(/\.json$/, "");
    const chapterTitle = toc.chapters.find((c) => c.slug === chapterSlug)?.title ?? note.title ?? "";
    for (const concept of note.note?.concepts ?? []) {
      entries.push({
        name: String(concept.name).trim(),
        explanation: String(concept.explanation),
        confusion: String(concept.confusion ?? ""),
        bookId: book.id,
        bookTitle: book.title,
        chapter: chapterSlug,
        chapterTitle,
        href: `/kb/${book.id}/notes/${chapterSlug}`,
      });
    }
  }
}

entries.sort((a, b) => a.name.localeCompare(b.name, "zh"));

await writeFile(path.join(KB, "concepts.json"), JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), concepts: entries }, null, 1), "utf8");
console.log(JSON.stringify({ concepts: entries.length, books: library.books.length }));
