/** Retrieval for method cards: a small, dependency-free scorer shared by the build script and the page. */

export interface SearchableCard {
  title: string;
  problem: string;
  scenes: string[];
  keywords: string[];
  aliases?: string[];
}

const CJK = /[\u4e00-\u9fff]/;

export function normalize(text: string): string {
  return text.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

export function bigrams(text: string): string[] {
  const out: string[] = [];
  for (const run of text.split(/[^\u4e00-\u9fff]+/)) {
    for (let i = 0; i + 1 < run.length; i++) out.push(run.slice(i, i + 2));
  }
  return out;
}

export function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z0-9-]{1,}/g) ?? []);
}

/** 0–1: how well a card answers a question. Keywords weigh most, then phrase overlap. */
export function score(card: SearchableCard, query: string): number {
  const q = normalize(query);
  if (!q) return 0;
  const haystack = normalize([card.title, card.problem, ...card.scenes, ...card.keywords, ...(card.aliases ?? [])].join(" "));
  const keywordHits = card.keywords.filter((k) => {
    const n = normalize(k);
    return n.length >= 2 && q.includes(n);
  }).length;

  const qb = new Set(bigrams(q));
  const hb = new Set(bigrams(haystack));
  let overlap = 0;
  for (const b of qb) if (hb.has(b)) overlap++;
  const ratio = qb.size ? overlap / qb.size : 0;

  const latin = words(query).filter((w) => haystack.includes(w)).length;

  return Math.min(1, ratio * 0.7 + Math.min(keywordHits, 3) * 0.2 + latin * 0.15);
}

export const HIT_THRESHOLD = 0.2;

export function ranks(cards: SearchableCard[], query: string): Array<{ index: number; score: number }> {
  return cards
    .map((c, index) => ({ index, score: score(c, query) }))
    .sort((a, b) => b.score - a.score);
}

export function isCjk(text: string): boolean {
  return CJK.test(text);
}
