import type { ReactNode } from "react";
import { Link } from "react-router";
import { sectionHref, type KbBookToc, type KbChapter } from "./data";
import { IconBook, IconChevronRight } from "../../components/icons";

/**
 * The book's frame: a Notion-like chapter tree on the left, the reading column in the middle.
 * On phones the tree folds into a "目录" disclosure above the page.
 */
export function KbFrame({
  bookId,
  toc,
  active,
  activeSection,
  children,
}: {
  bookId: string;
  toc: KbBookToc;
  active?: KbChapter | null;
  activeSection?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="pb-12 lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-12">
      <aside className="hidden lg:block">
        <div className="sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto pb-8 pr-2 [scrollbar-width:thin]">
          <Tree bookId={bookId} toc={toc} active={active} activeSection={activeSection} />
        </div>
      </aside>
      <div className="min-w-0">
        <details className="mb-4 rounded-card border border-line bg-surface lg:hidden">
          <summary className="flex min-h-[44px] cursor-pointer items-center gap-2 px-4 text-[14px] font-medium text-ink">
            <IconBook size={17} className="text-ink-4" />
            目录
            {active && <span className="truncate text-ink-4">· {active.title}</span>}
          </summary>
          <div className="max-h-[60dvh] overflow-y-auto border-t border-line-soft px-2 py-2">
            <Tree bookId={bookId} toc={toc} active={active} activeSection={activeSection} />
          </div>
        </details>
        {children}
      </div>
    </div>
  );
}

function Tree({
  bookId,
  toc,
  active,
  activeSection,
}: {
  bookId: string;
  toc: KbBookToc;
  active?: KbChapter | null;
  activeSection?: string | null;
}) {
  return (
    <nav aria-label="知识库目录">
      <Link to="/kb" className="mb-1 flex items-center gap-1.5 rounded-control px-2 py-1 text-[12px] text-ink-4 hover:text-ink-2">
        ← 全部书籍
      </Link>
      <Link to={`/kb/${bookId}`} className="flex items-center gap-2 rounded-control px-2 py-2 text-[15px] font-semibold text-ink hover:bg-bg-sunk">
        <IconBook size={18} className="text-accent" />
        <span className="truncate">{toc.book.title}</span>
      </Link>
      <p className="px-2 pb-2 pt-1 text-[12px] text-ink-4">
        {toc.book.chapters} 章 · {toc.book.sections} 节
      </p>
      <ul className="mt-1 space-y-0.5">
        {toc.chapters.map((chapter) => {
          const isActive = active?.slug === chapter.slug;
          return (
            <li key={chapter.slug}>
              <Link
                to={`/kb/${bookId}/${chapter.slug}`}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-start gap-1.5 rounded-control px-2 py-1.5 text-[13.5px] leading-5 transition-colors ${
                  isActive ? "bg-accent-soft font-medium text-ink" : "text-ink-2 hover:bg-bg-sunk"
                }`}
              >
                <span className="num w-[1.4em] shrink-0 pt-[1px] text-right text-[11px] text-ink-4">{chapter.slug}</span>
                <span className="min-w-0">{chapter.title}</span>
              </Link>
              {isActive && chapter.sections.length > 0 && (
                <ul className="mb-2 ml-6 mt-0.5 space-y-0.5 border-l border-line-soft pl-2">
                  {chapter.sections.map((section) => {
                    const current = activeSection === section.slug;
                    return (
                      <li key={section.slug}>
                        <Link
                          to={sectionHref(bookId, chapter, section)}
                          aria-current={current ? "page" : undefined}
                          className={`block rounded-control px-2 py-1 text-[13px] leading-5 transition-colors ${
                            current ? "bg-bg-sunk font-medium text-ink" : "text-ink-3 hover:bg-bg-sunk hover:text-ink-2"
                          }`}
                        >
                          {section.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-6 border-t border-line-soft px-2 pt-3 text-[11.5px] leading-relaxed text-ink-4">
        <p>
          来源：
          <a href={toc.book.source} target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-2 hover:text-ink-2">
            原始页面
          </a>
          ·{" "}
          <a href={toc.book.license.url} target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-2 hover:text-ink-2">
            {toc.book.license.name}
          </a>
        </p>
        <p className="mt-1">{toc.book.authors}</p>
      </div>
    </nav>
  );
}

/** Breadcrumb shown above a page inside the book. */
export function KbCrumbs({
  bookId,
  toc,
  chapter,
  section,
}: {
  bookId: string;
  toc: KbBookToc;
  chapter?: KbChapter | null;
  section?: { title: string } | null;
}) {
  return (
    <nav aria-label="面包屑" className="mb-5 flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-4">
      <Link to="/kb" className="hover:text-ink-2">
        知识库
      </Link>
      <IconChevronRight size={12} />
      <Link to={`/kb/${bookId}`} className="hover:text-ink-2">
        {toc.book.title}
      </Link>
      {chapter && (
        <>
          <IconChevronRight size={12} />
          <Link to={`/kb/${bookId}/${chapter.slug}`} className="hover:text-ink-2">
            {chapter.title}
          </Link>
        </>
      )}
      {section && (
        <>
          <IconChevronRight size={12} />
          <span className="text-ink-3">{section.title}</span>
        </>
      )}
    </nav>
  );
}
