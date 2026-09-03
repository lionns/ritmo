import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { findTypeaheadIndex, moveListboxIndex } from "../../src/lib/listbox.ts";

describe("the custom listbox", () => {
  it("moves through options with arrows and boundaries", () => {
    assert.equal(moveListboxIndex(-1, 3, "ArrowDown"), 0);
    assert.equal(moveListboxIndex(0, 3, "ArrowUp"), 2);
    assert.equal(moveListboxIndex(2, 3, "ArrowDown"), 0);
    assert.equal(moveListboxIndex(1, 3, "Home"), 0);
    assert.equal(moveListboxIndex(1, 3, "End"), 2);
    assert.equal(moveListboxIndex(0, 0, "ArrowDown"), -1);
  });

  it("finds type-ahead matches after the active option", () => {
    const labels = ["Casa", "Trabajo", "Cuidado", "Viajes"];

    assert.equal(findTypeaheadIndex(labels, "c", 0), 2);
    assert.equal(findTypeaheadIndex(labels, "tra", 0), 1);
    assert.equal(findTypeaheadIndex(labels, "v", 3), 3);
    assert.equal(findTypeaheadIndex(labels, "z", 1), -1);
  });

  it("ignores accents and cycles repeated initials", () => {
    const labels = ["Álbum", "Archivo", "Casa"];

    assert.equal(findTypeaheadIndex(labels, "a", -1), 0);
    assert.equal(findTypeaheadIndex(labels, "aa", 0), 1);
  });
});
