import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const workers = process.env.RITMO_TARGET === "workers";
const cloudflare = workers ? (await import("@astrojs/cloudflare")).default : undefined;
const localPath = (path) => new URL(path, import.meta.url).pathname;

export default defineConfig({
  adapter: workers ? cloudflare({ imageService: "compile" }) : node({ mode: "standalone" }),
  outDir: workers ? "./dist/workers" : "./dist/node",
  output: "server",
  session: false,
  vite: {
    plugins: [tailwindcss(), ...(workers ? [{
      name: "workers-sqlite-boundary",
      enforce: "pre",
      transform(source, id) {
        if (id.includes("/adapters/sqlite/")) throw new Error("Native SQLite reached the Workers build");
        if (!/\/sql\.js\/dist\/sql-wasm(?:-browser)?\.js$/.test(id)) return;
        // sql.js assumes browser workers expose self.location. workerd does not; our
        // instantiateWasm supplies the bundled module, so no script-location lookup is needed.
        if (!source.includes("self.location.href")) throw new Error("Review the pinned sql.js Worker shim");
        return { code: source.replaceAll("self.location.href", "globalThis.location?.href"), map: null };
      },
    }] : [])],
    resolve: { alias: workers ? [
      { find: /^.*\/adapters\/runtime\.ts$/, replacement: localPath("./adapters/runtime.workers.ts") },
      { find: "./wasm.ts", replacement: localPath("./adapters/libsql/wasm.workers.ts") },
    ] : [] },
  },
});
