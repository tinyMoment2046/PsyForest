import { Link } from "react-router";
import { LIBRARY } from "../features/kb/data";
import { GUIDES } from "../features/kb/guides";
import { CARDS } from "../features/kb/cards";
import { pageMeta, siteUrl } from "../lib/seo";
import { edgeTtl } from "../lib/api.server";
import type { Screen } from "../components/shell/screens";
import { IconArrowRight, IconBook } from "../components/icons";

export const handle: Screen = { tab: "me", name: "知识库" };

export function headers() {
  return edgeTtl(3600);
}

export function meta() {
  const base = siteUrl();
  const total = LIBRARY.books.reduce((n, b) => n + b.sections, 0);
  return pageMeta({
    title: "知识库 · 心理学书籍与专题",
    description: `收录 ${LIBRARY.books.length} 本心理学书籍，共 ${total} 节，按章节阅读。`,
    path: "/kb",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": `${base}/kb#collection`,
        url: `${base}/kb`,
        name: "知识库",
        inLanguage: "zh-CN",
        isPartOf: { "@id": `${base}/#website` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: LIBRARY.books.length,
          itemListElement: LIBRARY.books.map((b, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: b.title,
            url: `${base}/kb/${b.id}`,
          })),
        },
      },
    ],
  });
}

const KIND_LABEL: Record<string, string> = { textbook: "教材", book: "书籍", article: "长文", collection: "合集" };

export default function KbIndex() {
  const total = LIBRARY.books.reduce((n, b) => n + b.sections, 0);

  return (
    <div className="mx-auto w-full max-w-[920px] pb-12">
      <header className="rounded-card border border-line bg-surface px-6 py-8 sm:px-9 sm:py-10">
        <p className="flex items-center gap-1.5 text-[12px] font-medium tracking-wide text-ink-4">
          <IconBook size={14} />
          知识库
        </p>
        <h1 data-page-title="" className="mt-3 text-[30px] font-semibold leading-[1.25] tracking-[-0.01em] text-ink sm:text-[34px]">
          先说你遇到的事
        </h1>
        <p className="mt-4 max-w-[62ch] text-[14.5px] leading-7 text-ink-2">
          从心理学教材到原创导读，按主题与章节慢慢读。转载内容注明来源与许可；受版权保护的书籍只刊载独立撰写的学习笔记。
        </p>
        <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-4">
          <span>
            {LIBRARY.books.length} 本 · {total} 节
          </span>
          <Link to="/kb/concepts" className="text-accent underline decoration-accent/30 underline-offset-3 hover:decoration-accent">
            概念索引
          </Link>
        </p>
      </header>

      <section className="mt-9" aria-labelledby="reader-questions">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="reader-questions" className="text-[15px] font-semibold text-ink">
            按你现在遇到的事
          </h2>
          <Link to="/kb/guides" className="text-[12.5px] text-accent underline decoration-accent/30 underline-offset-3 hover:decoration-accent">
            全部 {GUIDES.length} 个问题
          </Link>
        </div>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {GUIDES.slice(0, 6).map((g) => (
            <li key={g.slug}>
              <Link
                to={`/kb/guides/${g.slug}`}
                className="group flex h-full items-start gap-3 rounded-card border border-line bg-surface px-4 py-3.5 transition-colors hover:border-line-strong hover:bg-bg-sunk"
              >
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent" />
                <span className="min-w-0">
                  <span className="block text-[14.5px] font-medium leading-6 text-ink">{g.question}</span>
                  <span className="mt-0.5 block text-[11.5px] text-ink-4">
                    {g.tags[0]} · {g.readMinutes} 分钟
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="specials">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="specials" className="text-[15px] font-semibold text-ink">
            图解专题
          </h2>
          <span className="text-[12px] text-ink-4">可点击、可切换的阅读页</span>
        </div>
        <a
          href="/kb/specials/stress.html"
          target="_blank"
          rel="noopener"
          className="group mt-3 flex flex-col rounded-card border border-line bg-surface px-5 py-4 transition-colors hover:border-line-strong hover:bg-bg-sunk"
        >
          <span className="text-[11.5px] text-ink-4">第 14 章 · 压力</span>
          <span className="mt-1 text-[16px] font-semibold text-ink">压力：身体怎样被拖垮，又怎样恢复</span>
          <span className="mt-1 line-clamp-2 text-[12.5px] leading-6 text-ink-3">
            因果链、三个阶段、应对方式对比，点开每一环看解释，右上角可切换主题与出处。
          </span>
          <span className="mt-3 text-[12.5px] font-medium text-accent">打开图解 ↗</span>
        </a>
      </section>

      <section className="mt-10" aria-labelledby="cards">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="cards" className="text-[15px] font-semibold text-ink">
            方法卡
          </h2>
          <Link to="/kb/cards" className="text-[12.5px] text-accent underline decoration-accent/30 underline-offset-3 hover:decoration-accent">
            全部 {CARDS.length} 张
          </Link>
        </div>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {CARDS.slice(0, 4).map((c) => (
            <li key={c.slug}>
              <Link
                to={`/kb/cards/${c.slug}`}
                className="group flex h-full items-start gap-3 rounded-card border border-line bg-surface px-4 py-3.5 transition-colors hover:border-line-strong hover:bg-bg-sunk"
              >
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-ink-4" />
                <span className="min-w-0">
                  <span className="block text-[14.5px] font-medium leading-6 text-ink">{c.title}</span>
                  <span className="mt-0.5 block text-[11.5px] text-ink-4">{c.tags[0]} · 有出处的方法</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="books">
        <h2 id="books" className="text-[15px] font-semibold text-ink">
          书
        </h2>
      </section>

      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {LIBRARY.books.map((book) => (
          <li key={book.id}>
            <Link
              to={`/kb/${book.id}`}
              className="group flex h-full flex-col rounded-card border border-line bg-surface px-5 py-4 transition-colors hover:border-line-strong hover:bg-bg-sunk"
            >
              <span className="flex items-center gap-2 text-[11.5px] text-ink-4">
                <span className="rounded-full border border-line px-2 py-[1px]">{KIND_LABEL[book.kind] ?? "书籍"}</span>
                <span>
                  {book.chapters} 章 · {book.sections} 节
                </span>
              </span>
              <span className="mt-2 text-[17px] font-semibold leading-6 text-ink">{book.title}</span>
              <span className="mt-1 text-[12.5px] text-ink-3">{book.subtitle}</span>
              <span className="mt-2 line-clamp-1 text-[12px] text-ink-4">{book.authors}</span>
              <span className="mt-4 flex items-center gap-1 text-[12.5px] font-medium text-accent">
                开始阅读
                <IconArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 border-t border-line-soft pt-4 text-[12px] leading-relaxed text-ink-4">
        教材标注来源与许可；原创导读不提供受版权保护作品的全文。内容用于学习，不构成诊断或治疗建议。
      </p>
    </div>
  );
}
