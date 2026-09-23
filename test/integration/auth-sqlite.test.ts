import { runAuthSuite } from "./auth-suite.ts";
import { sqliteDriver } from "./sqlite-driver.ts";
runAuthSuite(sqliteDriver);
