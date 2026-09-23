import type { AuthStore } from "../../core/ports/auth-store.ts";
import type { Store } from "../../core/ports/store.ts";

export interface TestDatabase {
  store: Store & AuthStore;
  prepare(sql: string): {
    run(...args: (string | number | null)[]): Promise<unknown>;
    get(...args: (string | number | null)[]): Promise<Record<string, unknown> | undefined>;
    all(...args: (string | number | null)[]): Promise<Record<string, unknown>[]>;
  };
  exec(sql: string): Promise<void>;
  close(): void;
  migrate(directory?: string): Promise<void>;
  configureRuntime(): Promise<() => Promise<void>>;
}

export interface StoreDriver {
  name: string;
  open(path: string, migrations?: string): Promise<TestDatabase>;
  cleanup(): Promise<void>;
}
