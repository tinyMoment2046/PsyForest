// 站点的字标和圆环标记：页面用 Wordmark 画站名（size 是高度，单位像素），RingMark 是小标记，转起来就是加载动画。
// 这里用站名排字；有自己的 Logo 时，把 Wordmark 换成你的 SVG（保持同样的参数）。
import { SITE } from "../site.ts";

export function Wordmark({ size = 24, className = "", title }: { size?: number; className?: string; title?: string }) {
  // 两行字标：第一行英文短名带圆点，第二行 @ 中文名缩进对齐在文字下面；两行都不换行，放不下就截断。
  const name = SITE.shortName || SITE.name;
  return (
    <span
      className={`inline-flex min-w-0 flex-col justify-center font-black leading-none tracking-[-0.03em] ${className}`}
      style={{ fontSize: Math.round(size * 0.92) }}
      aria-label={title ?? SITE.name}
      role="img"
    >
      <span className="flex min-w-0 items-center">
        <span aria-hidden="true" className="mr-[0.3em] inline-block size-[0.42em] shrink-0 rounded-full bg-accent" />
        <span aria-hidden="true" className="truncate whitespace-nowrap">{name}</span>
      </span>
      {SITE.handle && (
        <span aria-hidden="true" className="mt-[0.3em] truncate whitespace-nowrap pl-[0.72em] text-[0.6em] font-semibold tracking-[0.02em] text-ink-3">
          @{SITE.handle}
        </span>
      )}
    </span>
  );
}

/** A ring with a dot; spinning, it is the loader. */
export function RingMark({ className = "", spinning = false }: { className?: string; spinning?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g style={spinning ? { transformOrigin: "12px 12px", animation: "spin-slow 1.1s linear infinite" } : undefined}>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="42 15" />
      </g>
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  );
}
