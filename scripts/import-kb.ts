// Imports the LibreTexts/OpenStax 《心理学入门 2e》 into static knowledge-base files:
//   apps/web/app/data/kb/toc.json and sections/<chapter>-<section>.json
// Images (when downloaded) go to apps/web/public/kb/.
// Run: node scripts/import-kb.ts [--no-images]
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { ProxyAgent, fetch as ufetch } from "undici";
import * as cheerio from "cheerio";
import sharp from "sharp";

const BOOK_ID = "203558";
const API = "https://query.libretexts.org/@api/deki/pages";
const SOURCE = "https://query.libretexts.org/简体中文/心理学入门_2e_(OpenStax)";
const OUT = path.resolve(import.meta.dirname, "../apps/web/app/data/kb/books/psychology-2e");
const ASSETS = path.resolve(import.meta.dirname, "../apps/web/public/kb");
const proxy = process.env.EGRESS_PROXY_URL;
const agent = proxy ? new ProxyAgent(proxy) : undefined;
const downloadImages = process.argv.includes("--images");
const SKIP_TOP = /^(Front Matter|正面问题|Back Matter|回来物质|心理学入门 2e \(OpenStax\))$/i;

async function api<T = any>(url: string): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await ufetch(url, { dispatcher: agent as never, headers: { accept: "application/json" } });
    if (res.ok) return (await res.json()) as T;
    if (res.status < 500 && res.status !== 429) throw new Error(`${res.status} ${url}`);
    await res.body?.cancel();
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  throw new Error(`gave up ${url}`);
}

interface Node { id: string; title: string; path: string; depth: number }

async function tree(id: string, depth: number, out: Node[]): Promise<Node[]> {
  const j = await api(`${API}/${id}/subpages?dream.out.format=json`);
  const list = ([] as any[]).concat(j["page.subpage"] ?? []);
  for (const p of list) {
    out.push({ id: p["@id"], title: p.title, path: p.path?.["#text"] ?? "", depth });
    await tree(p["@id"], depth + 1, out);
  }
  return out;
}

const slug = (n: number) => String(n).padStart(2, "0");

/** One page's content HTML, cleaned to a small semantic subset and mapped to local links/assets. */
async function content(id: string, linkMap: Map<string, string>): Promise<string> {
  const j = await api(`${API}/${id}/contents?dream.out.format=json`);
  const raw = ([] as any[]).concat(j.body).map((part) => (typeof part === "string" ? part : "")).join("");
  const $ = cheerio.load(`<div id="kb-root">${raw}</div>`);
  const root = $("#kb-root");
  root.find("script,style,iframe,form,input,button,svg,noscript").remove();

  // LibreTexts boxes become callouts; keep their legend as the callout title.
  root.find("section.box-objectives, section[class*='box-']").each((_i, el) => {
    const box = $(el);
    const label = box.find(".box-legend").first().text().trim();
    box.find(".box-legend").first().remove();
    box.replaceWith(
      `<aside class="kb-callout" data-kind="${box.attr("class")?.match(/box-([a-z-]+)/)?.[1] ?? "note"}">${label ? `<p class="kb-callout-title">${label}</p>` : ""}${box.html() ?? ""}</aside>`,
    );
  });

  // Drop the anchor spans LibreTexts sprinkles everywhere, unwrap inline wrappers.
  root.find("span[id], a[id]").each((_i, el) => { $(el).replaceWith($(el).html() ?? ""); });
  root.find("span, font, div.mt-section, div[mt-section-origin]").each((_i, el) => {
    const el2 = $(el);
    if (el2.children("p, ul, ol, figure, table, aside, h1, h2, h3, h4, h5, h6, blockquote").length === 0) {
      el2.replaceWith(el2.html() ?? "");
    } else {
      el2.replaceWith(`<div>${el2.html() ?? ""}</div>`);
    }
  });

  // Images: absolute source, optionally downloaded and converted to WebP.
  const images = root.find("img").toArray();
  for (const el of images) {
    const img = $(el);
    const src = img.attr("src");
    if (!src) { img.remove(); continue; }
    const abs = new URL(src, SOURCE).toString();
    if (downloadImages) {
      const local = await fetchImage(abs).catch(() => null);
      if (local) img.attr("src", local);
      else img.attr("src", abs);
    } else {
      img.attr("src", abs);
    }
    for (const a of ["class", "style", "srcset", "width", "height", "data-*"]) img.removeAttr(a);
    img.attr("loading", "lazy");
  }

  // Links: internal book pages go to the local reader; everything else opens outside.
  root.find("a").each((_i, el) => {
    const a = $(el);
    const href = a.attr("href");
    if (!href) { a.replaceWith(a.html() ?? ""); return; }
    if (href.startsWith("#")) { a.removeAttr("href"); a.replaceWith(a.html() ?? ""); return; }
    let target = href;
    try { target = new URL(href, SOURCE).toString(); } catch { /* keep */ }
    const key = decodeURIComponent(new URL(target).pathname);
    const local = linkMap.get(key);
    a.attr("href", local ?? target);
    if (!local) { a.attr("target", "_blank"); a.attr("rel", "noopener noreferrer"); }
    a.removeAttr("class").removeAttr("style").removeAttr("title");
  });

  // Keep a small attribute allowlist; drop classes, ids and inline styles everywhere.
  root.find("*").each((_i, el) => {
    const node = $(el);
    const tag = (el as any).tagName?.toLowerCase?.() ?? "";
    for (const attr of Object.keys((el as any).attribs ?? {})) {
      const keep = (tag === "a" && ["href", "target", "rel"].includes(attr))
        || (tag === "img" && ["src", "alt", "loading"].includes(attr))
        || (["td", "th"].includes(tag) && ["colspan", "rowspan"].includes(attr))
        || (tag === "aside" && ["class", "data-kind"].includes(attr))
        || (tag === "p" && attr === "class" && (node.attr("class") ?? "").startsWith("kb-callout"))
        || (["ol"].includes(tag) && attr === "start");
      if (!keep) node.removeAttr(attr);
    }
  });
  root.find("div:empty, p:empty").remove();
  root.find("h5.box-legend").remove();
  return (root.html() ?? "").trim();
}

