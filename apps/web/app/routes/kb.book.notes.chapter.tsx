import { Link, useLoaderData } from "react-router";
import { bookById, bookToc, chapterBySlug, loadNote, sectionHref } from "../features/kb/data";
import { KbCrumbs, KbFrame } from "../features/kb/KbFrame";
import { pageMeta } from "../lib/seo";
import { edgeTtl } from "../lib/api.server";
import type { Route } from "./+types/kb.book.notes.chapter";
import type { Screen } from "../components/shell/screens";
import { IconArrowRight, IconChevronLeft } from "../components/icons";

export const handle: Screen = { tab: "me", name: "知识库" };

export function headers() {
  return edgeTtl(3600);
}

export async function loader({ params }: Route.LoaderArgs) {
  const toc = bookToc(params.book);
  const chapter = toc ? chapterBySlug(toc, params.chapter) : null;
  const note = chapter ? await loadNote(params.book as string, chapter.slug) : null;
  return { book: bookById(params.book), toc, chapter, note };
}

export function meta({ loaderData, params }: Route.MetaArgs) {
  if (!loaderData?.note || !loaderData.chapter) {
    return pageMeta({ title: "章节拆解不存在 · 知识库", path: `/kb/${params.book ?? ""}`, noindex: true });
  }
  return pageMeta({
    title: `${loaderData.chapter.title} · 章节拆解`,
    description: loaderData.note.note.oneLine,
    path: `/kb/${params.book}/notes/${loaderData.chapter.slug}`,
  });
}

export default function KbNotePage() {
  const { book, toc, chapter, note } = useLoaderData<typeof loader>();
  if (!book || !toc || !chapter || !note) return null;
  const n = note.note;

  return (
    <KbFrame bookId={book.id} toc={toc} active={chapter}>
      <KbCrumbs bookId={book.id} toc={toc} chapter={chapter} />
      <article className="kb-prose">
        <header>
          <p className="text-[12px] font-medium tracking-wide text-ink-4">章节拆解 · 第 {Number(chapter.slug)} 章</p>
          <h1 data-page-title="" className="mt-2 text-[28px] font-semibold leading-[1.3] tracking-[-0.01em] text-ink sm:text-[32px]">
            {chapter.title}
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-ink-2">{n.oneLine}</p>
        </header>

        <section className="kb-callout" data-kind="overview">
          <p className="kb-callout-title">这一章在讲什么</p>
          <p>{n.overview}</p>
        </section>

        <h2>关键概念</h2>
        <div className="not-prose space-y-3">
          {n.concepts.map((c) => (
            <div key={c.name} className="rounded-card border border-line bg-surface px-4 py-3.5">
              <p className="text-[15px] font-semibold text-ink">{c.name}</p>
              <p className="mt-1 text-[14px] leading-7 text-ink-2">{c.explanation}</p>
              <p className="mt-2 text-[13px] leading-6 text-ink-3"><span className="text-ink-4">容易混淆：</span>{c.confusion}</p>
            </div>
          ))}
        </div>

        <h2>它是怎么发生的</h2>
        <ol className="not-prose space-y-3">
          {n.mechanism.map((m, i) => (
            <li key={m.step} className="flex gap-3">
              <span className="num mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-line text-[11.5px] text-ink-4">{i + 1}</span>
              <div>
                <p className="text-[14.5px] font-medium text-ink">{m.step}</p>
                <p className="mt-0.5 text-[14px] leading-7 text-ink-2">{m.detail}</p>
              </div>
            </li>
          ))}
        </ol>

        <h2>放到生活里</h2>
        <div className="not-prose space-y-3">
          {n.examples.map((e) => (
            <div key={e.scene} className="rounded-card border border-line-soft bg-bg-muted px-4 py-3">
              <p className="text-[14px] font-medium text-ink">{e.scene}</p>
              <p className="mt-1 text-[13.5px] leading-7 text-ink-2">{e.reading}</p>
            </div>
          ))}
        </div>

        <h2>常见误区</h2>
        <div className="not-prose space-y-3">
          {n.misconceptions.map((m) => (
            <div key={m.claim} className="rounded-card border border-line px-4 py-3">
              <p className="text-[13.5px] text-ink-3">“{m.claim}”</p>
              <p className="mt-1.5 text-[14px] leading-7 text-ink">{m.correction}</p>
            </div>
          ))}
        </div>

        <h2>可以试试</h2>
        <ul className="not-prose space-y-3">
          {n.practice.map((p) => (
            <li key={p.action} className="rounded-card border border-line-soft px-4 py-3">
              <p className="text-[14px] font-medium text-ink">{p.action}</p>
              <p className="mt-1 text-[12.5px] leading-6 text-ink-4">边界：{p.boundary}</p>
            </li>
          ))}
        </ul>

        <h2>自测</h2>
        <div className="not-prose space-y-2">
          {n.quiz.map((q, i) => (
            <details key={q.question} className="group rounded-card border border-line px-4 py-3">
              <summary className="flex cursor-pointer items-start gap-2 text-[14px] font-medium text-ink">
                <span className="num text-[11.5px] text-ink-4">{i + 1}.</span>
                {q.question}
              </summary>
              <p className="mt-2 text-[13.5px] leading-7 text-ink-2">{q.answer}</p>
            </details>
          ))}
        </div>

        <h2>回到原文</h2>
        <ul className="not-prose flex flex-wrap gap-2">
          {note.source.map((s) => {
            const section = chapter.sections.find((x) => x.slug === s.slug);
            return section ? (
              <li key={s.slug}>
                <Link to={sectionHref(book.id, chapter, section)} className="inline-flex rounded-control border border-line px-3 py-1.5 text-[12.5px] text-ink-2 hover:bg-bg-sunk">
                  {s.title}
                </Link>
              </li>
            ) : null;
          })}
        </ul>

        <p className="mt-8 border-t border-line-soft pt-4 text-[12px] leading-relaxed text-ink-4">
          {n.takeaway}
        </p>
        <p className="mt-2 text-[11.5px] text-ink-4">
          本文由模型依据《{toc.book.title}》第 {Number(chapter.slug)} 章正文整理（{note.generatedAt}，{note.model}），只做阅读辅助，事实以原文为准。
        </p>
      </article>

      <nav className="mt-10 flex items-center justify-between gap-3 border-t border-line-soft pt-5 text-[13px]">
        <Link to={`/kb/${book.id}/${chapter.slug}`} className="flex items-center gap-1.5 text-ink-3 hover:text-ink">
          <IconChevronLeft size={15} />
          返回本章原文
        </Link>
        <Link to={`/kb/${book.id}/${chapter.slug}/${chapter.sections[0]?.slug ?? ""}`} className="flex items-center gap-1.5 text-ink-3 hover:text-ink">
          从第一节读起
          <IconArrowRight size={15} />
        </Link>
      </nav>
    </KbFrame>
  );
}
