import assert from "node:assert/strict";
import { test } from "node:test";
import { fakeApi, startWebServer } from "./web-server.ts";

const BOOK = "/kb/courage-to-be-disliked-guide";

/** Server-rendered text is split by hydration markers; read it as a reader would. */
const text = (html: string) => html.replace(/<!-- -->/g, "");

test("the original reading guide renders its five nights and all 20 cards", async () => {
  const site = await startWebServer(fakeApi());
  try {
    const library = await fetch(`${site.origin}/kb`);
    assert.equal(library.status, 200);
    assert.match(await library.text(), /《被讨厌的勇气》原创导读/);

    const book = await fetch(`${site.origin}${BOOK}`);
    assert.equal(book.status, 200);
    const overview = text(await book.text());
    assert.match(overview, /原创导读：5 章 20 节/);
    assert.match(overview, /5 夜 · 20 节/);
    assert.match(overview, /怎么读这本书/);
    assert.match(overview, /课题分离/);
    assert.doesNotMatch(overview, /href=""/);

    for (let chapter = 1; chapter <= 5; chapter++) {
      const chapterSlug = String(chapter).padStart(2, "0");
      const chapterPage = await fetch(`${site.origin}${BOOK}/${chapterSlug}`);
      assert.equal(chapterPage.status, 200);
      assert.match(text(await chapterPage.text()), new RegExp(`第 ${chapter} 夜`));
      for (let section = 0; section < 4; section++) {
        const sectionSlug = String(section).padStart(2, "0");
        const path = `${BOOK}/${chapterSlug}/${sectionSlug}`;
        const page = await fetch(`${site.origin}${path}`);
        assert.equal(page.status, 200, path);
        assert.doesNotMatch(await page.text(), /href=""/);
      }
    }

    // Night two is a dialogue card: the claim, the doubt, the caution and the prompt.
    const middleHtml = text(await (await fetch(`${site.origin}${BOOK}/02/00`)).text());
    assert.match(middleHtml, /书里的主张/);
    assert.match(middleHtml, /青年会怎么问/);
    assert.match(middleHtml, /但要当心/);
    assert.match(middleHtml, /留给你/);
    assert.doesNotMatch(middleHtml, /这一节在谈什么/);
    assert.match(middleHtml, /href="\/kb\/courage-to-be-disliked-guide\/01\/03"/);
    assert.match(middleHtml, /href="\/kb\/courage-to-be-disliked-guide\/02\/01"/);
  } finally {
    await site.stop();
  }
});

const LIFE_BOOK = "/kb/psychology-and-life-19-guide";

test("the psychology and life guide renders every chapter and the copyright boundary", async () => {
  const site = await startWebServer(fakeApi());
  try {
    const library = await fetch(`${site.origin}/kb`);
    assert.equal(library.status, 200);
    assert.match(await library.text(), /《心理学与生活》/);

    const book = await fetch(`${site.origin}${LIFE_BOOK}`);
    assert.equal(book.status, 200);
    const overview = await book.text();
    assert.match(overview, /16 章/);
    assert.match(overview, /17 节/);
    assert.match(overview, /原书版权归权利人所有/);
    assert.match(overview, /不提供原书全文或插图/);
    assert.doesNotMatch(overview, /href=""/);

    for (let chapter = 1; chapter <= 16; chapter++) {
      const chapterSlug = String(chapter).padStart(2, "0");
      const chapterPage = await fetch(`${site.origin}${LIFE_BOOK}/${chapterSlug}`);
      assert.equal(chapterPage.status, 200, `chapter ${chapterSlug}`);
      const sectionCount = chapter === 2 ? 2 : 1;
      for (let section = 0; section < sectionCount; section++) {
        const sectionSlug = String(section).padStart(2, "0");
        const path = `${LIFE_BOOK}/${chapterSlug}/${sectionSlug}`;
        const page = await fetch(`${site.origin}${path}`);
        assert.equal(page.status, 200, path);
        const html = await page.text();
        assert.match(html, /本章主线/);
        assert.match(html, /带着问题想一想/);
        assert.match(html, /不含原书正文/);
        assert.doesNotMatch(html, /href=""/);
      }
    }

    const appendix = await fetch(`${site.origin}${LIFE_BOOK}/02/01`);
    assert.match(await appendix.text(), /统计学附录/);
    const chapter14 = await fetch(`${site.origin}${LIFE_BOOK}/14/00`);
    assert.match(await chapter14.text(), /不能用于自我诊断/);
    const chapter15 = await fetch(`${site.origin}${LIFE_BOOK}/15/00`);
    assert.match(await chapter15.text(), /不推荐具体治疗/);

    const chapter2 = await fetch(`${site.origin}${LIFE_BOOK}/02/00`);
    assert.match(await chapter2.text(), /href="\/kb\/psychology-and-life-19-guide\/02\/01"/);
    const appendixPage = await fetch(`${site.origin}${LIFE_BOOK}/02/01`);
    assert.match(await appendixPage.text(), /href="\/kb\/psychology-and-life-19-guide\/03\/00"/);
  } finally {
    await site.stop();
  }
});
