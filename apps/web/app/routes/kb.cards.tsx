import { useMemo, useState } from "react";
import { Link } from "react-router";
import { CARD_SUMMARY, CARD_TAGS, CARDS } from "../features/kb/cards";
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
    title: "方法卡 · 知识库",
    description: "从书中拆出可复用的做法：适用场景、限制、例子与出处，需要时直接调用。",
    path: "/kb/cards",
  });
}

export default function KbCardsPage() {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return CARDS.filter((c) => {
      if (tag && !c.tags.includes(tag)) return false;
      if (!term) return true;
      return [c.title, c.problem, ...c.keywords, ...c.aliases, ...c.scenes].join(" ").toLowerCase().includes(term);
    });
  }, [q, tag]);

  return (
    <div className="mx-auto w-full max-w-[860px] pb-12">
      <Link to="/kb" className="inline-flex items-center gap-1 text-[12.5px] text-ink-4 hover:text-ink-2">
        <IconChevronLeft size={14} />
        知识库
      </Link>
      <header className="mt-3">
        <p className="text-[12px] font-medium tracking-wide text-ink-4">方法卡</p>
        <h1 data-page-title="" className="mt-1.5 text-[28px] font-semibold leading-[1.3] text-ink sm:text-[32px]">
          把书里的好方法拆出来
        </h1>
        <p className="mt-2 text-[13.5px] leading-6 text-ink-3">
          每张卡只解决一个问题：来源可追溯、步骤能照做、写清什么时候不适用。共 {CARDS.length} 张。
        </p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTag(null)}
          className={`h-8 rounded-full border px-3 text-[12.5px] transition-colors ${tag === null ? "border-ink bg-ink text-surface" : "border-line text-ink-3 hover:bg-bg-sunk"}`}
        >
          全部
        </button>
        {CARD_TAGS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(t === tag ? null : t)}
            className={`h-8 rounded-full border px-3 text-[12.5px] transition-colors ${tag === t ? "border-ink bg-ink text-surface" : "border-line text-ink-3 hover:bg-bg-sunk"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <label className="mt-3 flex h-11 items-center gap-2 rounded-control border border-line bg-surface px-3 focus-within:border-line-strong">
        <IconSearch size={16} className="text-ink-4" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="按关键词筛选，如 情绪、记忆、习惯"
          aria-label="筛选方法卡"
          className="h-full w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-4"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} className="text-[12px] text-ink-4 hover:text-ink-2">
            清除
          </button>
        )}
      </label>

      {shown.length === 0 ? (
        <p className="mt-8 text-[13.5px] text-ink-4">没有匹配的方法卡。</p>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {shown.map((c) => (
            <li key={c.slug}>
              <Link
                to={`/kb/cards/${c.slug}`}
                className="group flex h-full flex-col rounded-card border border-line bg-surface px-4 py-3.5 transition-colors hover:border-line-strong hover:bg-bg-sunk"
              >
                <span className="flex flex-wrap gap-1.5 text-[11px] text-ink-4">
                  {c.tags.map((t) => (
                    <span key={t} className="rounded-full border border-line px-1.5 py-[1px]">
                      {t}
                    </span>
                  ))}
                </span>
                <span className="mt-2 text-[15px] font-semibold leading-6 text-ink">{c.title}</span>
                <span className="mt-1 line-clamp-2 text-[12.5px] leading-6 text-ink-3">{c.problem}</span>
                <span className="mt-3 text-[11.5px] text-ink-4">
                  适用于：{c.scenes[0]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 border-t border-line-soft pt-4 text-[11.5px] leading-6 text-ink-4">
        检索自检：用每张卡自带的问句互相检索，{CARD_SUMMARY.passed}/{CARD_SUMMARY.tested} 能排到正确卡片（{CARD_SUMMARY.generatedAt}）。换句话问仍可能漏检，正在改进。
      </p>
    </div>
  );
}
