// HandlerPromptIAForm.jsx

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, authReady } from "./firebase";
import "./DepartamentoEditor.css";
import { useSearchParams } from "react-router-dom";

// Modelo por defecto para cada sección
const defaultParam = () => ({ nombre: "", regla: "" });

const defaultPromptConfig = () => ({
  id: "",
  descripcion: "",
  system: "",
  temperature: 0.7,
  rol_principal: { titulo: "", contenido: "" },
  contexto: { titulo: "", contenido: "" },
  formato: { titulo: "", contenido: "" },
  reglas_particulares: {
    titulo: "",
    parametros: [],
    activo: true
  },
  historial: { titulo: "", contenido: "" },
  directrices_calidad: { titulo: "", contenido: "" },
  reglas_salida: { titulo: "", contenido: "" },
  manejo_excepciones: { titulo: "", contenido: "" }
});

// Textos explicativos
const EXPLICA = {
  rol_principal: `Este componente le dice a la IA cuál es el rol o función principal que debe asumir para responder al usuario (por ejemplo: "Asistente de reservas experimentado", "Experto inmobiliario", etc.). Aquí se describe el objetivo general de la IA en este contexto.`,
  contexto: `Enmarcado (Framing): El concepto de "framing" o enmarcado consiste en proporcionar a la IA todo el contexto y la información necesarios para generar una respuesta satisfactoria, reduciendo la ambigüedad. Al establecer reglas claras sobre cómo debe responder, estás "enmarcando" la conversación para guiar a la IA hacia el resultado deseado y evitar respuestas genéricas o inútiles.`,
  formato: `Este componente le dice a la IA cómo debe presentar la información. Las reglas como el tono de voz (profesional, casual), la longitud de la respuesta o cómo debe estructurarse (párrafo, lista) son todas especificaciones de formato.`,
  reglas_particulares: `Conjunto de parámetros que la IA debe identificar o almacenar. Esta sección es para procesos de extracción de datos, detección de intenciones, etc. Cada parámetro debe acompañarse con reglas específicas que debe considerar para lograr el objetivo. Ejemplo: "ver_mas_info": Elige esta si el usuario hace una pregunta sobre la propiedad. Por ejemplo: "¿dónde está ubicada?", "¿qué servicios tiene?", "contame más".`,
  directrices_calidad: `Directrices de calidad (Quality Guidelines): El prompt debe incluir explícitamente una sección de "Quality Guidelines" (Directrices de Calidad) y "Response Requirements" (Requisitos de Respuesta). Estas secciones listan criterios que la respuesta de la IA debe cumplir, como "priorizar la precisión y relevancia", "mantener la coherencia" y "asegurar claridad y valor práctico". Establecer los estándares de calidad para la respuesta de la IA.`,
  historial: `Esta sección se utiliza cuando el bot requiere hilar una conversación iniciada, por ejemplo para mantener el contexto entre varias interacciones. Para incorporar variables dinámicas al texto, utilizá la sintaxis {{variable}} (formato mustache).`,
  reglas_salida: " ",
  manejo_excepciones: `En esta sección le damos a la IA las instrucciones de cómo tiene que proceder cuando no puede obtener la información o no puede devolver una respuesta en el contexto de su misión.`
};

function normalizePromptConfig(data) {
  const def = defaultPromptConfig();
  return {
    ...def,
    ...data,
    rol_principal: { ...def.rol_principal, ...(data.rol_principal || {}) },
    contexto: { ...def.contexto, ...(data.contexto || {}) },
    formato: { ...def.formato, ...(data.formato || {}) },
    reglas_particulares: { ...def.reglas_particulares, ...(data.reglas_particulares || {}) },
    historial: { ...def.historial, ...(data.historial || {}) },
    directrices_calidad: { ...def.directrices_calidad, ...(data.directrices_calidad || {}) },
    reglas_salida: { ...def.reglas_salida, ...(data.reglas_salida || {}) },
    manejo_excepciones: { ...def.manejo_excepciones, ...(data.manejo_excepciones || {}) }
  };
}

