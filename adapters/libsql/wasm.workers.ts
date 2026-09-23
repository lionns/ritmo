import initSqlJs from "sql.js";
import wasm from "sql.js/dist/sql-wasm.wasm";

export function sqliteModule() {
  return initSqlJs({
    instantiateWasm(imports, success) {
      const instance = new WebAssembly.Instance(wasm, imports);
      success(instance);
      return instance.exports;
    },
  });
}
