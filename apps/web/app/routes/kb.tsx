import { Link } from "react-router";
import { LIBRARY } from "../features/kb/data";
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
          慢慢读完几本书
        </h1>
        <p className="mt-4 max-w-[62ch] text-[14.5px] leading-7 text-ink-2">
          这里放导入的心理学书籍与长文：保留原来的章节结构，按节阅读，图片与表格都在本地。以后新增的书会出现在下面。
        </p>
        <p className="mt-5 text-[12.5px] text-ink-4">
          {LIBRARY.books.length} 本 · {total} 节
        </p>
      </header>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
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
        每本书保留原作者、原始来源与许可；仅收录允许转载的内容。内容用于学习，不构成诊断或治疗建议。
      </p>
    </div>
  );
}
