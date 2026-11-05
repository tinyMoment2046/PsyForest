import { Link } from "react-router";
import { GUIDE_TAGS, GUIDES } from "../features/kb/guides";
import { pageMeta } from "../lib/seo";
import { edgeTtl } from "../lib/api.server";
import type { Screen } from "../components/shell/screens";
import { IconArrowRight, IconChevronLeft } from "../components/icons";

export const handle: Screen = { tab: "me", name: "知识库" };

export function headers() {
  return edgeTtl(3600);
}

export function meta() {
  return pageMeta({
    title: "读者问题 · 知识库",
    description: `从「${GUIDES[0]?.question ?? ""}」这类真实困惑出发，按问题找到解释、可以试的做法和什么时候该求助。`,
    path: "/kb/guides",
  });
}

export default function KbGuidesPage() {
  return (
    <div className="mx-auto w-full max-w-[860px] pb-12">
      <Link to="/kb" className="inline-flex items-center gap-1 text-[12.5px] text-ink-4 hover:text-ink-2">
        <IconChevronLeft size={14} />
        知识库
      </Link>
      <header className="mt-3">
        <p className="text-[12px] font-medium tracking-wide text-ink-4">读者问题</p>
        <h1 data-page-title="" className="mt-1.5 text-[28px] font-semibold leading-[1.3] text-ink sm:text-[32px]">
          你现在遇到的事
        </h1>
        <p className="mt-2 text-[13.5px] leading-6 text-ink-3">
          不按书本章节排，按你脑子里的那句话排。每篇 3–5 分钟：发生了什么、可以怎么做、什么时候该找专业帮助。
        </p>
      </header>

      {GUIDE_TAGS.map((tag) => (
        <section key={tag} className="mt-8">
          <h2 className="text-[14px] font-semibold text-ink">{tag}</h2>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {GUIDES.filter((g) => g.tags.includes(tag)).map((g) => (
              <li key={g.slug}>
                <Link
                  to={`/kb/guides/${g.slug}`}
                  className="group flex h-full flex-col rounded-card border border-line bg-surface px-4 py-3.5 transition-colors hover:border-line-strong hover:bg-bg-sunk"
                >
                  <span className="text-[15px] font-semibold leading-6 text-ink">{g.question}</span>
                  <span className="mt-1 line-clamp-2 text-[12.5px] leading-6 text-ink-3">{g.deck}</span>
                  <span className="mt-3 flex items-center gap-1 text-[11.5px] text-ink-4">
                    {g.readMinutes} 分钟
                    <IconArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
