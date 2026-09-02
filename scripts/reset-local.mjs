import { rmSync } from "node:fs";

import { localDatabasePath, openDatabase } from "../adapters/sqlite/database.ts";

const databasePath = localDatabasePath();
for (const suffix of ["", "-shm", "-wal"]) {
  rmSync(`${databasePath}${suffix}`, { force: true });
}

const database = openDatabase(databasePath);
database.close();
console.log(`Reset and migrated ${databasePath}`);
