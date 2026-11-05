import { Link, useLoaderData } from "react-router";
import { bookById, bookToc, hasNote, sectionHref } from "../features/kb/data";
import { KbCrumbs, KbFrame } from "../features/kb/KbFrame";
import { pageMeta } from "../lib/seo";
import { edgeTtl } from "../lib/api.server";
import type { Route } from "./+types/kb.book";
import type { Screen } from "../components/shell/screens";
import { IconArrowRight } from "../components/icons";

export const handle: Screen = { tab: "me", name: "知识库" };

export function headers() {
  return edgeTtl(3600);
}

export async function loader({ params }: Route.LoaderArgs) {
  return { book: bookById(params.book), toc: bookToc(params.book) };
}

export function meta({ loaderData, params }: Route.MetaArgs) {
  if (!loaderData?.toc) return pageMeta({ title: "书籍不存在 · 知识库", path: `/kb/${params.book ?? ""}`, noindex: true });
  const { book, toc } = loaderData;
  return pageMeta({
    title: `${toc.book.title} · 知识库`,
    description: `${toc.book.title}：${toc.book.chapters} 章 ${toc.book.sections} 节。${book?.authors ?? toc.book.authors}。`,
    path: `/kb/${params.book}`,
  });
}

export default function KbBookPage() {
  const { book, toc } = useLoaderData<typeof loader>();
  if (!book || !toc) return null;
  const first = toc.chapters[0];

  return (
    <KbFrame bookId={book.id} toc={toc}>
      <KbCrumbs bookId={book.id} toc={toc} />
      <header className="rounded-card border border-line bg-surface px-6 py-8 sm:px-8">
        <p className="text-[12px] text-ink-4">{toc.book.subtitle || "知识库"}</p>
        <h1 data-page-title="" className="mt-2 text-[28px] font-semibold leading-[1.3] tracking-[-0.01em] text-ink sm:text-[32px]">
          {toc.book.title}
        </h1>
        <p className="mt-2 text-[13px] text-ink-3">{toc.book.authors}</p>
        <p className="mt-3 text-[12.5px] text-ink-4">
          {toc.book.chapters} {toc.book.chapterUnit ?? "章"} · {toc.book.sections} 节 · {toc.book.license.name}
        </p>
        {first?.sections[0] && (
          <Link
            to={sectionHref(book.id, first, first.sections[0])}
            className="mt-5 inline-flex h-9 items-center gap-2 rounded-control bg-ink px-4 text-[13.5px] font-medium text-surface transition-opacity hover:opacity-90"
          >
            从第一节开始
            <IconArrowRight size={15} />
          </Link>
        )}
      </header>

      {toc.book.notice ? (
        <aside className="kb-book-notice">
          <p className="kb-guide-voice">怎么读这本书</p>
          <p>{toc.book.notice}</p>
        </aside>
      ) : null}

      {toc.book.concepts?.length ? (
        <section className="mt-9" aria-labelledby="concepts">
          <h2 id="concepts" className="text-[15px] font-semibold text-ink">
            关键概念
          </h2>
          <dl className="kb-concepts">
            {toc.book.concepts.map((c) => (
              <div key={c.term} className="kb-concept">
                <dt>{c.term}</dt>
                <dd>{c.gloss}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="mt-8" aria-labelledby="chapters">
        <h2 id="chapters" className="text-[15px] font-semibold text-ink">
          章节目录
        </h2>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {toc.chapters.map((chapter) => (
            <li key={chapter.slug}>
              <Link
                to={`/kb/${book.id}/${chapter.slug}`}
                className="group flex h-full flex-col rounded-card border border-line bg-surface px-4 py-3.5 transition-colors hover:border-line-strong hover:bg-bg-sunk"
              >
                <span className="flex items-center gap-2">
                  <span className="num text-[11.5px] font-medium tracking-wide text-ink-4">
                    第 {Number(chapter.slug)} {toc.book.chapterUnit ?? "章"}
                  </span>
                  <span className="text-[11.5px] text-ink-4">· {chapter.sections.length} 节</span>
                </span>
                <span className="mt-1 text-[15.5px] font-semibold leading-6 text-ink">{chapter.title}</span>
                <span className="mt-1 line-clamp-2 text-[12.5px] leading-5 text-ink-4">
                  {chapter.sections.slice(0, 4).map((s) => s.title).join(" · ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 border-t border-line-soft pt-4 text-[12px] leading-relaxed text-ink-4">
        {toc.book.source ? <>
          来源：<a href={toc.book.source} target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-2 hover:text-ink-2">原始页面</a>，按{" "}
          <a href={toc.book.license.url} target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-2 hover:text-ink-2">{toc.book.license.name}</a> 许可整理。
        </> : <>{toc.book.license.name}。不提供原书全文或插图。</>}
        内容仅用于学习，不构成诊断或治疗建议。
      </p>
    </KbFrame>
  );
}
