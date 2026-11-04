// Last-resort source for the few OpenStax resource images the book repo does not hold:
// the Wayback Machine archive of the original resource URL.
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ProxyAgent, fetch as ufetch } from "undici";
import sharp from "sharp";

const OUT = path.resolve("apps/web/app/data/kb/books/psychology-2e/sections");
const ASSETS = path.resolve("apps/web/public/kb");
const agent = new ProxyAgent(process.env.EGRESS_PROXY_URL ?? "http://127.0.0.1:7897");
await mkdir(ASSETS, { recursive: true });

const files = (await readdir(OUT)).filter((f) => f.endsWith(".json"));
const missing = new Map<string, string>();
for (const name of files) {
  const data = JSON.parse(await readFile(path.join(OUT, name), "utf8"));
  for (const m of data.html.matchAll(/src="(https:\/\/openstax\.org\/resources\/[a-f0-9]+)"/g)) missing.set(m[1]!, "");
}

let fixed = 0;
for (const src of missing.keys()) {
  const avail = await ufetch(`https://archive.org/wayback/available?url=${encodeURIComponent(src)}`, { dispatcher: agent as never, signal: AbortSignal.timeout(30_000) });
  const j = (await avail.json()) as { archived_snapshots?: { closest?: { url?: string } } };
  const snapshot = j.archived_snapshots?.closest?.url;
  if (!snapshot) { console.log("no snapshot", src); continue; }
  const direct = snapshot.replace(/^http:/, "https:").replace(/\/web\/(\d+)\//, "/web/$1id_/");
  const res = await ufetch(direct, { dispatcher: agent as never, signal: AbortSignal.timeout(90_000) });
  if (!res.ok) { console.log("snapshot failed", src, res.status); await res.body?.cancel(); continue; }
  const body = Buffer.from(await res.arrayBuffer());
  const sha = src.split("/").pop()!;
  const name = `${sha.slice(0, 16)}.webp`;
  await writeFile(path.join(ASSETS, name), await sharp(body, { failOn: "none" }).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer());
  for (const f of files) {
    const file = path.join(OUT, f);
    const data = JSON.parse(await readFile(file, "utf8"));
    if (!data.html.includes(src)) continue;
    data.html = data.html.split(`src="${src}"`).join(`src="/kb/${name}"`);
    await writeFile(file, JSON.stringify(data), "utf8");
    fixed++;
  }
  console.log("fixed", src, "->", name);
}
console.log({ fixed });
