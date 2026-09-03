import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fieldIssueFromServer, firstFieldIssue } from "../../src/lib/form-errors.ts";

describe("the shared form error treatment", () => {
  it("uses the product's required and number messages", () => {
    assert.deepEqual(
      firstFieldIssue([
        { name: "title", value: "  ", requiredMessage: "Escribe el nombre del proyecto." },
        {
          name: "estimateMinutes",
          value: "3.5",
          positiveIntegerMessage: "Escribe minutos enteros mayores que cero.",
        },
      ]),
      { name: "title", message: "Escribe el nombre del proyecto." },
    );
    assert.deepEqual(
      firstFieldIssue([
        { name: "title", value: "Ritmo", requiredMessage: "Escribe el nombre del proyecto." },
        {
          name: "estimateMinutes",
          value: "0",
          positiveIntegerMessage: "Escribe minutos enteros mayores que cero.",
        },
      ]),
      { name: "estimateMinutes", message: "Escribe minutos enteros mayores que cero." },
    );
  });

  it("accepts empty optional numbers and valid positive integers", () => {
    assert.equal(
      firstFieldIssue([
        { name: "estimateMinutes", value: "", positiveIntegerMessage: "Escribe minutos enteros." },
        { name: "activeCap", value: "3", positiveIntegerMessage: "Escribe un límite válido." },
      ]),
      null,
    );
  });

  it("turns known server rejections into field-level Spanish", () => {
    assert.deepEqual(
      fieldIssueFromServer("Area 01ABC does not exist", ["title", "areaId"]),
      { name: "areaId", message: "El área ya no está disponible. Elige otra." },
    );
    assert.deepEqual(
      fieldIssueFromServer("3 capped projects are active", ["activeCap"]),
      {
        name: "activeCap",
        message: "El límite no incluye los proyectos activos. Escribe un número que los incluya.",
      },
    );
    assert.deepEqual(
      fieldIssueFromServer("what must be a non-empty string", ["projectId", "what"]),
      { name: "what", message: "Escribe una línea sobre lo que moviste." },
    );
  });

  it("leaves unrelated and unavailable fields at form level", () => {
    assert.equal(fieldIssueFromServer("Entry could not be saved", ["projectId", "what"]), null);
    assert.equal(fieldIssueFromServer("Project 01ABC is shelved", ["what"]), null);
  });
});
