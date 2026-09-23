import { openDatabase, applyMigrations } from "../../adapters/sqlite/database.ts";
import { SqliteStore, closeRuntimeDatabase } from "../../adapters/sqlite/store.ts";
import type { StoreDriver } from "./store-driver.ts";

export const sqliteDriver: StoreDriver = {
  name: "SQLite",
  async cleanup() {},
  async open(path, migrations) {
    const database = openDatabase(path, migrations);
    return {
      store: new SqliteStore(database),
      prepare(sql) {
        const statement = database.prepare(sql);
        return {
          run: async (...args) => statement.run(...args),
          get: async (...args) => statement.get(...args),
          all: async (...args) => statement.all(...args),
        };
      },
      exec: async sql => { database.exec(sql); },
      close: () => database.close(),
      migrate: async directory => { applyMigrations(database, directory); },
      async configureRuntime() {
        const previous = process.env.RITMO_DB_PATH;
        process.env.RITMO_DB_PATH = path;
        closeRuntimeDatabase();
        return async () => {
          closeRuntimeDatabase();
          if (previous === undefined) delete process.env.RITMO_DB_PATH;
          else process.env.RITMO_DB_PATH = previous;
        };
      },
    };
  },
};
