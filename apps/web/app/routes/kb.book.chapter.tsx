import { Link, useLoaderData } from "react-router";
import { bookById, bookToc, chapterBySlug, hasNote, sectionHref } from "../features/kb/data";
import { KbCrumbs, KbFrame } from "../features/kb/KbFrame";
import { pageMeta } from "../lib/seo";
import { edgeTtl } from "../lib/api.server";
import type { Route } from "./+types/kb.book.chapter";
import type { Screen } from "../components/shell/screens";
import { IconArrowRight, IconChevronLeft, IconChevronRight } from "../components/icons";

export const handle: Screen = { tab: "me", name: "知识库" };

export function headers() {
  return edgeTtl(3600);
}

export async function loader({ params }: Route.LoaderArgs) {
  const toc = bookToc(params.book);
  const chapter = toc ? chapterBySlug(toc, params.chapter) : null;
  return { book: bookById(params.book), toc, chapter, note: !!(chapter && hasNote(params.book as string, chapter.slug)) };
}

export function meta({ loaderData, params }: Route.MetaArgs) {
  if (!loaderData?.chapter || !loaderData.toc) {
    return pageMeta({ title: "章节不存在 · 知识库", path: `/kb/${params.book ?? ""}/${params.chapter ?? ""}`, noindex: true });
  }
  const { chapter, toc } = loaderData;
  return pageMeta({
    title: `${chapter.title} · ${toc.book.title}`,
    description: `《${toc.book.title}》第 ${Number(chapter.slug)} ${toc.book.chapterUnit ?? "章"}「${chapter.title}」，共 ${chapter.sections.length} 节。`,
    path: `/kb/${params.book}/${chapter.slug}`,
  });
}

export default function KbChapterPage() {
  const { book, toc, chapter, note } = useLoaderData<typeof loader>();
  if (!book || !toc || !chapter) return null;
  const index = toc.chapters.findIndex((c) => c.slug === chapter.slug);
  const unit = toc.book.chapterUnit ?? "章";
  const prev = index > 0 ? toc.chapters[index - 1] : null;
  const next = index < toc.chapters.length - 1 ? toc.chapters[index + 1] : null;

  return (
    <KbFrame bookId={book.id} toc={toc} active={chapter}>
      <KbCrumbs bookId={book.id} toc={toc} chapter={chapter} />
      <header>
        <p className="num text-[12px] font-medium tracking-wide text-ink-4">
          第 {Number(chapter.slug)} {toc.book.chapterUnit ?? "章"}
        </p>
        <h1 data-page-title="" className="mt-1.5 text-[27px] font-semibold leading-[1.3] tracking-[-0.01em] text-ink sm:text-[30px]">
          {chapter.title}
        </h1>
        {chapter.intro ? (
          <p className="mt-3 max-w-[46ch] text-[14px] leading-7 text-ink-2">{chapter.intro}</p>
        ) : null}
        <p className="mt-3 text-[13px] text-ink-4">{chapter.sections.length} 节 · 建议按顺序阅读</p>
        {note && (
          <Link
            to={`/kb/${book.id}/notes/${chapter.slug}`}
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-control bg-ink px-4 text-[13.5px] font-medium text-surface transition-opacity hover:opacity-90"
          >
            先读本章拆解
            <IconArrowRight size={15} />
          </Link>
        )}
      </header>

      <ol className="mt-7 divide-y divide-line-soft overflow-hidden rounded-card border border-line bg-surface">
        {chapter.sections.map((section, i) => (
          <li key={section.slug}>
            <Link
              to={sectionHref(book.id, chapter, section)}
              className="group flex min-h-[58px] items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-sunk"
            >
              <span className="num w-7 shrink-0 text-[12px] text-ink-4">{String(i).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium leading-6 text-ink">{section.title}</span>
              </span>
              <IconArrowRight size={15} className="shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ol>

      <nav className="mt-8 flex items-stretch justify-between gap-3 border-t border-line-soft pt-5 text-[13px]">
        {prev ? (
          <Link to={`/kb/${book.id}/${prev.slug}`} className="group flex min-w-0 items-center gap-1.5 text-ink-3 hover:text-ink">
            <IconChevronLeft size={15} />
            <span className="truncate">上一{unit} · {prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`/kb/${book.id}/${next.slug}`} className="group flex min-w-0 items-center gap-1.5 text-right text-ink-3 hover:text-ink">
            <span className="truncate">下一{unit} · {next.title}</span>
            <IconChevronRight size={15} />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </KbFrame>
  );
}
