/** A card of the reading guide: two voices, a caution, and a prompt. All sentences are original. */
export interface KbGuide {
  claim: string;
  youth: string;
  boundary: string;
  prompt: string;
}

const VOICE = {
  claim: "书里的主张",
  youth: "青年会怎么问",
  boundary: "但要当心",
  prompt: "留给你",
} as const;

/**
 * One guide card: the book's claim set in serif at reading size, the young man's doubt indented
 * beside it, then the boundary and a prompt. Five nights are shown as dots: the guide's only
 * ornament, because the book itself is a conversation held over five nights.
 */
export function GuideCard({
  guide,
  title,
  chapter,
  chapterIndex,
  chapters,
  unit,
}: {
  guide: KbGuide;
  title: string;
  chapter: string;
  chapterIndex: number;
  chapters: number;
  unit: string;
}) {
  return (
    <article className="kb-guide">
      <header className="kb-guide-head">
        <p className="kb-guide-eyebrow">
          <span>
            第 {chapterIndex + 1} {unit} · {chapter}
          </span>
          <span className="kb-guide-nights" aria-label={`全书共 ${chapters} ${unit}`}>
            {Array.from({ length: chapters }, (_unused, i) => (
              <span key={i} className="kb-guide-night" data-on={i <= chapterIndex ? "" : undefined} />
            ))}
          </span>
        </p>
        <h1 data-page-title="" className="kb-guide-title">
          {title}
        </h1>
      </header>

      <section className="kb-guide-claim">
        <p className="kb-guide-voice">{VOICE.claim}</p>
        <p className="kb-guide-claim-text">{guide.claim}</p>
      </section>

      <section className="kb-guide-youth">
        <p className="kb-guide-voice">{VOICE.youth}</p>
        <p className="kb-guide-youth-text">{guide.youth}</p>
      </section>

      <section className="kb-guide-boundary">
        <p className="kb-guide-voice">{VOICE.boundary}</p>
        <p>{guide.boundary}</p>
      </section>

      <section className="kb-guide-prompt">
        <p className="kb-guide-voice">{VOICE.prompt}</p>
        <p>{guide.prompt}</p>
      </section>
    </article>
  );
}
