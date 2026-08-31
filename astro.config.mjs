import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { mkdir, writeFile } from "node:fs/promises";

const fontshareStylesheets = [
  "https://api.fontshare.com/v2/css?f[]=clash-display@600&display=swap",
  "https://api.fontshare.com/v2/css?f[]=switzer@400,500,600&display=swap",
];

const fontshareBuild = {
  name: "ritmo-fontshare-build",
  hooks: {
    "astro:build:done": async ({ dir, logger }) => {
      const assetDirectory = new URL("_astro/", dir);
      await mkdir(assetDirectory, { recursive: true });
      const fontFaces = [];
      let fontIndex = 0;

      for (const stylesheetUrl of fontshareStylesheets) {
        const stylesheetResponse = await fetch(stylesheetUrl);
        if (!stylesheetResponse.ok) {
          throw new Error(`Fontshare stylesheet failed with ${stylesheetResponse.status}`);
        }
        const stylesheet = await stylesheetResponse.text();
        for (const block of stylesheet.match(/@font-face\s*\{[^}]+\}/g) ?? []) {
          const family = block.match(/font-family:\s*'([^']+)'/)?.[1];
          const weight = block.match(/font-weight:\s*(\d+)/)?.[1];
          const source = block.match(/url\('?(\/\/[^')]+\.woff2)'?\)/)?.[1];
          if (family === undefined || weight === undefined || source === undefined) continue;

          const fileName = `fontshare-${fontIndex}.woff2`;
          const fontResponse = await fetch(`https:${source}`);
          if (!fontResponse.ok) {
            throw new Error(`Fontshare font failed with ${fontResponse.status}`);
          }
          await writeFile(
            new URL(fileName, assetDirectory),
            new Uint8Array(await fontResponse.arrayBuffer()),
          );
          fontFaces.push(
            `@font-face{font-family:'${family}';src:url('/_astro/${fileName}') format('woff2');` +
              `font-weight:${weight};font-style:normal;font-display:swap}`,
          );
          fontIndex += 1;
        }
      }

      if (fontFaces.length !== 4) {
        throw new Error(`Expected 4 Fontshare faces, received ${fontFaces.length}`);
      }
      await writeFile(
        new URL("ritmo-fonts.css", assetDirectory),
        `/* Fontshare · ITF Free Font Licence · https://www.fontshare.com/licenses/itf-ffl */\n${fontFaces.join("\n")}`,
      );
      logger.info("downloaded Clash Display and Switzer into the build output");
    },
  },
};

export default defineConfig({
  adapter: cloudflare(),
  integrations: [fontshareBuild],
  output: "server",
  session: false,
  vite: {
    plugins: [tailwindcss()],
  },
});
