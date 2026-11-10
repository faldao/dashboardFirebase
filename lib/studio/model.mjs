export const PROMPTS_COLLECTION = "configuracion_prompts_IA";

export const PROMPT_SECTIONS = [
  [
    "rol_principal",
    "Rol principal",
    "Definí la misión y el rol del asistente.",
  ],
  [
    "contexto",
    "Contexto",
    "Información que necesita para interpretar la conversación.",
  ],
  ["formato", "Formato de respuesta", "Tono, extensión y estructura esperada."],
  ["historial", "Historial", "Cómo utilizar las interacciones anteriores."],
  [
    "directrices_calidad",
    "Calidad",
    "Criterios de precisión, coherencia y relevancia.",
  ],
  [
    "reglas_salida",
    "Reglas de salida",
    "Qué debe devolver el backend: intención, JSON o texto.",
  ],
  [
    "manejo_excepciones",
    "Excepciones",
    "Qué hacer cuando faltan datos o aparece un problema.",
  ],
];

export const copyJson = (value) => JSON.parse(JSON.stringify(value));
export function resourceId(value) {
  const id = String(value || "").trim();
  if (!/^[\p{L}\p{N}_-]{1,100}$/u.test(id))
    throw new Error(
      "Usá entre 1 y 100 letras, números, guiones o guiones bajos para el ID.",
    );
  if (["__proto__", "constructor", "prototype"].includes(id))
    throw new Error("Ese ID está reservado.");
  return id;
}

const block = (value) => ({
  titulo: "",
  contenido: "",
  ...(value && typeof value === "object" && !Array.isArray(value) ? value : {}),
});
const hasContent = (value) => !!(value?.titulo || value?.contenido);
export function normalizePrompt(data = {}, id = data.id || "") {
  const result = {
    ...copyJson(data),
    id,
    descripcion: data.descripcion || "",
    tipo_prompt: data.tipo_prompt || "detector",
    system: data.system || "system",
    temperature: typeof data.temperature === "number" ? data.temperature : 0,
    model: data.model || "",
  };
  for (const [key] of PROMPT_SECTIONS) result[key] = block(data[key]);
  // Both historical prompt schemas remain readable; the backend currently consumes `texto`.
  result.contexto = block(hasContent(data.texto) ? data.texto : data.contexto);
  result.reglas_particulares = {
    titulo: "",
    activo: true,
    ...data.reglas_particulares,
    parametros: Array.isArray(data.reglas_particulares?.parametros)
      ? copyJson(data.reglas_particulares.parametros)
      : [],
  };
  return result;
}

export function serializePrompt(value) {
  const prompt = normalizePrompt(value, resourceId(value.id));
  if (Object.hasOwn(value, "contexto")) prompt.contexto = block(value.contexto);
  if (
    !Number.isFinite(prompt.temperature) ||
    prompt.temperature < 0 ||
    prompt.temperature > 2
  )
    throw new Error("La temperatura debe estar entre 0 y 2.");
  if (!["detector", "conversacional", "extractor"].includes(prompt.tipo_prompt))
    throw new Error("Elegí un tipo de prompt válido.");
  prompt.texto = copyJson(prompt.contexto);
  if (!prompt.model) delete prompt.model;
  return prompt;
}

export function cleanResource(value) {
  const copy = copyJson(value);
  delete copy._studio;
  delete copy._studioHistory;
  return copy;
}
export function nextResource(value, previous = null, now = Date.now()) {
  const clean = cleanResource(value);
  const previousMeta = previous?._studio || {};
  const history = previous
    ? [
        {
          savedAt: previousMeta.updatedAt || now,
          revision: previousMeta.revision || 0,
          data: cleanResource(previous),
        },
        ...(previous._studioHistory || []),
      ].slice(0, 5)
    : [];
  return {
    ...clean,
    _studio: {
      ...previousMeta,
      createdAt: previousMeta.createdAt || now,
      updatedAt: now,
      revision: (previousMeta.revision || 0) + 1,
      deleted: previousMeta.deleted || false,
    },
    _studioHistory: history,
  };
}

export function promptText(prompt) {
  const normalized = normalizePrompt(prompt);
  if (Object.hasOwn(prompt, "contexto"))
    normalized.contexto = block(prompt.contexto);
  const parts = PROMPT_SECTIONS.flatMap(([key]) => {
    const section = normalized[key];
    return section.contenido
      ? [[section.titulo, section.contenido].filter(Boolean).join("\n")]
      : [];
  });
  if (normalized.reglas_particulares.activo) {
    const rules = normalized.reglas_particulares.parametros.map(
      (item) => `- ${item.nombre || "Sin nombre"}: ${item.regla || ""}`,
    );
    if (rules.length)
      parts.push(
        [normalized.reglas_particulares.titulo, ...rules]
          .filter(Boolean)
          .join("\n"),
      );
  }
  return parts.join("\n\n");
}
