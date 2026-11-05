import { Link, useLoaderData } from "react-router";
import { cardBySlug, sectionHrefFor } from "../features/kb/cards";
import { pageMeta } from "../lib/seo";
import { edgeTtl } from "../lib/api.server";
import type { Route } from "./+types/kb.card";
import type { Screen } from "../components/shell/screens";
import { IconChevronLeft } from "../components/icons";

export const handle: Screen = { tab: "me", name: "知识库" };

export function headers() {
  return edgeTtl(3600);
}

export async function loader({ params }: Route.LoaderArgs) {
  return { card: cardBySlug(params.slug) };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData?.card) return pageMeta({ title: "方法卡不存在 · 知识库", path: "/kb/cards", noindex: true });
  return pageMeta({
    title: `${loaderData.card.title} · 方法卡`,
    description: loaderData.card.problem,
    path: `/kb/cards/${loaderData.card.slug}`,
  });
}

export default function KbCardPage() {
  const { card } = useLoaderData<typeof loader>();
  if (!card) return null;

  return (
    <div className="mx-auto w-full max-w-[760px] pb-12">
      <Link to="/kb/cards" className="inline-flex items-center gap-1 text-[12.5px] text-ink-4 hover:text-ink-2">
        <IconChevronLeft size={14} />
        方法卡
      </Link>

      <article className="mt-3">
        <p className="flex flex-wrap items-center gap-2 text-[12px] text-ink-4">
          {card.tags.map((t) => (
            <span key={t} className="rounded-full border border-line px-2 py-[1px]">
              {t}
            </span>
          ))}
        </p>
        <h1 data-page-title="" className="mt-3 text-[27px] font-semibold leading-[1.35] tracking-[-0.01em] text-ink sm:text-[31px]">
          {card.title}
        </h1>

        <section className="mt-5 rounded-card border border-line bg-surface px-5 py-4">
          <p className="text-[12px] font-medium tracking-wide text-ink-4">它只解决这一个问题</p>
          <p className="mt-1.5 text-[15px] leading-7 text-ink">{card.problem}</p>
        </section>

        <section className="mt-8">
          <h2 className="text-[17px] font-semibold text-ink">怎么做</h2>
          <ol className="mt-3 space-y-3">
            {card.method.map((m, i) => (
              <li key={m.step} className="flex gap-3 rounded-card border border-line-soft px-4 py-3">
                <span className="num mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-line text-[11.5px] text-ink-4">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[14.5px] font-medium text-ink">{m.step}</p>
                  <p className="mt-1 text-[14px] leading-7 text-ink-2">{m.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <section className="rounded-card border border-line bg-bg-muted px-4 py-3.5">
            <h2 className="text-[13.5px] font-semibold text-ink">什么时候用</h2>
            <ul className="mt-2 space-y-1.5">
              {card.scenes.map((s) => (
                <li key={s} className="flex gap-2 text-[13.5px] leading-6 text-ink-2">
                  <span className="mt-[9px] size-1 shrink-0 rounded-full bg-ink-4" />
                  {s}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-card border border-line px-4 py-3.5">
            <h2 className="text-[13.5px] font-semibold text-ink">别这样用</h2>
            <ul className="mt-2 space-y-1.5">
              {card.limits.map((s) => (
                <li key={s} className="flex gap-2 text-[13.5px] leading-6 text-ink-2">
                  <span className="mt-[9px] size-1 shrink-0 rounded-full bg-ink-4" />
                  {s}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-8">
          <h2 className="text-[17px] font-semibold text-ink">用一次看看</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-card border border-line-soft px-4 py-3">
              <p className="text-[11.5px] font-medium text-ink-4">之前</p>
              <p className="mt-1 text-[13.5px] leading-7 text-ink-2">{card.example.before}</p>
            </div>
            <div className="rounded-card border border-line bg-surface px-4 py-3">
              <p className="text-[11.5px] font-medium text-ink-4">之后</p>
              <p className="mt-1 text-[13.5px] leading-7 text-ink">{card.example.after}</p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-card border border-line bg-bg-muted px-5 py-4">
          <h2 className="text-[14px] font-semibold text-ink">出处</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {card.sources.map((s) => (
              <li key={`${s.chapter}-${s.section}`}>
                <Link
                  to={sectionHrefFor(card.book.id, s.chapter, s.section)}
                  className="inline-flex rounded-control border border-line bg-surface px-3 py-1.5 text-[12.5px] text-ink-2 hover:bg-bg-sunk"
                >
                  第 {Number(s.chapter)} 章 · {s.sectionTitle}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11.5px] leading-6 text-ink-4">
            依据《{card.book.title}》整理（{card.generatedAt}）。检索自检 {card.tests.filter((t) => t.passed).length}/{card.tests.length} 通过。
          </p>
        </section>

        <p className="mt-6 text-[11.5px] leading-6 text-ink-4">
          关键词：{card.keywords.join(" · ")}
        </p>
      </article>
    </div>
  );
}
