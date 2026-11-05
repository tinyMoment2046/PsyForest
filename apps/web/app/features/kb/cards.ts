export interface KbCard {
  slug: string;
  title: string;
  tags: string[];
  problem: string;
  method: Array<{ step: string; detail: string }>;
  scenes: string[];
  limits: string[];
  keywords: string[];
  aliases: string[];
  example: { before: string; after: string };
  sources: Array<{ chapter: string; chapterTitle: string; section: string; sectionTitle: string }>;
  book: { id: string; title: string };
  tests: Array<{ question: string; expect: "hit" | "miss"; top?: string; score?: number; passed?: boolean }>;
  generatedAt: string;
  model: string;
}

const files = import.meta.glob("../../data/kb/cards/*.json", { eager: true }) as Record<string, { default: KbCard }>;
import summaryJson from "../../data/kb/cards-summary.json";

export const CARDS: KbCard[] = Object.values(files)
  .map((m) => m.default)
  .sort((a, b) => a.slug.localeCompare(b.slug));

export const CARD_TAGS: string[] = [...new Set(CARDS.flatMap((c) => c.tags))];

export const CARD_SUMMARY = summaryJson as { tested: number; passed: number; accuracy: number; generatedAt: string };

export function cardBySlug(slug: string | undefined): KbCard | null {
  return CARDS.find((c) => c.slug === slug) ?? null;
}

export const sectionHrefFor = (bookId: string, chapter: string, section: string) => `/kb/${bookId}/${chapter}/${section}`;
