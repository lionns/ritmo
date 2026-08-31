import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  adapter: cloudflare(),
  output: "server",
  session: false,
  vite: {
    plugins: [tailwindcss()],
  },
});
