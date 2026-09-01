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
    const panel = source("src/components/organisms/PortfolioPanel.astro");
    const panelClass = panel.match(/class="([^"]*glass-panel[^"]*)"/)?.[1];

    assert.match(shell, /xl:h-dvh/);
    assert.match(shell, /xl:h-full/);
    assert.match(stage, /min-h-0/);
    assert.match(stage, /--stage-chart-height: clamp\(96px, 12dvh, 180px\)/);
    assert.ok(panelClass, "the portfolio needs a glass panel class");
    assert.match(panelClass, /xl:max-h-full/);
    assert.match(panelClass, /xl:overflow-y-auto/);
    assert.match(panelClass, /xl:overscroll-contain/);
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
    assert.match(chart, /<figcaption class="[^"]*text-\[9px\][^"]*text-dim[^"]*md:text-\[10px\]/);
  });

  it("styles fallback panel scrolling without spending accent", () => {
    const stage = source("src/components/organisms/PageStage.astro");
    const panel = source("src/components/organisms/PortfolioPanel.astro");

    assert.match(stage, /clamp\(400px,32vw,480px\)/);
    assert.match(panel, /scrollbar-width: thin/);
    assert.match(panel, /::-webkit-scrollbar-thumb/);
    assert.match(panel, /var\(--page-dim\) 72%/);
    assert.doesNotMatch(panel, /scrollbar[^\n]*accent/);
  });

  it("draws the project row as marks, a title and one sentence", () => {
    const card = source("src/components/molecules/ProjectCard.astro");

    // design-handoff.md § The Project Row: geometry of the three marks.
    assert.match(card, /mark-progress[^"]*size-\[11px\][^"]*rounded-full bg-accent[^"]*md:size-3/);
    assert.match(card, /mark-open[^"]*size-\[11px\][^"]*rounded-full border-\[1\.5px\] border-faint[^"]*md:size-3/);
    assert.match(card, /mark-goal ml-\[5px\][^"]*size-2 rotate-45 bg-faint[^"]*md:size-\[9px\]/);
    assert.match(card, /class="project-marks flex items-center gap-2\.5"/);
    // The next step is always drawn: an active project always carries one (data-model.md).
    // Guarded by shape, not by one spelling — any conditional around the mark fails this.
    const markLines = card.split("\n");
    const openAt = markLines.findIndex((l) => l.includes("mark-open"));
    assert.notEqual(openAt, -1, "the row needs the next-step mark");
    assert.equal(markLines.filter((l) => l.includes("mark-open")).length, 1);
    assert.doesNotMatch(markLines[openAt], /&&|\?|nextAction|map\(/);
    assert.doesNotMatch(markLines[openAt - 1].trim(), /(&&|\?|=>|\{)$/);
    // Three elements only: no area label, no field labels, no second call to action.
    assert.doesNotMatch(card, /Último movimiento|>Cuando<|>Entonces<|project\.area/);
    assert.doesNotMatch(card, /Registrar avance/);
    // The whole row carries the prefilled link (NFR-1), at a real target height.
    assert.match(card, /<a\n\s+class="project-card[^"]*min-h-\[58px\][^"]*md:min-h-14/);
    assert.match(card, /href=\{logHref\}/);
  });

  it("caps the filled marks and reads the next action as language", () => {
    assert.equal(PROGRESS_MARK_CAP, 4);
    assert.equal(countProgressMarks(0), 0);
    assert.equal(countProgressMarks(2), 2);
    assert.equal(countProgressMarks(4), 4);
    assert.equal(countProgressMarks(15), 4);

    assert.equal(
      readAsSentence({
        id: "na-1",
        trigger: "Cuando pase el despliegue de la mañana",
        act: "Verificar la réplica y guardar el resultado",
        obstacle: null,
        estimateMinutes: null,
      }),
      "Cuando pase el despliegue de la mañana, verificar la réplica y guardar el resultado.",
    );
    const sentence = (trigger: string, act: string) =>
      readAsSentence({ id: "na", trigger, act, obstacle: null, estimateMinutes: null });

    // A word capitalised in its own right keeps its capitals.
    assert.equal(sentence("Si tengo la lista,", "RSVP montado."), "Si tengo la lista, RSVP montado.");
    // Terminal punctuation is not doubled, and "¿" does not defeat the lowercasing.
    assert.equal(sentence("Cuando X", "¿Confirmar con Ana?"), "Cuando X, ¿confirmar con Ana?");
    assert.equal(sentence("Cuando X", "Esperar…"), "Cuando X, esperar…");
    // An act that is only whitespace must not render a bare comma and period.
    assert.equal(sentence("Cuando X", "   "), "Cuando X.");
  });
});
