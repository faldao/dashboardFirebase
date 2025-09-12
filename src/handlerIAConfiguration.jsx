// HandlerIAConfiguration.jsx

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import "./DepartamentoEditor.css";
import { useSearchParams } from "react-router-dom";

// --- Modelos por default (usados para normalización)
const defaultDatoClave = () => ({ key: "", descripcion: "" });
const defaultIntencion = () => ({
  id: "",
  descripcion: "",
  reglas_deteccion: [""],
  mision_deteccion: "",
  mision_conversacional: "",
  reglas_conversacion: [""],
  parametros_necesarios: []
});

// --- Normalización de config para soportar documentos viejos ---
function normalizeConfig(data) {
  // Normaliza datos_clave a array [{key, descripcion}]
  let datosClave = data.contexto?.datos_clave;
  if (!Array.isArray(datosClave)) {
    datosClave = Object.entries(datosClave || {}).map(([key, descripcion]) => (
      typeof descripcion === 'object'
        ? descripcion
        : { key, descripcion }
    ));
  }
  // Normaliza intenciones, agregando campos si faltan
  const intenciones = (data.intenciones || []).map((intencion) => ({
    ...defaultIntencion(),
    ...intencion,
    reglas_conversacion: intencion.reglas_conversacion ?? [""],
    mision_deteccion: intencion.mision_deteccion ?? "",
    mision_conversacional: intencion.mision_conversacional ?? (intencion.mision_conversacional || "")
  }));
  return {
    ...data,
    contexto: { ...data.contexto, datos_clave: datosClave },
    intenciones
  };
}

