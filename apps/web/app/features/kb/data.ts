import libraryJson from "../../data/kb/library.json";
import type { KbGuide } from "./GuideCard";

export type { KbGuide };

export interface KbSection {
  slug: string;
  title: string;
  file: string;
}

export interface KbChapter {
  slug: string;
  title: string;
  sections: KbSection[];
  /** One sentence opening the chapter, shown above its section list. */
  intro?: string;
}

export interface KbBookToc {
  book: {
    title: string;
    subtitle: string;
    source: string;
    sourceContent: string;
    authors: string;
    license: { name: string; url: string };
    importedAt: string;
    chapters: number;
    sections: number;
    /** What this book calls its top-level parts, e.g. 夜 for a guide built around five nights. */
    chapterUnit?: string;
    /** A note shown once on the book page: provenance and reading limits. */
    notice?: string;
    /** Key terms the book turns on, with a one-line gloss. */
    concepts?: Array<{ term: string; gloss: string }>;
  };
  chapters: KbChapter[];
}

export interface KbLibraryEntry {
  id: string;
  title: string;
  subtitle: string;
  authors: string;
  kind: "textbook" | "book" | "article" | "collection";
  license: { name: string; url: string };
  source: string;
  sourceContent?: string;
  importedAt: string;
  chapters: number;
  sections: number;
}

export interface KbLibrary {
  books: KbLibraryEntry[];
}

export interface KbSectionFile {
  title: string;
  chapter: string;
  html: string;
  /** Present on hand-written guide cards: rendered as voices instead of prose. */
  guide?: KbGuide;
}

export const LIBRARY = libraryJson as KbLibrary;

const tocFiles = import.meta.glob("../../data/kb/books/*/toc.json", { eager: true }) as Record<
  string,
  { default: KbBookToc }
>;

const sectionFiles = import.meta.glob("../../data/kb/books/*/sections/*.json") as Record<
  string,
  () => Promise<{ default: KbSectionFile }>
>;

export interface KbNote {
  chapter: string;
  title: string;
  generatedAt: string;
  model: string;
  source: Array<{ slug: string; title: string }>;
  note: {
    oneLine: string;
    overview: string;
    concepts: Array<{ name: string; explanation: string; confusion: string }>;
    mechanism: Array<{ step: string; detail: string }>;
    examples: Array<{ scene: string; reading: string }>;
    misconceptions: Array<{ claim: string; correction: string }>;
    practice: Array<{ action: string; boundary: string }>;
    quiz: Array<{ question: string; answer: string }>;
    takeaway: string;
  };
}

const noteFiles = import.meta.glob("../../data/kb/books/*/notes/*.json", { eager: true }) as Record<
  string,
  { default: KbNote }
>;

const noteKey = (bookId: string, chapter: string) => `../../data/kb/books/${bookId}/notes/${chapter}.json`;

export async function loadNote(bookId: string, chapter: string): Promise<KbNote | null> {
  return noteFiles[noteKey(bookId, chapter)]?.default ?? null;
}

export function hasNote(bookId: string, chapter: string): boolean {
  return noteKey(bookId, chapter) in noteFiles;
}

/** The book's contents; null when the library lists it but its files are missing. */
export function bookToc(id: string | undefined): KbBookToc | null {
  if (!id) return null;
  return tocFiles[`../../data/kb/books/${id}/toc.json`]?.default ?? null;
}

export function bookById(id: string | undefined): KbLibraryEntry | null {
  return LIBRARY.books.find((b) => b.id === id) ?? null;
}

export function chapterBySlug(book: KbBookToc, slug: string | undefined): KbChapter | null {
  return book.chapters.find((c) => c.slug === slug) ?? null;
}

export function sectionBySlug(chapter: KbChapter, slug: string | undefined): KbSection | null {
  return chapter.sections.find((s) => s.slug === slug) ?? null;
}

export async function loadSection(bookId: string, file: string): Promise<KbSectionFile | null> {
  const importer = sectionFiles[`../../data/kb/books/${bookId}/sections/${file}.json`];
  if (!importer) return null;
  return (await importer()).default;
}

/** The previous and next section in reading order, across chapter boundaries. */
export function neighbours(book: KbBookToc, chapter: KbChapter, section: KbSection) {
  const all = book.chapters.flatMap((c) => c.sections.map((s) => ({ chapter: c, section: s })));
  const at = all.findIndex((x) => x.chapter.slug === chapter.slug && x.section.slug === section.slug);
  return { prev: at > 0 ? all[at - 1] : null, next: at >= 0 && at < all.length - 1 ? all[at + 1] : null };
}

export const sectionHref = (bookId: string, chapter: KbChapter, section: KbSection) =>
  `/kb/${bookId}/${chapter.slug}/${section.slug}`;
