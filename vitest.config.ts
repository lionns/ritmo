import {
  cloudflarePool,
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrations = await readD1Migrations("./migrations");
  const workers = {
    main: "./test/integration/worker.ts",
    miniflare: {
      bindings: { TEST_MIGRATIONS: migrations },
    },
    wrangler: { configPath: "./wrangler.jsonc" },
  };

  return {
    plugins: [cloudflareTest(workers)],
    test: {
      include: ["test/integration/**/*.test.ts"],
      pool: cloudflarePool(workers),
      setupFiles: ["./test/integration/setup.ts"],
    },
  };
});
