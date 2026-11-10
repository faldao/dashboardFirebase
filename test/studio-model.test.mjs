import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanResource,
  nextResource,
  normalizePrompt,
  promptText,
  resourceId,
  serializePrompt,
} from "../lib/studio/model.mjs";

test("conserva campos desconocidos y admite el contexto histórico que usa el backend", () => {
  const original = {
    id: "HANDLER0",
    custom_backend_field: { enabled: true },
    texto: { titulo: "Contexto", contenido: "Información existente" },
    temperature: 0,
  };
  const normalized = normalizePrompt(original);
  assert.equal(normalized.contexto.contenido, "Información existente");
  assert.deepEqual(
    serializePrompt(normalized).custom_backend_field,
    original.custom_backend_field,
  );
  assert.equal(serializePrompt(normalized).temperature, 0);
});
test("las modificaciones de contexto se sincronizan con el campo consumido por el backend", () => {
  const prompt = normalizePrompt({
    id: "HANDLER0",
    texto: { titulo: "Viejo", contenido: "Texto anterior" },
  });
  prompt.contexto = { titulo: "Contexto nuevo", contenido: "Nuevo contenido" };
  const saved = serializePrompt(prompt);
  assert.deepEqual(saved.texto, saved.contexto);
  assert.equal(saved.texto.contenido, "Nuevo contenido");
  assert.match(promptText(prompt), /Nuevo contenido/);
});
test("la versión conserva hasta cinco snapshots sin anidar historiales", () => {
  let record = nextResource({ id: "test", descripcion: "Inicial" }, null, 100);
  for (let i = 0; i < 8; i++)
    record = nextResource(
      { ...record, descripcion: `Cambio ${i}` },
      record,
      200 + i,
    );
  assert.equal(record._studio.revision, 9);
  assert.equal(record._studio.createdAt, 100);
  assert.equal(record._studioHistory.length, 5);
  assert.equal(record._studioHistory[0].data.descripcion, "Cambio 6");
  assert.equal(record._studioHistory[0].data._studioHistory, undefined);
  assert.equal(cleanResource(record)._studio, undefined);
});
test("rechaza IDs inseguros y temperaturas inválidas", () => {
  assert.throws(() => resourceId("../otro"), /letras/);
  assert.throws(() => resourceId("__proto__"), /reservado/);
  assert.throws(
    () => serializePrompt({ id: "ok", temperature: 3 }),
    /temperatura/,
  );
});
test("la vista previa conserva variables y omite reglas desactivadas", () => {
  const prompt = {
    id: "test",
    rol_principal: { titulo: "Rol", contenido: "Hola {{nombre}}" },
    reglas_particulares: {
      activo: false,
      parametros: [{ nombre: "oculta", regla: "No incluir" }],
    },
  };
  assert.match(promptText(prompt), /Hola {{nombre}}/);
  assert.doesNotMatch(promptText(prompt), /No incluir/);
});
