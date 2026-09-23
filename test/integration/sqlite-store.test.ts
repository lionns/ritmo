import { runStoreSuite } from "./store-suite.ts";
import { sqliteDriver } from "./sqlite-driver.ts";

runStoreSuite(sqliteDriver);
