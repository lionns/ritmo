declare module "cloudflare:test" {
  interface D1Migration {
    name: string;
    queries: string[];
  }

  interface ProvidedEnv {
    DB: import("../../adapters/d1/store.ts").D1Database;
    TEST_MIGRATIONS: D1Migration[];
  }

  const env: ProvidedEnv;

  function applyD1Migrations(
    database: import("../../adapters/d1/store.ts").D1Database,
    migrations: D1Migration[],
  ): Promise<void>;
}
