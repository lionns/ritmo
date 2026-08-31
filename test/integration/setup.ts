// cloudflare:workers is the sole env source because cloudflare:test's env export is deprecated.
import { env } from "cloudflare:workers";
import { applyD1Migrations, reset } from "cloudflare:test";
import { afterEach, beforeEach } from "vitest";

beforeEach(() => applyD1Migrations(env.DB, env.TEST_MIGRATIONS));
afterEach(reset);
