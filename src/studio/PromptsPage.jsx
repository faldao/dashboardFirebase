import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  cleanResource,
  normalizePrompt,
  PROMPT_SECTIONS,
  promptText,
  resourceId,
  serializePrompt,
} from "../../lib/studio/model.mjs";
import { readPrompt, savePrompt, trashPrompt } from "./store";
import {
  dateLabel,
  downloadJson,
  EmptyState,
  Modal,
  PromptReadNotice,
  useStudio,
} from "./StudioShell";
import Icon from "./Icons";

const types = {
  detector: "Detector",
  conversacional: "Conversacional",
  extractor: "Extractor",
};
export default function PromptsPage() {
  const { prompts, loading, notify } = useStudio();
  const params = useParams(),
    [searchParams] = useSearchParams(),
    navigate = useNavigate();
  const selectedId = params.promptId || searchParams.get("id") || "";
  const [search, setSearch] = useState(searchParams.get("q") || ""),
    [type, setType] = useState("all"),
    [trash, setTrash] = useState(false);
  const [record, setRecord] = useState(null),
    [draft, setDraft] = useState(null),
    [pending, setPending] = useState(false),
    [fetching, setFetching] = useState(false);
  const [error, setError] = useState(""),
    [tab, setTab] = useState("content"),
    [json, setJson] = useState("");
  const [create, setCreate] = useState(
    searchParams.has("crear")
      ? { id: "", description: "", type: "detector", source: null }
      : null,
  );
  const importRef = useRef(null);
  const loadSequence = useRef(0);
  const visible = useMemo(
    () =>
      prompts
        .filter(
          (item) =>
            !!item._studio?.deleted === trash &&
            (type === "all" || (item.tipo_prompt || "detector") === type) &&
            `${item.id} ${item.descripcion || ""}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .sort((a, b) => a.id.localeCompare(b.id)),
    [prompts, type, search, trash],
  );
  const dirty =
    !!draft &&
    !!record &&
    JSON.stringify(cleanResource(draft)) !==
      JSON.stringify(cleanResource(normalizePrompt(record, record.id)));
  const preview = draft ? promptText(draft) : "";
  async function load(id = selectedId) {
    const sequence = ++loadSequence.current;
    if (!id) {
      setRecord(null);
      setDraft(null);
      return;
    }
    setFetching(true);
    setError("");
    try {
      const value = await readPrompt(id);
      if (sequence !== loadSequence.current) return;
      if (!value) throw new Error(`No existe un prompt con el ID ${id}.`);
      setRecord(value);
      setDraft(normalizePrompt(value, id));
    } catch (err) {
      if (sequence !== loadSequence.current) return;
      setRecord(null);
      setDraft(null);
      setError(err.message);
    } finally {
      if (sequence === loadSequence.current) setFetching(false);
    }
  }
  useEffect(() => {
    load(selectedId);
    return () => { loadSequence.current++; };
  }, [selectedId]);
  useEffect(() => {
    if (tab === "json" && draft)
      setJson(JSON.stringify(cleanResource(draft), null, 2));
  }, [tab, draft?.id]);
  function select(id) {
    if (
      dirty &&
      !window.confirm(
        "Hay cambios sin guardar. ¿Querés descartarlos y abrir otro prompt?",
      )
    )
      return;
    setTab("content");
    navigate(`/prompts/${encodeURIComponent(id)}`);
  }
  async function perform(action) {
    setPending(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }
  async function save() {
    await perform(async () => {
      const saved = await savePrompt(serializePrompt(draft), {
        expectedRevision: record._studio?.revision || 0,
      });
      setRecord(saved);
      setDraft(normalizePrompt(saved, saved.id));
      notify("Prompt guardado en Firebase.");
    });
  }
  function duplicate(value) {
    setCreate({
      id: `${value.id.slice(0, 90)}_COPIA`,
      description: value.descripcion || "",
      type: value.tipo_prompt || "detector",
      source: value,
    });
  }
  const sectionChange = (key, field, value) =>
    setDraft((previous) => ({
      ...previous,
      [key]: { ...previous[key], [field]: value },
    }));
  return (
    <>
      <div className="studio-page-heading">
        <div>
          <p className="studio-eyebrow">INSTRUCCIONES DEL ASISTENTE</p>
          <h1>
            Biblioteca de prompts
            <span className="studio-title-count">
              {loading
                ? "—"
                : prompts.filter((item) => !item._studio?.deleted).length}
            </span>
          </h1>
          <p>
            Organizá, editá y versioná las instrucciones que utiliza tu backend.
          </p>
        </div>
        <div className="studio-heading-actions">
          <button
            className="studio-button secondary"
            onClick={() => importRef.current?.click()}
          >
            <Icon name="download" size={16} />
            Importar JSON
          </button>
          <button
            className="studio-button"
            onClick={() =>
              setCreate({
                id: "",
                description: "",
                type: "detector",
                source: null,
              })
            }
          >
            <Icon name="plus" size={16} />
            Nuevo prompt
          </button>
        </div>
      </div>
      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) =>
          perform(async () => {
            const file = event.target.files[0];
            if (!file) return;
            if (file.size > 800000)
              throw new Error("El archivo supera los 800 KB.");
            const value = JSON.parse(await file.text());
            const normalized = normalizePrompt(
              value,
              value.id || "PROMPT_IMPORTADO",
            );
            setCreate({
              id: normalized.id,
              description: normalized.descripcion,
              type: normalized.tipo_prompt,
              source: normalized,
            });
            event.target.value = "";
          })
        }
      />
      <PromptReadNotice />
      {error && (
        <div className="studio-alert error" role="alert">
          <p>{error}</p>
          <button
            className="studio-icon-button"
            onClick={() => setError("")}
            aria-label="Cerrar error"
          >
            ×
          </button>
        </div>
      )}
      <div className="studio-prompt-layout">
        <aside className="studio-panel studio-library-panel">
          <div className="studio-library-search">
            <Icon name="search" size={17} />
            <input
              aria-label="Filtrar biblioteca"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por ID o descripción"
            />
          </div>
          <div className="studio-library-filters">
            <select
              aria-label="Filtrar por tipo"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="all">Todos los tipos</option>
              {Object.entries(types).map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
            </select>
            <button
              className={`studio-trash-filter ${trash ? "active" : ""}`}
              onClick={() => setTrash(!trash)}
              title={trash ? "Volver a la biblioteca" : "Ver papelera"}
              aria-label={trash ? "Volver a la biblioteca" : "Ver papelera"}
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
          <div className="studio-library-count">
            {trash ? "PAPELERA" : "TODOS LOS PROMPTS"}{" "}
            <span>{visible.length}</span>
          </div>
          <div className="studio-prompt-list">
            {visible.map((item) => (
              <button
                key={item.id}
                className={`studio-prompt-list-item ${selectedId === item.id ? "selected" : ""}`}
                onClick={() => select(item.id)}
              >
                <div>
                  <span
                    className={`studio-prompt-dot ${item.tipo_prompt || "detector"}`}
                  />
                  <strong>{item.id}</strong>
                  <Icon name="arrow" size={13} />
                </div>
                <p>{item.descripcion || "Sin descripción"}</p>
                <footer>
                  <span className="studio-tag small">
                    {types[item.tipo_prompt] || "Detector"}
                  </span>
                  <small>
                    {item._studio?.revision
                      ? `v${item._studio.revision}`
                      : "Original"}
                  </small>
                </footer>
              </button>
            ))}
            {!visible.length && (
              <div className="studio-inline-empty">
                {loading
                  ? "Cargando prompts…"
                  : "No encontramos coincidencias."}
                {search && (
                  <button
                    className="studio-text-button"
                    onClick={() => select(search.trim())}
                  >
                    Abrir este ID
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="studio-library-footer">
            <span className="studio-online-dot" />
            Los cambios se guardan en Firebase
          </div>
        </aside>
        <section className="studio-panel studio-editor-panel">
          {fetching ? (
            <div className="studio-loading">Cargando el prompt…</div>
          ) : !draft ? (
            <EmptyState title="Dale una voz a tu asistente">
              Elegí un prompt de la biblioteca o creá uno nuevo para editar sus
              instrucciones.
              <div className="studio-empty-code">
                HANDLER0 → intención → acción
              </div>
            </EmptyState>
          ) : (
            <>
              <div className="studio-editor-heading">
                <div>
                  <div className="studio-editor-kicker">
                    <span
                      className={`studio-tag ${(draft.tipo_prompt || "detector") === "conversacional" ? "purple" : "blue"}`}
                    >
                      {types[draft.tipo_prompt] || "Detector"}
                    </span>
                    <span
                      className={`studio-save-state ${dirty ? "dirty" : ""}`}
                    >
                      <i />
                      {dirty
                        ? "Cambios sin guardar"
                        : `Guardado${record._studio?.revision ? ` · v${record._studio.revision}` : ""}`}
                    </span>
                  </div>
                  <h2>{draft.id}</h2>
                  <p>
                    {record._studio?.deleted
                      ? "Este prompt está en la papelera. Podés restaurarlo."
                      : "Las instrucciones se mantienen compatibles con tu backend actual."}
                  </p>
                </div>
                <div className="studio-editor-actions">
                  <button
                    className="studio-icon-button"
                    aria-label="Duplicar prompt"
                    title="Duplicar"
                    onClick={() => duplicate(draft)}
                  >
                    <Icon name="copy" size={17} />
                  </button>
                  <button
                    className="studio-icon-button"
                    aria-label="Exportar prompt"
                    title="Exportar JSON"
                    onClick={() =>
                      downloadJson(
                        cleanResource(serializePrompt(draft)),
                        `${draft.id}.json`,
                      )
                    }
                  >
                    <Icon name="download" size={17} />
                  </button>
                  <button
                    className="studio-icon-button danger"
                    aria-label={
                      record._studio?.deleted
                        ? "Restaurar prompt"
                        : "Enviar prompt a papelera"
                    }
                    title={record._studio?.deleted ? "Restaurar" : "Papelera"}
                    disabled={pending}
                    onClick={() =>
                      perform(async () => {
                        const deleted = !record._studio?.deleted;
                        const value = await trashPrompt(record.id, deleted);
                        setRecord(value);
                        setDraft(normalizePrompt(value, value.id));
                        notify(
                          deleted
                            ? "Prompt enviado a la papelera."
                            : "Prompt restaurado.",
                        );
                      })
                    }
                  >
                    <Icon
                      name={record._studio?.deleted ? "refresh" : "trash"}
                      size={17}
                    />
                  </button>
                  <button
                    className="studio-button"
                    disabled={pending || !dirty || record._studio?.deleted}
                    onClick={save}
                  >
                    <Icon name="check" size={16} />
                    {pending ? "Guardando…" : "Guardar cambios"}
                  </button>
                  {!record._studio?.deleted && (
                    <button
                      type="button"
                      className="studio-button secondary"
                      disabled={dirty || pending}
                      title={dirty ? "Guardá el prompt para probarlo" : undefined}
                      onClick={() => navigate(`/whatsapp?prompt=${encodeURIComponent(record.id)}`)}
                    >
                      Probar en WhatsApp
                    </button>
                  )}
                </div>
              </div>
              <nav
                className="studio-editor-tabs"
                aria-label="Secciones del prompt"
              >
                {[
                  ["content", "Contenido"],
                  ["rules", "Reglas particulares"],
                  ["preview", "Vista previa"],
                  ["json", "JSON"],
                  ["history", "Versiones"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    className={tab === id ? "active" : ""}
                    onClick={() => setTab(id)}
                  >
                    {label}
                    {id === "rules" && (
                      <small>
                        {draft.reglas_particulares.parametros.length}
                      </small>
                    )}
                  </button>
                ))}
              </nav>
              <fieldset
                className="studio-prompt-fields"
                disabled={pending || record._studio?.deleted}
              >
                {tab === "content" && (
                  <>
                    <div className="studio-editor-description">
                      <label>
                        Descripción
                        <textarea
                          rows={2}
                          value={draft.descripcion}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              descripcion: event.target.value,
                            })
                          }
                          placeholder="¿Para qué se usa este prompt?"
                        />
                      </label>
                    </div>
                    <div className="studio-form-grid three">
                      <label>
                        Tipo de prompt
                        <select
                          value={draft.tipo_prompt}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              tipo_prompt: event.target.value,
                            })
                          }
                        >
                          {Object.entries(types).map(([id, label]) => (
                            <option key={id} value={id}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Modelo
                        <input
                          value={draft.model}
                          onChange={(event) =>
                            setDraft({ ...draft, model: event.target.value })
                          }
                          placeholder="Definido por el backend"
                        />
                      </label>
                      <label>
                        Temperatura
                        <input
                          type="number"
                          min="0"
                          max="2"
                          step="0.1"
                          value={draft.temperature}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              temperature: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                    <label className="studio-system-field">
                      Rol de sistema
                      <input
                        value={draft.system}
                        onChange={(event) =>
                          setDraft({ ...draft, system: event.target.value })
                        }
                      />
                    </label>
                    {PROMPT_SECTIONS.map(([key, title, help], index) => (
                      <details
                        className="studio-prompt-section"
                        key={`${draft.id}-${key}`}
                        open={index < 2 ? true : undefined}
                      >
                        <summary>
                          <span>
                            <span className="studio-section-number">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <strong>{title}</strong>
                            <small>
                              {draft[key].contenido
                                ? `${draft[key].contenido.length} caracteres`
                                : "Sin completar"}
                            </small>
                          </span>
                          <span>⌄</span>
                        </summary>
                        <p>{help}</p>
                        <label>
                          Título del bloque
                          <input
                            value={draft[key].titulo}
                            onChange={(event) =>
                              sectionChange(key, "titulo", event.target.value)
                            }
                            placeholder={title}
                          />
                        </label>
                        <label>
                          Instrucciones
                          <textarea
                            rows={7}
                            value={draft[key].contenido}
                            onChange={(event) =>
                              sectionChange(
                                key,
                                "contenido",
                                event.target.value,
                              )
                            }
                            placeholder="Escribí las instrucciones de este bloque…"
                            spellCheck="false"
                          />
                        </label>
                      </details>
                    ))}
                  </>
                )}
                {tab === "rules" && (
                  <>
                    <div className="studio-section-intro">
                      <h3>Reglas particulares</h3>
                      <p>
                        Definí las intenciones o parámetros y las instrucciones
                        para cada caso.
                      </p>
                    </div>
                    <div className="studio-form-grid">
                      <label>
                        Título del bloque
                        <input
                          value={draft.reglas_particulares.titulo}
                          onChange={(event) =>
                            sectionChange(
                              "reglas_particulares",
                              "titulo",
                              event.target.value,
                            )
                          }
                        />
                      </label>
                      <label className="studio-checkbox">
                        <input
                          type="checkbox"
                          checked={draft.reglas_particulares.activo !== false}
                          onChange={(event) =>
                            sectionChange(
                              "reglas_particulares",
                              "activo",
                              event.target.checked,
                            )
                          }
                        />
                        Incluir estas reglas en el prompt
                      </label>
                    </div>
                    {draft.reglas_particulares.parametros.map((item, index) => (
                      <div className="studio-parameter" key={index}>
                        <div className="studio-parameter-heading">
                          <span>
                            REGLA {String(index + 1).padStart(2, "0")}
                          </span>
                          <button
                            className="studio-icon-button danger"
                            aria-label={`Eliminar regla ${index + 1}`}
                            onClick={() =>
                              sectionChange(
                                "reglas_particulares",
                                "parametros",
                                draft.reglas_particulares.parametros.filter(
                                  (_, i) => i !== index,
                                ),
                              )
                            }
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        </div>
                        <label>
                          Intención o parámetro
                          <input
                            value={item.nombre || ""}
                            onChange={(event) =>
                              sectionChange(
                                "reglas_particulares",
                                "parametros",
                                draft.reglas_particulares.parametros.map(
                                  (value, i) =>
                                    i === index
                                      ? { ...value, nombre: event.target.value }
                                      : value,
                                ),
                              )
                            }
                            placeholder="Ej.: nueva_reserva"
                          />
                        </label>
                        <label>
                          Instrucciones
                          <textarea
                            rows={4}
                            value={item.regla || ""}
                            onChange={(event) =>
                              sectionChange(
                                "reglas_particulares",
                                "parametros",
                                draft.reglas_particulares.parametros.map(
                                  (value, i) =>
                                    i === index
                                      ? { ...value, regla: event.target.value }
                                      : value,
                                ),
                              )
                            }
                          />
                        </label>
                      </div>
                    ))}
                    <button
                      className="studio-button secondary"
                      onClick={() =>
                        sectionChange("reglas_particulares", "parametros", [
                          ...draft.reglas_particulares.parametros,
                          { nombre: "", regla: "" },
                        ])
                      }
                    >
                      <Icon name="plus" size={16} />
                      Agregar regla
                    </button>
                  </>
                )}
                {tab === "preview" && (
                  <>
                    <div className="studio-section-intro">
                      <h3>Vista previa de instrucciones</h3>
                      <p>
                        Lectura de los bloques configurados. Las variables se
                        muestran sin resolver y no se ejecuta el modelo.
                      </p>
                    </div>
                    <div className="studio-preview-meta">
                      <span>
                        {preview.trim()
                          ? preview.trim().split(/\s+/).length
                          : 0}{" "}
                        palabras
                      </span>
                      <span>{preview.length} caracteres</span>
                      <span>
                        {draft.reglas_particulares.parametros.length} reglas
                      </span>
                    </div>
                    <pre className="studio-prompt-preview">
                      {preview ||
                        "Agregá instrucciones en Contenido o Reglas particulares para ver la vista previa."}
                    </pre>
                  </>
                )}
                {tab === "json" && (
                  <>
                    <div className="studio-section-intro">
                      <h3>Edición avanzada</h3>
                      <p>
                        Los campos adicionales del documento original se
                        conservan. Aplicá el JSON y después guardá los cambios.
                      </p>
                    </div>
                    <textarea
                      className="studio-json"
                      rows={24}
                      value={json}
                      onChange={(event) => setJson(event.target.value)}
                      spellCheck="false"
                      aria-label="JSON del prompt"
                    />
                    <button
                      className="studio-button secondary"
                      onClick={() => {
                        try {
                          const value = serializePrompt(JSON.parse(json));
                          if (value.id !== record.id)
                            throw new Error(
                              "Para cambiar el ID, duplicá el prompt.",
                            );
                          setDraft({
                            ...normalizePrompt(value),
                            _studio: record._studio,
                          });
                          setError("");
                          notify(
                            "JSON aplicado al editor. Falta guardar los cambios.",
                          );
                        } catch (err) {
                          setError(err.message);
                        }
                      }}
                    >
                      Aplicar JSON al editor
                    </button>
                  </>
                )}
                {tab === "history" && (
                  <>
                    <div className="studio-section-intro">
                      <h3>Versiones anteriores</h3>
                      <p>
                        Se conservan hasta cinco versiones. Restaurar carga el
                        contenido en el editor; guardalo para aplicarlo.
                      </p>
                    </div>
                    {(record._studioHistory || []).map((item, index) => (
                      <div className="studio-history-row" key={index}>
                        <span className="studio-history-icon">
                          <Icon name="clock" size={18} />
                        </span>
                        <div>
                          <strong>
                            {item.revision
                              ? `Versión ${item.revision}`
                              : "Versión original"}
                          </strong>
                          <small>{dateLabel(item.savedAt)}</small>
                        </div>
                        <button
                          className="studio-button secondary"
                          onClick={() => {
                            setDraft({
                              ...normalizePrompt(item.data, record.id),
                              _studio: record._studio,
                            });
                            setTab("content");
                            notify(
                              "Versión cargada en el editor. Guardá para restaurarla.",
                            );
                          }}
                        >
                          Restaurar
                        </button>
                      </div>
                    ))}
                    {!record._studioHistory?.length && (
                      <EmptyState
                        icon="clock"
                        title="El historial comienza con tu próximo cambio"
                      >
                        Al guardar una modificación se conservará el contenido
                        anterior.
                      </EmptyState>
                    )}
                  </>
                )}
              </fieldset>
              <div className="studio-editor-footer">
                <span>
                  <Icon name="clock" size={14} />
                  {dateLabel(record._studio?.updatedAt)}
                </span>
                <span>ID: {record.id}</span>
              </div>
            </>
          )}
        </section>
      </div>
      {create && (
        <Modal
          title={
            create.source ? "Duplicar o importar prompt" : "Crear un prompt"
          }
          onClose={() => setCreate(null)}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              perform(async () => {
                const id = resourceId(create.id);
                const candidate = serializePrompt({
                  ...cleanResource(create.source || {}),
                  id,
                  descripcion: create.description,
                  tipo_prompt: create.type,
                });
                await savePrompt(candidate, { create: true });
                setCreate(null);
                setTrash(false);
                navigate(`/prompts/${encodeURIComponent(id)}`);
                notify("Prompt creado. Ya podés editar sus instrucciones.");
              });
            }}
          >
            <p className="studio-modal-description">
              Usá un ID que tu backend pueda referenciar, por ejemplo HANDLER4 o
              RESPUESTA_BIENVENIDA.
            </p>
            <label>
              ID del prompt
              <input
                autoFocus
                value={create.id}
                onChange={(event) =>
                  setCreate({ ...create, id: event.target.value })
                }
                placeholder="NUEVO_PROMPT"
                required
              />
            </label>
            <label>
              Descripción
              <input
                value={create.description}
                onChange={(event) =>
                  setCreate({ ...create, description: event.target.value })
                }
                placeholder="Objetivo de este prompt"
              />
            </label>
            <label>
              Tipo
              <select
                value={create.type}
                onChange={(event) =>
                  setCreate({ ...create, type: event.target.value })
                }
              >
                {Object.entries(types).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {error && <p className="studio-inline-error">{error}</p>}
            <div className="studio-modal-actions">
              <button
                type="button"
                className="studio-button secondary"
                onClick={() => setCreate(null)}
              >
                Cancelar
              </button>
              <button
                className="studio-button"
                disabled={pending || !create.id.trim()}
              >
                {pending ? "Creando…" : "Crear y editar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
