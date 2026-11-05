import { Link, useLoaderData } from "react-router";
import { guideBySlug } from "../features/kb/guides";
import { pageMeta } from "../lib/seo";
import { edgeTtl } from "../lib/api.server";
import type { Route } from "./+types/kb.guide";
import type { Screen } from "../components/shell/screens";
import { IconChevronLeft } from "../components/icons";

export const handle: Screen = { tab: "me", name: "知识库" };

export function headers() {
  return edgeTtl(3600);
}

export async function loader({ params }: Route.LoaderArgs) {
  return { guide: guideBySlug(params.slug) };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData?.guide) return pageMeta({ title: "问题不存在 · 知识库", path: "/kb/guides", noindex: true });
  return pageMeta({
    title: loaderData.guide.question,
    description: loaderData.guide.deck,
    path: `/kb/guides/${loaderData.guide.slug}`,
  });
}

export default function KbGuidePage() {
  const { guide } = useLoaderData<typeof loader>();
  if (!guide) return null;

  return (
    <div className="mx-auto w-full max-w-[760px] pb-12">
      <Link to="/kb/guides" className="inline-flex items-center gap-1 text-[12.5px] text-ink-4 hover:text-ink-2">
        <IconChevronLeft size={14} />
        读者问题
      </Link>

      <article className="mt-3">
        <header>
          <p className="flex flex-wrap items-center gap-2 text-[12px] text-ink-4">
            {guide.tags.map((t) => (
              <span key={t} className="rounded-full border border-line px-2 py-[1px]">
                {t}
              </span>
            ))}
            <span>{guide.readMinutes} 分钟</span>
          </p>
          <h1 data-page-title="" className="mt-3 text-[27px] font-semibold leading-[1.35] tracking-[-0.01em] text-ink sm:text-[31px]">
            {guide.question}
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-ink-2">{guide.deck}</p>
        </header>

        <div className="kb-prose mt-6">
          {guide.sections.map((s) => (
            <section key={s.heading}>
              <h2>{s.heading}</h2>
              <p>{s.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-10">
          <h2 className="text-[17px] font-semibold text-ink">可以试试</h2>
          <ol className="mt-3 space-y-3">
            {guide.actions.map((a, i) => (
              <li key={a.title} className="rounded-card border border-line bg-surface px-4 py-3.5">
                <p className="flex items-baseline gap-2 text-[14.5px] font-semibold text-ink">
                  <span className="num text-[11.5px] text-ink-4">{String(i + 1).padStart(2, "0")}</span>
                  {a.title}
                </p>
                <p className="mt-1.5 text-[14px] leading-7 text-ink-2">{a.how}</p>
                <p className="mt-1 text-[12.5px] leading-6 text-ink-4">{a.why}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="text-[17px] font-semibold text-ink">别误会</h2>
          <ul className="mt-3 space-y-2.5">
            {guide.myths.map((m) => (
              <li key={m.claim} className="rounded-card border border-line-soft px-4 py-3">
                <p className="text-[13px] text-ink-3">“{m.claim}”</p>
                <p className="mt-1 text-[14px] leading-7 text-ink">{m.correction}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10 rounded-card border border-line bg-bg-muted px-5 py-4">
          <h2 className="text-[15px] font-semibold text-ink">什么时候该找专业帮助</h2>
          <ul className="mt-2 space-y-1.5">
            {guide.help.signs.map((s) => (
              <li key={s} className="flex gap-2 text-[13.5px] leading-7 text-ink-2">
                <span className="mt-[10px] size-1 shrink-0 rounded-full bg-ink-4" />
                {s}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] leading-6 text-ink-4">{guide.help.note}</p>
          <p className="mt-2 text-[12.5px] leading-6 text-ink-3">
            如果出现自伤或自杀念头，请立即联系身边的急救服务（120 / 110），或拨打全国心理援助热线 <span className="num font-medium text-ink">12356</span>。
          </p>
        </section>

        <section className="mt-8 border-t border-line-soft pt-4">
          <p className="text-[12px] text-ink-4">
            依据《{guide.book.title}》：
            {guide.sources.join("、")}
            {" · "}
            <Link to="/kb/guides" className="text-accent underline decoration-accent/30 underline-offset-3">
              更多读者问题
            </Link>
          </p>
          <p className="mt-1 text-[11.5px] text-ink-4">
            本文由模型依据上述章节整理（{guide.generatedAt}），只做阅读辅助，不构成诊断或治疗建议。
          </p>
        </section>
      </article>
    </div>
  );
}
