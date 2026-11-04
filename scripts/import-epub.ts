// Imports an EPUB into the knowledge base:
//   apps/web/app/data/kb/books/<id>/{toc.json,sections/*.json}
// and adds/updates its entry in apps/web/app/data/kb/library.json.
// Images are extracted, converted to WebP and served from apps/web/public/kb/.
// Run: node scripts/import-epub.ts <book.epub> [--id slug] [--license "CC BY 4.0"] [--source URL]
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { unzipSync } from "fflate";
import * as cheerio from "cheerio";
import sharp from "sharp";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const flag = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? fallback) : fallback;
};
if (!file) {
  console.error("usage: node scripts/import-epub.ts <book.epub> [--id slug] [--license CC-BY-4.0] [--source URL]");
  process.exit(1);
}

const KB = path.resolve(import.meta.dirname, "../apps/web/app/data/kb");
const PUBLIC = path.resolve(import.meta.dirname, "../apps/web/public/kb");
await mkdir(PUBLIC, { recursive: true });

const zip = unzipSync(new Uint8Array(await readFile(file)));
const names = Object.keys(zip);
const text = (name: string) => Buffer.from(zip[name]!).toString("utf8");
const dirOf = (p: string) => p.split("/").slice(0, -1).join("/");
const norm = (p: string) => {
  const out: string[] = [];
  for (const part of decodeURIComponent(p.replace(/^\.\//, "")).split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
};
const resolve = (base: string, href: string) => norm(path.posix.join(dirOf(base), href.split("#")[0]!));

const container = text("META-INF/container.xml");
const opfPath = /full-path="([^"]+)"/.exec(container)?.[1];
if (!opfPath) throw new Error("no OPF in container.xml");
const opf = cheerio.load(text(opfPath), { xml: true });
const meta = (tag: string) => opf(`metadata > ${tag}, dc\\:${tag}`).first().text().trim() || opf(tag).first().text().trim();
const title = meta("title") || path.basename(file, ".epub");
const authors = opf("metadata creator, dc\\:creator").map((_i, el) => opf(el).text().trim()).get().filter(Boolean).join("、") || "未知作者";
const rights = meta("rights") || flag("license", "保留所有权利（仅本地预览）")!;
const language = meta("language") || "zh-CN";

const manifest = new Map<string, { href: string; type: string; props: string }>();
opf("manifest > item").each((_i, el) => {
  const id = opf(el).attr("id");
  const href = opf(el).attr("href");
  if (id && href) manifest.set(id, { href: resolve(opfPath, href), type: opf(el).attr("media-type") ?? "", props: opf(el).attr("properties") ?? "" });
});
const spine: string[] = [];
opf("spine > itemref").each((_i, el) => {
  const id = opf(el).attr("idref");
  if (id && manifest.has(id)) spine.push(manifest.get(id)!.href);
});

/** EPUB3 nav (properties="nav") else EPUB2 NCX. Returns top-level entries with children. */
interface NavItem { title: string; href: string; children: NavItem[] }
function parseNav(): NavItem[] {
  const navItem = [...manifest.values()].find((m) => /(^|\s)nav(\s|$)/.test(m.props));
  if (navItem) {
    const $ = cheerio.load(text(navItem.href));
    const root = $("nav[epub\\:type='toc'], nav.toc").first().length ? $("nav[epub\\:type='toc'], nav.toc").first() : $("nav").first();
    const read = (ol: cheerio.Cheerio<any>, base: string): NavItem[] =>
      ol.children("li").map((_i, li) => {
        const a = $(li).children("a").first();
        const href = a.attr("href") ? resolve(base, a.attr("href")!) : "";
        const childOl = $(li).children("ol, ul").first();
        return { title: a.text().trim(), href, children: childOl.length ? read(childOl, base) : [] };
      }).get().filter((x) => x.href);
    return read(root.children("ol, ul").first(), navItem.href);
  }
  const ncx = [...manifest.values()].find((m) => /ncx/.test(m.type));
  if (ncx) {
    const $ = cheerio.load(text(ncx.href), { xml: true });
    const read = (points: cheerio.Cheerio<any>, base: string): NavItem[] =>
      points.map((_i, p) => {
        const el = $(p);
        const src = el.children("content").attr("src") ?? "";
        const children = el.children("navPoint");
        return { title: el.children("navLabel").text().trim(), href: src ? resolve(base, src) : "", children: children.length ? read(children, base) : [] };
      }).get().filter((x) => x.href);
    return read($("navMap").children("navPoint"), ncx.href);
  }
  return [];
}
const nav = parseNav();

const isHtml = (p: string) => /\.x?html?$/i.test(p);
const isNav = (p: string) => /nav\.x?html$|toc\.ncx$/.test(p);
const isCover = (p: string) => /(^|\/)(cover|titlepage|title_page)[^/]*\.x?html$/i.test(p);
/** Project Gutenberg license/header pages, and other front matter that is not the book itself. */
const isBoilerplate = (p: string) => {
  if (!zip[p]) return true;
  if (/(^|\/)(license|copyright|colophon|uncopyright)[^/]*\.x?html$/i.test(p)) return true;
  const sample = Buffer.from(zip[p]!).toString("utf8").slice(0, 4000);
  return /Project Gutenberg License|\*\*\* START OF (THE|THIS) PROJECT GUTENBERG/i.test(sample);
};

async function storeImage(bytes: Buffer) {
  const hash = createHash("sha1").update(bytes).digest("hex").slice(0, 16);
  const out = await sharp(bytes, { failOn: "none" }).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  await writeFile(path.join(PUBLIC, `${hash}.webp`), out);
  return `/kb/${hash}.webp`;
}

/** Split a document into the block subset the reader styles. */
async function blocks(docPath: string, linkMap: Map<string, string>) {
  const $ = cheerio.load(text(docPath));
  $("script,style,link,meta,iframe,form,input,button,svg").remove();
  $("nav").remove();
  const body = $("body").length ? $("body") : $.root();
  for (const el of body.find("img").toArray()) {
    const img = $(el);
    const src = img.attr("src");
    if (!src) { img.remove(); continue; }
    const entry = resolve(docPath, src);
    if (zip[entry]) {
      const local = await storeImage(Buffer.from(zip[entry]!));
      img.attr("src", local);
    } else {
      img.remove();
      continue;
    }
    img.removeAttr("class").removeAttr("style").removeAttr("width").removeAttr("height").removeAttr("srcset");
    img.attr("loading", "lazy");
    if (!img.attr("alt")) img.attr("alt", "");
  }
  body.find("a").each((_i, el) => {
    const a = $(el);
    const href = a.attr("href");
    if (!href) { a.replaceWith(a.html() ?? ""); return; }
    if (href.startsWith("#")) { a.replaceWith(a.html() ?? ""); return; }
    const target = href.startsWith("http") ? href : resolve(docPath, href);
    const local = linkMap.get(target);
    a.attr("href", local ?? target);
    if (!local) { a.attr("target", "_blank"); a.attr("rel", "noopener noreferrer"); }
    a.removeAttr("class").removeAttr("style");
  });
  body.find("*").each((_i, el) => {
    const node = $(el);
    for (const attr of Object.keys((el as any).attribs ?? {})) {
      const tag = (el as any).tagName?.toLowerCase?.() ?? "";
      const keep = (tag === "a" && ["href", "target", "rel"].includes(attr))
        || (tag === "img" && ["src", "alt", "loading"].includes(attr))
        || (["td", "th"].includes(tag) && ["colspan", "rowspan"].includes(attr))
        || (["ol"].includes(tag) && attr === "start");
      if (!keep) node.removeAttr(attr);
    }
  });
  body.find("div:empty, p:empty, span:empty").remove();
  return (body.html() ?? "").trim();
}

const stripTags = (html: string) => cheerio.load(html).text();
const headingTitle = (docPath: string, fallback: string) => {
  const $ = cheerio.load(text(docPath));
  const h = $("h1, h2, h3").first().text().trim() || $("title").text().trim();
  return (h || fallback).replace(/\s+/g, " ").slice(0, 120);
};

// Nav documents, in spine order, deduplicated.
const inNav = new Map<string, { title: string; parent?: string }>();
for (const top of nav) {
  if (isCover(top.href)) continue;
  inNav.set(top.href, { title: top.title });
  for (const child of top.children) inNav.set(child.href, { title: child.title, parent: top.href });
}
const docs = spine.filter((p) => isHtml(p) && !isNav(p) && !isCover(p) && !isBoilerplate(p));
const ordered = docs.length ? docs : spine.filter((p) => isHtml(p) && zip[p]);

const id = (flag("id") ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).slice(0, 60) || `book-${Date.now()}`;
const bookDir = path.join(KB, "books", id);
await mkdir(path.join(bookDir, "sections"), { recursive: true });

// Plan chapters/sections from nav when it mirrors the spine, else one chapter per document.
const chapters: Array<{ title: string; docs: Array<{ doc: string; title: string }> }> = [];
const used = new Set<string>();
for (const top of nav) {
  if (isCover(top.href) || isNav(top.href) || isBoilerplate(top.href)) continue;
  const entry = { title: top.title, docs: [] as Array<{ doc: string; title: string }> };
  if (top.children.length) {
    for (const child of top.children) {
      if (isBoilerplate(child.href) || isCover(child.href) || isNav(child.href)) continue;
      entry.docs.push({ doc: child.href, title: child.title });
      used.add(child.href);
    }
    if (!entry.docs.length) continue;
  } else {
    entry.docs.push({ doc: top.href, title: top.title || headingTitle(top.href, "") });
    used.add(top.href);
  }
  chapters.push(entry);
}
for (const doc of ordered) {
  if (used.has(doc)) continue;
  chapters.push({ title: headingTitle(doc, `第 ${chapters.length + 1} 部分`), docs: [{ doc, title: headingTitle(doc, "") }] });
}
if (!chapters.length) throw new Error("no readable documents in the EPUB");

const pad = (n: number) => String(n).padStart(2, "0");
const linkMap = new Map<string, string>();
chapters.forEach((chapter, ci) => {
  for (const [si, section] of chapter.docs.entries()) linkMap.set(section.doc, `/kb/${id}/${pad(ci + 1)}/${pad(si)}`);
});

const tocChapters: any[] = [];
let total = 0;
for (const [ci, chapter] of chapters.entries()) {
  const chapterSlug = pad(ci + 1);
  const sections: any[] = [];
  for (const [si, section] of chapter.docs.entries()) {
    const sectionSlug = pad(si);
    const file = `${chapterSlug}-${sectionSlug}`;
    const html = await blocks(section.doc, linkMap);
    if (!stripTags(html).trim()) continue;
    const sectionTitle = (section.title || headingTitle(section.doc, "")).replace(/\s+/g, " ").slice(0, 140);
    await writeFile(path.join(bookDir, "sections", `${file}.json`), JSON.stringify({ title: sectionTitle, chapter: chapter.title, html }), "utf8");
    sections.push({ slug: sectionSlug, title: sectionTitle, file });
    total++;
  }
  if (sections.length) tocChapters.push({ slug: chapterSlug, title: chapter.title.replace(/^\d+[.、\s]*/, "").slice(0, 140), sections });
}

const toc = {
  book: {
    title,
    subtitle: "EPUB 导入",
    source: flag("source", `本地文件：${path.basename(file)}`),
    sourceContent: flag("source", ""),
    authors,
    license: { name: rights, url: /creativecommons\.org/i.test(rights) ? rights : "" },
    importedAt: new Date().toISOString().slice(0, 10),
    chapters: tocChapters.length,
    sections: total,
  },
  chapters: tocChapters,
};
await writeFile(path.join(bookDir, "toc.json"), JSON.stringify(toc, null, 1), "utf8");

// Library entry (replace by id, else append).
const libraryPath = path.join(KB, "library.json");
const library = JSON.parse(await readFile(libraryPath, "utf8")) as { books: any[] };
const entry = {
  id,
  title,
  subtitle: "EPUB 导入",
  authors,
  kind: "book",
  license: toc.book.license,
  source: toc.book.source,
  sourceContent: toc.book.sourceContent,
  importedAt: toc.book.importedAt,
  chapters: tocChapters.length,
  sections: total,
};
const at = library.books.findIndex((b) => b.id === id);
if (at >= 0) library.books[at] = entry;
else library.books.push(entry);
await writeFile(libraryPath, JSON.stringify(library, null, 2) + "\n", "utf8");

console.log(JSON.stringify({ id, title, chapters: tocChapters.length, sections: total, images: (await readdir(PUBLIC)).length }, null, 1));