// --- Formulario de edición de handler ---
function ConfiguracionHandlerForm({ handlerId }) {
  const [config, setConfig] = useState(null);
  const [nuevoDatoClave, setNuevoDatoClave] = useState(defaultDatoClave());
  const [nuevaIntencion, setNuevaIntencion] = useState(defaultIntencion());

  useEffect(() => {
    async function fetchConfig() {
      try {
        if (!handlerId) return;
        const refDoc = doc(db, "configuracion_handlers", handlerId);
        const snap = await getDoc(refDoc);
        if (snap.exists()) {
          const data = normalizeConfig(snap.data());
          setConfig(data);
        } else {
          setConfig({
            handler_name: handlerId,
            descripcion: "",
            prompts_base: { detector_intencion: "", generador_respuesta: "" },
            contexto: {
              general: "",
              datos_clave: []
            },
            intenciones: [],
            reglas_globales: {
              salida_critica_deteccion: "",
              manejo_ninguna_intencion: ""
            }
          });
        }
      } catch (e) {
        console.error("Error al cargar configuración handler:", e);
      }
    }
    fetchConfig();
  }, [handlerId]);

  // --- Helpers de datos_clave (array) ---
  const handleDatoClaveChange = (idx, field, value) => {
    setConfig(prev => {
      const nuevos = [...(prev.contexto.datos_clave || [])];
      nuevos[idx][field] = value;
      return { ...prev, contexto: { ...prev.contexto, datos_clave: nuevos } };
    });
  };
  const agregarDatoClave = () => {
    if (!nuevoDatoClave.key) return;
    setConfig(prev => ({
      ...prev,
      contexto: {
        ...prev.contexto,
        datos_clave: [...(prev.contexto.datos_clave || []), nuevoDatoClave]
      }
    }));
    setNuevoDatoClave(defaultDatoClave());
  };
  const eliminarDatoClave = idx => {
    setConfig(prev => {
      const nuevos = [...(prev.contexto.datos_clave || [])];
      nuevos.splice(idx, 1);
      return { ...prev, contexto: { ...prev.contexto, datos_clave: nuevos } };
    });
  };

  // --- Helpers generales ---
  const handleChange = (field, value) => setConfig(prev => ({ ...prev, [field]: value }));
  const handlePromptChange = (k, v) => setConfig(prev => ({
    ...prev,
    prompts_base: { ...prev.prompts_base, [k]: v }
  }));
  const handleContextoChange = (k, v) => setConfig(prev => ({
    ...prev,
    contexto: { ...prev.contexto, [k]: v }
  }));
  const handleReglasGlobalesChange = (k, v) => setConfig(prev => ({
    ...prev,
    reglas_globales: { ...prev.reglas_globales, [k]: v }
  }));

  // --- Helpers para intenciones ---
  const handleIntencionChange = (idx, key, value) => {
    setConfig(prev => {
      const nuevas = [...prev.intenciones];
      nuevas[idx][key] = value;
      return { ...prev, intenciones: nuevas };
    });
  };
  // reglas_deteccion
  const handleIntencionReglaChange = (idx, reglaIdx, value) => {
    setConfig(prev => {
      const nuevas = [...prev.intenciones];
      nuevas[idx].reglas_deteccion[reglaIdx] = value;
      return { ...prev, intenciones: nuevas };
    });
  };
  const agregarReglaAIntencion = idx => setConfig(prev => {
    const nuevas = [...prev.intenciones];
    nuevas[idx].reglas_deteccion.push("");
    return { ...prev, intenciones: nuevas };
  });
  const eliminarReglaDeIntencion = (idx, reglaIdx) => setConfig(prev => {
    const nuevas = [...prev.intenciones];
    nuevas[idx].reglas_deteccion.splice(reglaIdx, 1);
    return { ...prev, intenciones: nuevas };
  });
  // reglas_conversacion
  const handleIntencionReglaConvChange = (idx, reglaIdx, value) => {
    setConfig(prev => {
      const nuevas = [...prev.intenciones];
      nuevas[idx].reglas_conversacion[reglaIdx] = value;
      return { ...prev, intenciones: nuevas };
    });
  };
  const agregarReglaConvAIntencion = idx => setConfig(prev => {
    const nuevas = [...prev.intenciones];
    nuevas[idx].reglas_conversacion.push("");
    return { ...prev, intenciones: nuevas };
  });
  const eliminarReglaConvDeIntencion = (idx, reglaIdx) => setConfig(prev => {
    const nuevas = [...prev.intenciones];
    nuevas[idx].reglas_conversacion.splice(reglaIdx, 1);
    return { ...prev, intenciones: nuevas };
  });
  // parametros_necesarios
  const handleIntencionParamChange = (idx, paramIdx, value) => setConfig(prev => {
    const nuevas = [...prev.intenciones];
    nuevas[idx].parametros_necesarios[paramIdx] = value;
    return { ...prev, intenciones: nuevas };
  });
  const agregarParametroAIntencion = idx => setConfig(prev => {
    const nuevas = [...prev.intenciones];
    nuevas[idx].parametros_necesarios.push("");
    return { ...prev, intenciones: nuevas };
  });
  const eliminarParametroDeIntencion = (idx, paramIdx) => setConfig(prev => {
    const nuevas = [...prev.intenciones];
    nuevas[idx].parametros_necesarios.splice(paramIdx, 1);
    return { ...prev, intenciones: nuevas };
  });
  // agregar/eliminar intención
  const limpiarNuevaIntencion = () => setNuevaIntencion(defaultIntencion());
  const agregarIntencion = () => {
    if (!nuevaIntencion.id) return;
    setConfig(prev => ({
      ...prev,
      intenciones: [...prev.intenciones, nuevaIntencion]
    }));
    limpiarNuevaIntencion();
  };
  const eliminarIntencion = idx => setConfig(prev => {
    const nuevas = [...prev.intenciones];
    nuevas.splice(idx, 1);
    return { ...prev, intenciones: nuevas };
  });

  // --- Guardar ---
  const guardarCambios = async () => {
    if (!config.handler_name) return alert("handler_name es obligatorio");
    try {
      const refDoc = doc(db, "configuracion_handlers", config.handler_name);
      await setDoc(refDoc, config, { merge: true });
      alert("Guardado!");
      console.log("Guardado en Firestore:", config);
    } catch (e) {
      alert("Error al guardar configuración");
      console.error("Error al guardar en Firestore:", e);
    }
  };

  if (!config) return <div>Cargando...</div>;

  return (
    <div className="container">
      <div className="card">
        <h2>Configuración de Handler</h2>
        <label>Handler name</label>
        <input
          value={config.handler_name}
          onChange={e => handleChange("handler_name", e.target.value)}
        />

        <label>Descripción</label>
        <textarea
          value={config.descripcion}
          onChange={e => handleChange("descripcion", e.target.value)}
        />

        <h3>Prompts base</h3>
        <label>Prompt detector de intención</label>
        <textarea
          value={config.prompts_base.detector_intencion}
          onChange={e => handlePromptChange("detector_intencion", e.target.value)}
        />
        <label>Prompt generador de respuesta</label>
        <textarea
          value={config.prompts_base.generador_respuesta}
          onChange={e => handlePromptChange("generador_respuesta", e.target.value)}
        />

        <h3>Contexto</h3>
        <label>General</label>
        <textarea
          value={config.contexto.general}
          onChange={e => handleContextoChange("general", e.target.value)}
        />
        <div className="caracteristicas-container">
          <label>Datos clave (variable + descripción)</label>
          <div className="caracteristicas-lista">
            {(config.contexto.datos_clave || []).map((dato, idx) => (
              <div key={idx} className="caracteristica-item">
                <input
                  value={dato.key}
                  onChange={e => handleDatoClaveChange(idx, "key", e.target.value)}
                  placeholder="Variable"
                />
                <input
                  value={dato.descripcion}
                  onChange={e => handleDatoClaveChange(idx, "descripcion", e.target.value)}
                  placeholder="Descripción"
                />
                <button
                  className="delete-button"
                  onClick={() => eliminarDatoClave(idx)}
                  title="Eliminar dato"
                >✖</button>
              </div>
            ))}
            <div className="caracteristica-item">
              <input
                value={nuevoDatoClave.key}
                onChange={e => setNuevoDatoClave(dc => ({ ...dc, key: e.target.value }))}
                placeholder="Variable nueva"
              />
              <input
                value={nuevoDatoClave.descripcion}
                onChange={e => setNuevoDatoClave(dc => ({ ...dc, descripcion: e.target.value }))}
                placeholder="Descripción"
              />
              <button onClick={agregarDatoClave}>+ Agregar</button>
            </div>
          </div>
        </div>

        <h3>Intenciones</h3>
        <div className="caracteristicas-lista">
          {(config.intenciones || []).map((intencion, idx) => (
            <div key={idx} className="caracteristica-item" style={{ flexDirection: "column", alignItems: "stretch", borderBottom: "1px solid #eee", marginBottom: 8 }}>
              <b>ID:</b>
              <input value={intencion.id} onChange={e => handleIntencionChange(idx, "id", e.target.value)} />
              <b>Descripción:</b>
              <input value={intencion.descripcion} onChange={e => handleIntencionChange(idx, "descripcion", e.target.value)} />
              <b>Misión de detección:</b>
              <textarea value={intencion.mision_deteccion}
                onChange={e => handleIntencionChange(idx, "mision_deteccion", e.target.value)}
              />
              <b>Misión conversacional:</b>
              <textarea value={intencion.mision_conversacional}
                onChange={e => handleIntencionChange(idx, "mision_conversacional", e.target.value)}
              />

              <b>Reglas de detección:</b>
              {(intencion.reglas_deteccion || []).map((regla, reglaIdx) => (
                <div key={reglaIdx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    value={regla}
                    onChange={e => handleIntencionReglaChange(idx, reglaIdx, e.target.value)}
                  />
                  <button
                    className="delete-button"
                    onClick={() => eliminarReglaDeIntencion(idx, reglaIdx)}
                    title="Eliminar regla"
                  >✖</button>
                </div>
              ))}
              <button onClick={() => agregarReglaAIntencion(idx)}>+ Agregar regla</button>

              <b>Reglas de conversación:</b>
              {(intencion.reglas_conversacion || []).map((regla, reglaIdx) => (
                <div key={reglaIdx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    value={regla}
                    onChange={e => handleIntencionReglaConvChange(idx, reglaIdx, e.target.value)}
                  />
                  <button
                    className="delete-button"
                    onClick={() => eliminarReglaConvDeIntencion(idx, reglaIdx)}
                    title="Eliminar regla de conversación"
                  >✖</button>
                </div>
              ))}
              <button onClick={() => agregarReglaConvAIntencion(idx)}>+ Agregar regla de conversación</button>

              <b>Parámetros necesarios:</b>
              {(intencion.parametros_necesarios || []).map((param, paramIdx) => (
                <div key={paramIdx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    value={param}
                    onChange={e => handleIntencionParamChange(idx, paramIdx, e.target.value)}
                  />
                  <button
                    className="delete-button"
                    onClick={() => eliminarParametroDeIntencion(idx, paramIdx)}
                    title="Eliminar parámetro"
                  >✖</button>
                </div>
              ))}
              <button onClick={() => agregarParametroAIntencion(idx)}>+ Agregar parámetro</button>
              <button className="delete-button" style={{ alignSelf: "flex-end", marginTop: 4 }}
                onClick={() => eliminarIntencion(idx)}
                title="Eliminar intención">Eliminar intención</button>
            </div>
          ))}
        </div>
        <div className="caracteristicas-formulario">
          <input
            value={nuevaIntencion.id}
            onChange={e => setNuevaIntencion(n => ({ ...n, id: e.target.value }))}
            placeholder="ID"
          />
          <input
            value={nuevaIntencion.descripcion}
            onChange={e => setNuevaIntencion(n => ({ ...n, descripcion: e.target.value }))}
            placeholder="Descripción"
          />
          <textarea
            value={nuevaIntencion.mision_deteccion}
            onChange={e => setNuevaIntencion(n => ({ ...n, mision_deteccion: e.target.value }))}
            placeholder="Misión de detección"
          />
          <textarea
            value={nuevaIntencion.mision_conversacional}
            onChange={e => setNuevaIntencion(n => ({ ...n, mision_conversacional: e.target.value }))}
            placeholder="Misión conversacional"
          />
          <button onClick={agregarIntencion}>+ Agregar intención</button>
        </div>

        <h3>Reglas globales</h3>
        <label>Salida crítica de detección</label>
        <input
          value={config.reglas_globales.salida_critica_deteccion}
          onChange={e => handleReglasGlobalesChange("salida_critica_deteccion", e.target.value)}
        />
        <label>Manejo de ninguna intención</label>
        <textarea
          value={config.reglas_globales.manejo_ninguna_intencion}
          onChange={e => handleReglasGlobalesChange("manejo_ninguna_intencion", e.target.value)}
        />

        <button onClick={guardarCambios}>Guardar</button>
      </div>
    </div>
  );
}

// --- Componente principal, export default ---
export default function HandlerIAConfiguration() {
  const [params] = useSearchParams();
  const handlerId = params.get("handler");
  if (!handlerId) return <div>Falta parámetro handler.</div>;
  return <ConfiguracionHandlerForm handlerId={handlerId} />;
}

