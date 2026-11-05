import { useMemo, useState } from "react";
import { Link } from "react-router";
import conceptsJson from "../data/kb/concepts.json";
import { pageMeta } from "../lib/seo";
import { edgeTtl } from "../lib/api.server";
import type { Screen } from "../components/shell/screens";
import { IconChevronLeft, IconSearch } from "../components/icons";

export const handle: Screen = { tab: "me", name: "知识库" };

export function headers() {
  return edgeTtl(3600);
}

export function meta() {
  return pageMeta({
    title: "概念索引 · 知识库",
    description: "把知识库里各章拆解出的概念集中在一起，可按关键词查找。",
    path: "/kb/concepts",
  });
}

const CONCEPTS = (conceptsJson as { concepts: Array<{ name: string; explanation: string; confusion: string; bookId: string; bookTitle: string; chapter: string; chapterTitle: string; href: string }> }).concepts;

export default function KbConceptsPage() {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return CONCEPTS;
    return CONCEPTS.filter((c) => `${c.name} ${c.explanation} ${c.confusion} ${c.chapterTitle}`.toLowerCase().includes(term));
  }, [q]);

  return (
    <div className="mx-auto w-full max-w-[860px] pb-12">
      <Link to="/kb" className="inline-flex items-center gap-1 text-[12.5px] text-ink-4 hover:text-ink-2">
        <IconChevronLeft size={14} />
        全部书籍
      </Link>
      <header className="mt-3">
        <p className="text-[12px] font-medium tracking-wide text-ink-4">概念索引</p>
        <h1 data-page-title="" className="mt-1.5 text-[28px] font-semibold leading-[1.3] text-ink sm:text-[32px]">
          一个概念，一个说法
        </h1>
        <p className="mt-2 text-[13.5px] leading-6 text-ink-3">
          从 {new Set(CONCEPTS.map((c) => c.bookId)).size} 本书的章节拆解里抽出 {CONCEPTS.length} 个概念，按名称排列。点开去读它所在的那一章。
        </p>
      </header>

      <label className="mt-6 flex h-11 items-center gap-2 rounded-control border border-line bg-surface px-3 focus-within:border-line-strong">
        <IconSearch size={16} className="text-ink-4" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜概念、解释或章节"
          aria-label="搜索概念"
          className="h-full w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-4"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} className="text-[12px] text-ink-4 hover:text-ink-2">
            清除
          </button>
        )}
      </label>

      {shown.length === 0 ? (
        <p className="mt-10 text-[13.5px] text-ink-4">没有匹配的概念。</p>
      ) : (
        <ul className="mt-6 divide-y divide-line-soft overflow-hidden rounded-card border border-line bg-surface">
          {shown.map((c) => (
            <li key={`${c.name}-${c.href}`}>
              <Link to={c.href} className="block px-4 py-3.5 transition-colors hover:bg-bg-sunk">
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-[15px] font-semibold text-ink">{c.name}</span>
                  <span className="text-[11.5px] text-ink-4">
                    {c.bookTitle} · 第 {Number(c.chapter)} 章 {c.chapterTitle}
                  </span>
                </span>
                <span className="mt-1 line-clamp-2 block text-[13.5px] leading-6 text-ink-2">{c.explanation}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
