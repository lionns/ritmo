import { describe } from "vitest";
import { runAuthSuite } from "./auth-suite.ts";
import { libsqlDriver, remoteTestsAvailable } from "./libsql-driver.ts";
describe.skipIf(!remoteTestsAvailable())("remote auth (requires sqld)", () => runAuthSuite(libsqlDriver));