const seenImages = new Map<string, string>();
async function fetchImage(url: string): Promise<string | null> {
  const known = seenImages.get(url);
  if (known) return known;
  const res = await ufetch(url, { dispatcher: agent as never, headers: { accept: "image/*" } });
  if (!res.ok) { await res.body?.cancel(); return null; }
  const body = Buffer.from(await res.arrayBuffer());
  if (body.length > 12 * 1024 * 1024) return null;
  const key = createHash("sha1").update(url).digest("hex").slice(0, 16);
  const file = `kb/${key}.webp`;
  try {
    const out = await sharp(body, { failOn: "none" }).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    await writeFile(path.join(ASSETS, `${key}.webp`), out);
  } catch {
    return null;
  }
  seenImages.set(url, `/${file}`);
  return `/${file}`;
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(path.join(OUT, "sections"), { recursive: true });
  await mkdir(ASSETS, { recursive: true });

  const nodes = await tree(BOOK_ID, 0, []);
  const chapters = nodes.filter((n) => n.depth === 0 && !SKIP_TOP.test(n.title));
  console.log(`chapters: ${chapters.length}`);

  const toc = { book: {}, chapters: [] as any[] };
  const linkMap = new Map<string, string>();

  chapters.forEach((ch, ci) => {
    const chapterSlug = slug(ci + 1);
    ch.sections = nodes.filter((n) => n.depth === 1 && n.path.startsWith(ch.path + "/"));
  });

  // Number sections and build the URL map before writing content.
  const plan = chapters.map((ch, ci) => {
    const chapterSlug = slug(ci + 1);
    const sections = nodes.filter((n) => n.depth === 1 && n.path.startsWith(`${ch.path}/`));
    const mapped = sections.map((s, si) => ({ ...s, short: slug(si), file: `${chapterSlug}-${slug(si)}`, local: `/kb/${chapterSlug}/${slug(si)}` }));
    linkMap.set(decodeURIComponent(new URL(toUrl(ch.path)).pathname), `/kb/${chapterSlug}`);
    for (const s of mapped) {
      if (s.path) linkMap.set(decodeURIComponent(new URL(toUrl(s.path)).pathname), s.local);
    }
    return { chapter: ch, chapterSlug, sections: mapped };
  });

  for (const { chapter, chapterSlug, sections } of plan) {
    const chapterTitle = cleanTitle(chapter.title);
    const entry: any = { slug: chapterSlug, title: chapterTitle, sections: [] };
    for (const s of sections) {
      const title = cleanTitle(s.title);
      const html = await content(s.id, linkMap);
      await writeFile(path.join(OUT, "sections", `${s.file}.json`), JSON.stringify({ title, chapter: chapterTitle, html }), "utf8");
      entry.sections.push({ slug: s.short, title, file: s.file });
      console.log(`  ${s.file} ${title} (${html.length}b)`);
    }
    toc.chapters.push(entry);
  }

  toc.book = {
    title: "心理学入门 2e",
    subtitle: "Psychology 2e · OpenStax 简体中文版",
    source: SOURCE,
    sourceContent: "https://openstax.org/details/books/psychology-2e",
    authors: "Rose M. Spielman、William J. Jenkins、Marilyn D. Lovett",
    license: { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
    importedAt: new Date().toISOString().slice(0, 10),
    chapters: toc.chapters.length,
    sections: toc.chapters.reduce((n: number, c: any) => n + c.sections.length, 0),
  } as any;
  await writeFile(path.join(OUT, "toc.json"), JSON.stringify(toc, null, 1), "utf8");
  console.log(`wrote ${toc.book.sections} sections; images ${seenImages.size}`);
}

const toUrl = (p: string) => `https://query.libretexts.org/${p.split("/").map(encodeURIComponent).join("/")}`;

function cleanTitle(t: string) {
  return t
    .replace(/^\d+[:：]\s*/, "")
    .replace(/^[\d.]+\s*[:：]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

await main();
