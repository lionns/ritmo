import { describe, vi } from "vitest";
import { runStoreSuite } from "./store-suite.ts";
import { libsqlDriver, remoteTestsAvailable } from "./libsql-driver.ts";

vi.mock("node:sqlite", () => { throw new Error("Native SQLite is unavailable in the remote suite"); });

describe.skipIf(!remoteTestsAvailable())("remote Store (requires sqld)", () => {
  runStoreSuite(libsqlDriver);
});
