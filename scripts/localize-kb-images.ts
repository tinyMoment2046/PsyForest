// Localizes every image the knowledge base references:
//  - socialsci.libretexts.org / query.libretexts.org images are downloaded through EGRESS_PROXY_URL;
//  - openstax.org/resources/<sha1> images come from the openstax/osbooks-psychology repository,
//    where the resource id is the file's own SHA-1.
// Converted to WebP under apps/web/public/kb/ and the section JSON is rewritten to /kb/<name>.webp.
// Run: node scripts/localize-kb-images.ts [--repo /tmp/osbooks-psychology]
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { ProxyAgent, fetch as ufetch } from "undici";
import sharp from "sharp";

const OUT = path.resolve(import.meta.dirname, "../apps/web/app/data/kb/books/psychology-2e/sections");
const ASSETS = path.resolve(import.meta.dirname, "../apps/web/public/kb");
const repoArg = process.argv.indexOf("--repo");
const REPO = repoArg > 0 ? process.argv[repoArg + 1]! : "/tmp/osbooks-psychology";
const agent = process.env.EGRESS_PROXY_URL ? new ProxyAgent(process.env.EGRESS_PROXY_URL) : undefined;
const CONCURRENCY = 12;

await mkdir(ASSETS, { recursive: true });

const files = (await readdir(OUT)).filter((f) => f.endsWith(".json"));
const sections = new Map<string, { title: string; chapter: string; html: string }>();
const wanted = new Map<string, string>(); // remote src -> local path
for (const name of files) {
  const data = JSON.parse(await readFile(path.join(OUT, name), "utf8")) as { title: string; chapter: string; html: string };
  sections.set(name, data);
  for (const m of data.html.matchAll(/src="(https?:\/\/[^"]+)"/g)) wanted.set(m[1]!, "");
}

/** openstax resource sha1 -> file path in the book repository */
const bySha = new Map<string, string>();
for (const dir of ["media"]) {
  const base = path.join(REPO, dir);
  if (!existsSync(base)) continue;
  for (const name of await readdir(base)) {
    const file = path.join(base, name);
    if (!(await stat(file)).isFile()) continue;
    const sha = createHash("sha1").update(await readFile(file)).digest("hex");
    bySha.set(sha, file);
  }
}

const queue = [...wanted.keys()];
let done = 0;
const failed: string[] = [];

async function store(bytes: Buffer, key: string) {
  const out = await sharp(bytes, { failOn: "none" }).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  const name = `${key}.webp`;
  await writeFile(path.join(ASSETS, name), out);
  return `/kb/${name}`;
}

async function one(src: string) {
  try {
    const u = new URL(src);
    if (u.hostname === "openstax.org" && u.pathname.startsWith("/resources/")) {
      const sha = u.pathname.split("/").pop()!;
      const file = bySha.get(sha);
      if (!file) throw new Error("not in repo");
      wanted.set(src, await store(await readFile(file), sha.slice(0, 16)));
      return;
    }
    let last: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await ufetch(src, { dispatcher: agent as never, headers: { accept: "image/*" }, signal: AbortSignal.timeout(25_000) });
        if (!res.ok) { await res.body?.cancel(); throw new Error(String(res.status)); }
        const body = Buffer.from(await res.arrayBuffer());
        const key = createHash("sha1").update(body).digest("hex").slice(0, 16);
        wanted.set(src, await store(body, key));
        return;
      } catch (error) {
        last = error;
      }
    }
    throw last;
  } catch (error) {
    failed.push(`${src} (${String((error as Error)?.message ?? error).slice(0, 60)})`);
  } finally {
    done++;
  }
}

async function worker() {
  for (;;) {
    const src = queue.shift();
    if (!src) return;
    await one(src);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

let rewritten = 0;
for (const [name, data] of sections) {
  const html = data.html.replace(/src="(https?:\/\/[^"]+)"/g, (all, src: string) => {
    const local = wanted.get(src);
    return local ? `src="${local}"` : all;
  });
  if (html !== data.html) {
    await writeFile(path.join(OUT, name), JSON.stringify({ ...data, html }), "utf8");
    rewritten++;
  }
}

const local = [...wanted.values()].filter(Boolean).length;
console.log(JSON.stringify({ images: wanted.size, localized: local, failed: failed.length, rewritten, samples: failed.slice(0, 5) }, null, 1));
