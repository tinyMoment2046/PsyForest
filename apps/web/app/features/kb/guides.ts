export interface KbGuide {
  slug: string;
  question: string;
  tags: string[];
  deck: string;
  readMinutes: number;
  sections: Array<{ heading: string; body: string }>;
  actions: Array<{ title: string; how: string; why: string }>;
  myths: Array<{ claim: string; correction: string }>;
  help: { signs: string[]; note: string };
  sources: string[];
  book: { id: string; title: string };
  generatedAt: string;
  model: string;
}

const files = import.meta.glob("../../data/kb/guides/*.json", { eager: true }) as Record<string, { default: KbGuide }>;

export const GUIDES: KbGuide[] = Object.values(files)
  .map((m) => m.default)
  .sort((a, b) => a.tags.join().localeCompare(b.tags.join()) || a.slug.localeCompare(b.slug));

export const GUIDE_TAGS: string[] = [...new Set(GUIDES.flatMap((g) => g.tags))];

export function guideBySlug(slug: string | undefined): KbGuide | null {
  return GUIDES.find((g) => g.slug === slug) ?? null;
}
