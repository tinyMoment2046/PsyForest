import { Link, useLoaderData } from "react-router";
import {
  bookById, bookToc, chapterBySlug, loadSection, neighbours, sectionBySlug, sectionHref,
} from "../features/kb/data";
import { KbCrumbs, KbFrame } from "../features/kb/KbFrame";
import { GuideCard } from "../features/kb/GuideCard";
import { pageMeta } from "../lib/seo";
import { edgeTtl } from "../lib/api.server";
import type { Route } from "./+types/kb.book.chapter.section";
import type { Screen } from "../components/shell/screens";
import { IconChevronLeft, IconChevronRight } from "../components/icons";

export const handle: Screen = { tab: "me", name: "知识库" };

export function headers() {
  return edgeTtl(3600);
}

export async function loader({ params }: Route.LoaderArgs) {
  const toc = bookToc(params.book);
  if (!toc) return { book: bookById(params.book), toc: null, chapter: null, section: null, content: null, prev: null, next: null };
  const chapter = chapterBySlug(toc, params.chapter);
  if (!chapter) return { book: bookById(params.book), toc, chapter: null, section: null, content: null, prev: null, next: null };
  const section = sectionBySlug(chapter, params.section);
  if (!section) return { book: bookById(params.book), toc, chapter, section: null, content: null, prev: null, next: null };
  const [content, links] = await Promise.all([loadSection(toc ? (params.book as string) : "", section.file), Promise.resolve(neighbours(toc, chapter, section))]);
  return { book: bookById(params.book), toc, chapter, section, content, ...links };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData?.toc || !loaderData.chapter || !loaderData.section) {
    return pageMeta({ title: "章节不存在 · 知识库", path: "/kb", noindex: true });
  }
  return pageMeta({
    title: `${loaderData.section.title} · ${loaderData.chapter.title} · ${loaderData.toc.book.title}`,
    description: `《${loaderData.toc.book.title}》${loaderData.chapter.title}·${loaderData.section.title}。按章节逐节阅读。`,
    path: `/kb/${loaderData.book?.id}/${loaderData.chapter.slug}/${loaderData.section.slug}`,
  });
}

export default function KbSectionPage() {
  const { book, toc, chapter, section, content, prev, next } = useLoaderData<typeof loader>();
  if (!book || !toc || !chapter || !section) {
    return (
      <div className="py-10 text-[14px] text-ink-3">
        这一节不存在，回到 <Link to="/kb" className="text-accent underline">知识库目录</Link>。
      </div>
    );
  }
  const chapterIndex = toc.chapters.findIndex((c) => c.slug === chapter.slug);
  const unit = toc.book.chapterUnit ?? "章";

  return (
    <KbFrame bookId={book.id} toc={toc} active={chapter} activeSection={section.slug}>
      <KbCrumbs bookId={book.id} toc={toc} chapter={chapter} section={section} />
      <article>
        {content?.guide ? (
          <GuideCard
            guide={content.guide}
            title={section.title}
            chapter={chapter.title}
            chapterIndex={chapterIndex}
            chapters={toc.chapters.length}
            unit={unit}
          />
        ) : (
          <>
            <header className="mb-6">
              <p className="text-[12px] font-medium tracking-wide text-ink-4">
                第 {Number(chapter.slug)} {unit} · {chapter.title}
              </p>
              <h1 data-page-title="" className="mt-2 text-[28px] font-semibold leading-[1.3] tracking-[-0.01em] text-ink sm:text-[32px]">
                {section.title}
              </h1>
            </header>
            <div className="kb-prose" dangerouslySetInnerHTML={{ __html: content?.html ?? "" }} />
          </>
        )}
      </article>

      <nav className="mt-12 grid gap-2 border-t border-line-soft pt-5 sm:grid-cols-2">
        {prev ? (
          <Link
            to={sectionHref(book.id, prev.chapter, prev.section)}
            className="group rounded-card border border-line bg-surface px-4 py-3 transition-colors hover:border-line-strong hover:bg-bg-sunk"
          >
            <span className="flex items-center gap-1 text-[11.5px] text-ink-4">
              <IconChevronLeft size={13} /> 上一节 · {prev.chapter.title}
            </span>
            <span className="mt-0.5 block text-[14px] font-medium text-ink">{prev.section.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to={sectionHref(book.id, next.chapter, next.section)}
            className="group rounded-card border border-line bg-surface px-4 py-3 text-right transition-colors hover:border-line-strong hover:bg-bg-sunk"
          >
            <span className="flex items-center justify-end gap-1 text-[11.5px] text-ink-4">
              下一节 · {next.chapter.title} <IconChevronRight size={13} />
            </span>
            <span className="mt-0.5 block text-[14px] font-medium text-ink">{next.section.title}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <p className="mt-8 text-[11.5px] leading-relaxed text-ink-4">
        {toc.book.source ? <>
          本页整理自 <a href={toc.book.source} target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-2 hover:text-ink-2">{toc.book.title}</a>
          （{toc.book.authors}），{toc.book.license.name} 许可。
        </> : <>{toc.book.license.name}。围绕原书主题独立撰写，不含原书正文。</>}
        仅供学习，不构成诊断或治疗建议。
      </p>
    </KbFrame>
  );
}
