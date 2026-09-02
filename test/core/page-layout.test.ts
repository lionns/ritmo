import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { PROGRESS_MARK_CAP, countProgressMarks, readAsSentence } from "../../src/lib/project-row.ts";

const source = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

describe("the first-loop page composition", () => {
  it("centres both columns while keeping the chart in document flow", () => {
    const stage = source("src/components/organisms/PageStage.astro");
    const mainClass = stage.match(/<main class="([^"]+)"/)?.[1];
    const chartClass = stage.match(/"pointer-events-none ([^"]+)"/)?.[1];

    assert.ok(mainClass, "the stage needs a main layout class");
    assert.match(mainClass, /\bgrid\b/);
    assert.match(mainClass, /\bflex-1\b/);
    assert.match(mainClass, /\bitems-center\b/);
    assert.ok(chartClass, "the stage needs a chart layout class");
    assert.match(chartClass, /\bw-screen\b/);
    assert.doesNotMatch(chartClass, /\bfixed\b/);
  });

  for (const page of ["index", "registrar"] as const) {
    it(`renders ${page} through the shared responsive stage`, () => {
      const pageSource = source(`src/pages/${page}.astro`);

      assert.match(pageSource, /<PageStage(?:\s|>)/);
      assert.match(pageSource, /<HeroChart slot="chart"/);
    });
  }

  it("uses a bounded desktop stage and keeps panel scrolling as a fallback", () => {
    const shell = source("src/layouts/AppShell.astro");
    const stage = source("src/components/organisms/PageStage.astro");

    assert.match(shell, /xl:h-dvh/);
    assert.match(shell, /xl:h-full/);
    assert.match(stage, /min-h-0/);
    assert.match(stage, /--stage-chart-height: clamp\(96px, 12dvh, 180px\)/);
    assert.match(stage, /\.stage-main > :global\(:nth-child\(2\)\)/);
    assert.match(stage, /max-height: 100%/);
    assert.match(stage, /overflow-y: auto/);
    assert.match(stage, /overscroll-behavior: contain/);
  });

  it("compacts decoration by height without shrinking interactive targets", () => {
    const panel = source("src/components/organisms/PortfolioPanel.astro");
    const card = source("src/components/molecules/ProjectCard.astro");

    assert.match(panel, /max-height: 75rem/);
    assert.match(card, /max-height: 75rem/);
    assert.match(card, /padding-top: 12px/);
    // Density takes the outer padding only: the row's own 8px gaps are its hierarchy.
    assert.doesNotMatch(card, /\.project-title \{[^}]*margin/);
    assert.doesNotMatch(card, /\.project-line \{[^}]*margin/);
    assert.match(card, /class="project-title mt-2/);
    assert.match(card, /class="project-line mt-2/);
    assert.match(card, /md:min-h-14/);
  });

  it("keeps the dark glass denser without changing its light peer", () => {
    const styles = source("src/styles/global.css");

    assert.match(styles, /--page-glass: rgba\(5, 9, 10, 0\.64\)/);
    assert.match(styles, /--page-glass-fallback: rgba\(5, 9, 10, 0\.94\)/);
    assert.match(styles, /--page-glass: rgba\(255, 255, 255, 0\.55\)/);
  });

  it("dims chart marks without fading their labels", () => {
    const stage = source("src/components/organisms/PageStage.astro");
    const chart = source("src/components/molecules/HeroChart.astro");

    assert.match(stage, /--stage-chart-opacity:0\.3/);
    assert.doesNotMatch(stage, /opacity-30/);
    assert.match(chart, /opacity-\[var\(--stage-chart-opacity,0\.3\)\]/);
    // The label lives in the header slot, not under the chart, and no key is drawn at all.
    assert.doesNotMatch(chart, /figcaption|chart-key/);
  });

  it("names where you are once, in the header", () => {
    const shell = source("src/layouts/AppShell.astro");

    assert.match(shell, /<header class="[^"]*items-baseline/);
    assert.match(shell, /data-header-context/);
    assert.match(shell, /tracking-\[0\.22em\][^"]*text-dim uppercase[^"]*md:text-\[9px\]/);
    for (const page of ["index", "registrar"] as const) {
      const pageSource = source(`src/pages/${page}.astro`);
      assert.match(pageSource, /context=(?:"|\{)/, `${page} must name itself in the header`);
      // The body must not repeat the header's label as an eyebrow above the headline.
      assert.doesNotMatch(pageSource, /<p class="m-0 font-mono[^"]*uppercase/);
    }
  });

  it("styles fallback panel scrolling without spending accent", () => {
    const stage = source("src/components/organisms/PageStage.astro");

    assert.match(stage, /clamp\(400px,32vw,480px\)/);
    assert.match(stage, /scrollbar-width: thin/);
    assert.match(stage, /var\(--page-dim\) 72%/);
    assert.doesNotMatch(stage, /scrollbar[^\n]*accent/);
    // Declaring the standard properties makes ::-webkit-scrollbar* dead everywhere it could apply.
    assert.doesNotMatch(stage, /::-webkit-scrollbar/);
    // The gutter is not reserved: the normal panel does not scroll, and must stay centred.
    assert.doesNotMatch(stage, /scrollbar-gutter/);
  });

  it("draws the project row as marks, a title and one sentence", () => {
    const card = source("src/components/molecules/ProjectCard.astro");

    // design-handoff.md § The Project Row: geometry of the three marks.
    assert.match(card, /mark-progress[^"]*size-\[11px\][^"]*rounded-full bg-accent[^"]*md:size-3/);
    assert.match(card, /mark-open[^"]*size-\[11px\][^"]*rounded-full border-\[1\.5px\] border-faint[^"]*md:size-3/);
    assert.match(card, /mark-goal ml-\[5px\][^"]*size-2 rotate-45 bg-faint[^"]*md:size-\[9px\]/);
    assert.match(card, /class="project-marks flex items-center gap-2\.5"/);
    assert.match(card, /countProgressMarks\(project\.progressSincePlan\)/);
    assert.doesNotMatch(card, /countProgressMarks\(project\.recentEntries\.length\)/);
    // The next step is always drawn: an active project always carries one (data-model.md).
    // Guarded by shape, not by one spelling — any conditional around the mark fails this.
    const markLines = card.split("\n");
    const openAt = markLines.findIndex((l) => l.includes("mark-open"));
    assert.notEqual(openAt, -1, "the row needs the next-step mark");
    assert.equal(markLines.filter((l) => l.includes("mark-open")).length, 1);
    assert.doesNotMatch(markLines[openAt], /&&|\?|nextAction|map\(/);
    assert.doesNotMatch(markLines[openAt - 1].trim(), /(&&|\?|=>|\{)$/);
    // No mono field labels and no second call to action. Shelved rows may name their area.
    assert.doesNotMatch(card, />Cuando<|>Entonces</);
    assert.doesNotMatch(card, /Registrar avance/);
    assert.doesNotMatch(card, /font-mono/);
    // The last entry's text is on the row, so writing one always changes `/` (AC-5).
    assert.match(card, /project-latest[^"]*text-dim/);
    assert.match(card, /latestEntry\.what/);
    // The visual row carries the prefilled link (NFR-1), at a real target height.
    assert.match(card, /<a\n\s+class="project-card[^"]*min-h-\[58px\][^"]*md:min-h-14/);
    assert.match(card, /href=\{logHref\}/);
  });

  it("caps the filled marks and reads the next action as language", () => {
    assert.equal(PROGRESS_MARK_CAP, 4);
    assert.equal(countProgressMarks(0), 0);
    assert.equal(countProgressMarks(2), 2);
    assert.equal(countProgressMarks(4), 4);
    assert.equal(countProgressMarks(15), 4);

    const sentence = (trigger: string, act: string) =>
      readAsSentence({
        id: "na",
        trigger,
        act,
        obstacle: null,
        estimateMinutes: null,
        createdAt: "2026-09-01T12:00:00.000Z",
      });

    // The act joins verbatim: no case transform, so a proper noun survives intact.
    assert.equal(sentence("Cuando X", "Notion queda ordenado"), "Cuando X, Notion queda ordenado.");
    assert.equal(sentence("Si tengo la lista,", "RSVP montado."), "Si tengo la lista, RSVP montado.");
    // Terminal punctuation is never doubled.
    assert.equal(sentence("Cuando X", "¿Confirmar con Ana?"), "Cuando X, ¿Confirmar con Ana?");
    assert.equal(sentence("Cuando X", "Esperar…"), "Cuando X, Esperar…");
    // An act that is only whitespace must not render a bare comma and period.
    assert.equal(sentence("Cuando X", "   "), "Cuando X.");
  });

  it("asks for an owner answer before exposing capture", () => {
    const page = source("src/pages/index.astro");
    const setup = source("src/components/organisms/SetupForm.astro");
    const capture = source("src/components/organisms/ProjectCapture.astro");

    assert.match(page, /setupRequired \? "Una semana mala\."/);
    assert.match(page, /¿Cuántos proyectos puedes tocar de verdad\? La respuesta/);
    assert.match(setup, /name="activeCap"/);
    assert.doesNotMatch(setup, /name="activeCap"[^>]*(?:value|placeholder)=/);
    assert.match(capture, /Nuevo proyecto/);
    assert.match(capture, /Crea un área en/);
    assert.match(capture, /\{activeCount\} de \{activeCap\}/);
  });

  it("keeps the first and replacement action on one field shape", () => {
    const fields = source("src/components/molecules/NextActionFields.astro");
    const capture = source("src/components/organisms/ProjectCapture.astro");
    const cycle = source("src/components/organisms/NextActionCycle.astro");
    const inputFor = (name: string) =>
      [...fields.matchAll(/<input[\s\S]*?\/>/g)]
        .map(([input]) => input)
        .find((input) => input.includes(`name="${name}"`)) ?? "";

    assert.match(capture, /<NextActionFields idPrefix="project-action" \/>/);
    assert.match(inputFor("trigger"), /\brequired\b/);
    assert.match(inputFor("act"), /\brequired\b/);
    assert.doesNotMatch(inputFor("obstacle"), /\brequired\b/);
    assert.doesNotMatch(inputFor("estimateMinutes"), /\brequired\b/);
    assert.match(cycle, /Escribir la próxima acción/);
    assert.match(cycle, /Cerrar y escribir la siguiente/);
    assert.match(cycle, /name="currentActionId"/);
    assert.match(cycle, /fetch\("\/api\/next-actions"/);
  });
});
