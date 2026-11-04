import libraryJson from "../../data/kb/library.json";

export interface KbSection {
  slug: string;
  title: string;
  file: string;
}

export interface KbChapter {
  slug: string;
  title: string;
  sections: KbSection[];
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
export function neighbours(book: KbBookToc, section: KbSection) {
  const all = book.chapters.flatMap((c) => c.sections.map((s) => ({ chapter: c, section: s })));
  const at = all.findIndex((x) => x.section.slug === section.slug);
  return { prev: at > 0 ? all[at - 1] : null, next: at >= 0 && at < all.length - 1 ? all[at + 1] : null };
}

export const sectionHref = (bookId: string, chapter: KbChapter, section: KbSection) =>
  `/kb/${bookId}/${chapter.slug}/${section.slug}`;
