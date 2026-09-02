import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  adapter: node({ mode: "standalone" }),
  output: "server",
  session: false,
  vite: {
    plugins: [tailwindcss()],
  },
});