function PromptIAForm({ docId }) {
  const [config, setConfig] = useState(null);
  const [nuevoParametro, setNuevoParametro] = useState(defaultParam());

  useEffect(() => {
    async function fetchConfig() {
      await authReady;
      if (!docId) return;
      const refDoc = doc(db, "configuracion_prompts_IA", docId);
      const snap = await getDoc(refDoc);
      if (snap.exists()) {
        setConfig(normalizePromptConfig(snap.data()));
      } else {
        setConfig({ ...defaultPromptConfig(), id: docId });
      }
    }
    fetchConfig();
  }, [docId]);

  // Helpers básicos
  const handleChange = (field, value) => setConfig(prev => ({ ...prev, [field]: value }));
  const handleSectionChange = (section, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value }
    }));
  };

  // REGLAS PARTICULARES (parametros)
  const handleParametroChange = (idx, field, value) => {
    setConfig(prev => {
      const nuevos = [...(prev.reglas_particulares.parametros || [])];
      nuevos[idx][field] = value;
      return {
        ...prev,
        reglas_particulares: { ...prev.reglas_particulares, parametros: nuevos }
      };
    });
  };
  const agregarParametro = () => {
    if (!nuevoParametro.nombre && !nuevoParametro.regla) return;
    setConfig(prev => ({
      ...prev,
      reglas_particulares: {
        ...prev.reglas_particulares,
        parametros: [...(prev.reglas_particulares.parametros || []), nuevoParametro]
      }
    }));
    setNuevoParametro(defaultParam());
  };
  const eliminarParametro = idx => {
    setConfig(prev => {
      const nuevos = [...(prev.reglas_particulares.parametros || [])];
      nuevos.splice(idx, 1);
      return {
        ...prev,
        reglas_particulares: { ...prev.reglas_particulares, parametros: nuevos }
      };
    });
  };

  // Guardar en Firestore
  const guardarCambios = async () => {
    if (!config.id) return alert("El campo id es obligatorio");
    try {
      const refDoc = doc(db, "configuracion_prompts_IA", config.id);
      await setDoc(refDoc, config, { merge: true });
      alert("Guardado!");
    } catch (e) {
      alert("Error al guardar configuración");
      console.error(e);
    }
  };

  if (!config) return <div>Cargando...</div>;

  return (
    <div className="container">
      <div className="card">

        <h2>Prompt Configuración</h2>
        <label>ID</label>
        <input
          className="prompt-field"
          value={config.id} onChange={e => handleChange("id", e.target.value)} />

        <label>Descripción</label>
        <textarea value={config.descripcion} onChange={e => handleChange("descripcion", e.target.value)} />
        <label>System</label>
        <label>Tipo de prompt</label>
        <select
          value={config.tipo_prompt || ""}
          onChange={e => handleChange("tipo_prompt", e.target.value)}
        >
          <option value="">Seleccionar tipo...</option>
          <option value="conversacional">Conversacional</option>
          <option value="detector">Detector</option>
          <option value="extractor">Extractor</option>
        </select>
        <input
          className="prompt-field"
          placeholder="System"
          value={config.system || ""}
          onChange={e => setConfig(prev => ({ ...prev, system: e.target.value }))} />
        <label>Temperature</label>
        <input
          className="prompt-field"
          type="number"
          step="0.01"
          min="0"
          max="2"
          placeholder="Ej: 0.7"
          value={config.temperature ?? ""}
          onChange={e => setConfig(prev => ({
            ...prev,
            temperature: e.target.value === "" ? "" : Number(e.target.value)
          }))} />
        <h3>Rol principal</h3>
        <div className="explicacion">{EXPLICA.rol_principal}</div>
        <input
          placeholder="Título en el prompt"
          value={config.rol_principal.titulo}
          onChange={e => handleSectionChange("rol_principal", "titulo", e.target.value)}
        />
        <textarea
          placeholder="Contenido"
          value={config.rol_principal.contenido}
          onChange={e => handleSectionChange("rol_principal", "contenido", e.target.value)}
        />

        <h3>Contexto (Framing)</h3>
        <div className="explicacion">{EXPLICA.contexto}</div>
        <input
          placeholder="Título en el prompt"
          value={config.contexto.titulo}
          onChange={e => handleSectionChange("contexto", "titulo", e.target.value)}
        />
        <textarea
          placeholder="Contenido"
          value={config.contexto.contenido}
          onChange={e => handleSectionChange("contexto", "contenido", e.target.value)}
        />

        <h3>Especificaciones de formato</h3>
        <div className="explicacion">{EXPLICA.formato}</div>
        <input
          placeholder="Título en el prompt"
          value={config.formato.titulo}
          onChange={e => handleSectionChange("formato", "titulo", e.target.value)}
        />
        <textarea
          placeholder="Contenido"
          value={config.formato.contenido}
          onChange={e => handleSectionChange("formato", "contenido", e.target.value)}
        />
        <h3>Reglas particulares</h3>
        <div className="explicacion">{EXPLICA.reglas_particulares}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 12px 0" }}>
          <label style={{ fontWeight: 600 }}>¿Activar esta sección?</label>
          <select
            value={config.reglas_particulares.activo ? "si" : "no"}
            onChange={e =>
              setConfig(prev => ({
                ...prev,
                reglas_particulares: { ...prev.reglas_particulares, activo: e.target.value === "si" }
              }))
            }
            style={{ width: 60, minWidth: 60 }}
          >
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </div>
        <input
          placeholder="Título en el prompt"
          value={config.reglas_particulares.titulo}
          onChange={e => setConfig(prev => ({
            ...prev,
            reglas_particulares: { ...prev.reglas_particulares, titulo: e.target.value }
          }))}
        />
        <div className="caracteristicas-lista">
          {(config.reglas_particulares.parametros || []).map((param, idx) => (
            <div key={idx} className="parametro-item">
              <label>Parámetro</label>
              <input
                className="parametro-nombre"
                placeholder="Parámetro"
                value={param.nombre}
                onChange={e => handleParametroChange(idx, "nombre", e.target.value)}
              />
              <label>Regla de parámetro</label>
              <textarea
                className="parametro-regla"
                placeholder="Regla de parámetro"
                value={param.regla}
                onChange={e => handleParametroChange(idx, "regla", e.target.value)}
              />
              <button className="delete-button" onClick={() => eliminarParametro(idx)}>✖</button>
            </div>
          ))}
          <div className="parametro-item">
            <label>Parámetro</label>
            <input
              className="parametro-nombre"
              placeholder="Nuevo parámetro"
              value={nuevoParametro.nombre}
              onChange={e => setNuevoParametro(p => ({ ...p, nombre: e.target.value }))}
            />
            <label>Regla de parámetro</label>
            <textarea
              className="parametro-regla"
              placeholder="Regla para el parámetro"
              value={nuevoParametro.regla}
              onChange={e => setNuevoParametro(p => ({ ...p, regla: e.target.value }))}
            />
            <button onClick={agregarParametro}>+ Agregar</button>
          </div>
        </div>
        {/* -------- SECCIÓN HISTORIAL -------- */}
        <h3>Historial</h3>
        <div className="explicacion">{EXPLICA.historial}</div>
        <input
          placeholder="Título en el prompt"
          value={config.historial?.titulo || ""}
          onChange={e => setConfig(prev => ({
            ...prev,
            historial: { ...(prev.historial || {}), titulo: e.target.value }
          }))}
        />
        <textarea
          placeholder="Contenido"
          value={config.historial?.contenido || ""}
          onChange={e => setConfig(prev => ({
            ...prev,
            historial: { ...(prev.historial || {}), contenido: e.target.value }
          }))}
        />
        <h3>Directrices de calidad</h3>
        <div className="explicacion">{EXPLICA.directrices_calidad}</div>
        <input
          placeholder="Título en el prompt"
          value={config.directrices_calidad.titulo}
          onChange={e => handleSectionChange("directrices_calidad", "titulo", e.target.value)}
        />
        <textarea
          placeholder="Contenido"
          value={config.directrices_calidad.contenido}
          onChange={e => handleSectionChange("directrices_calidad", "contenido", e.target.value)}
        />
        <h3>Reglas de Salida</h3>
        <div className="explicacion">{EXPLICA.reglas_salida}</div>
        <input
          placeholder="Título en el prompt"
          value={config.reglas_salida.titulo}
          onChange={e => handleSectionChange("reglas_salida", "titulo", e.target.value)}
        />
        <textarea
          placeholder="Contenido"
          value={config.reglas_salida.contenido}
          onChange={e => handleSectionChange("reglas_salida", "contenido", e.target.value)}
        />

        <h3>Manejo de excepciones</h3>
        <div className="explicacion">{EXPLICA.manejo_excepciones}</div>
        <input
          placeholder="Título en el prompt"
          value={config.manejo_excepciones.titulo}
          onChange={e => handleSectionChange("manejo_excepciones", "titulo", e.target.value)}
        />
        <textarea
          placeholder="Contenido"
          value={config.manejo_excepciones.contenido}
          onChange={e => handleSectionChange("manejo_excepciones", "contenido", e.target.value)}
        />

        <button onClick={guardarCambios}>Guardar</button>
      </div>
    </div >
  );
}

export default function IAConfiguration() {
  const [params] = useSearchParams();
  const docId = params.get("id");
  if (!docId) return <div>Falta parámetro ?id=</div>;
  return <PromptIAForm docId={docId} />;
}
