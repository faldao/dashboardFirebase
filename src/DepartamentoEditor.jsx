// src/DepartamentoEditor.jsx
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, authReady } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";
import { useSearchParams } from "react-router-dom";
import './DepartamentoEditor.css';

//const opcionesCaracteristicas = [
//  "wifi", "piscina", "estacionamiento", "desayuno", "mascotas", "aire acondicionado"
//];


export default function DepartamentoEditor() {
  const [departamento, setDepartamento] = useState(null);
  const [nuevoTag, setNuevoTag] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [nuevaClave, setNuevaClave] = useState("");
  const [nuevoValor, setNuevoValor] = useState("");
  const [params] = useSearchParams();
  const propiedadId = params.get("prop");
  const deptoId = params.get("id");
  const [caracteristicasDepartamento, setCaracteristicasDepartamento] = useState([]);



  useEffect(() => {
    async function fetchData() {
      await authReady;
      const refDoc = doc(db, `propiedades/${propiedadId}/departamentos`, deptoId);
      const snap = await getDoc(refDoc);
      if (snap.exists()) {
        setDepartamento({ id: snap.id, ...snap.data() });
      }
      // Traer la lista de características de departamentos
      const docDepto = await getDoc(doc(db, "configuracion", "caracteristicas-departamento"));
      if (docDepto.exists()) {
        setCaracteristicasDepartamento(docDepto.data().lista || []);
      }
    }
    fetchData();
  }, [propiedadId, deptoId]);

  const handleChange = (field, value) => {
    setDepartamento((prev) => ({ ...prev, [field]: value }));
  };

  const handleCaracteristicaChange = (key, value) => {
    setDepartamento((prev) => ({
      ...prev,
      caracteristicas: {
        ...(prev.caracteristicas || {}),
        [key]: value
      }
    }));
  };

  const handleFaqChange = (index, value) => {
    const nuevasFaq = [...(departamento.faq || [])];
    nuevasFaq[index] = value;
    setDepartamento((prev) => ({ ...prev, faq: nuevasFaq }));
  };

  const agregarFaq = () => {
    setDepartamento((prev) => ({
      ...prev,
      faq: [...(prev.faq || []), ""]
    }));
  };

  const agregarCaracteristica = () => {
    if (!nuevaClave) return;
    handleCaracteristicaChange(nuevaClave, nuevoValor);
    setNuevaClave("");
    setNuevoValor("");
  };

  const handleGaleriaChange = (index, newImg) => {
    const nuevaGaleria = [...(departamento.galeria || [])];
    nuevaGaleria[index] = newImg;
    setDepartamento((prev) => ({ ...prev, galeria: nuevaGaleria }));
  };

  const handleUploadNuevaImagen = async (file) => {
    if (!file) return;

    try {
      setSubiendo(true);
      const storageRef = ref(storage, `galeria/depto_${deptoId}_${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const nuevaImagen = { url, tag: nuevoTag };

      setDepartamento((prev) => ({
        ...prev,
        galeria: [...(prev.galeria || []), nuevaImagen]
      }));
      setNuevoTag("");
    } catch (err) {
      console.error("❌ Error al subir imagen:", err);
      alert("Hubo un error al subir la imagen.");
    } finally {
      setSubiendo(false);
    }
  };

  const guardarCambios = async () => {
    const refDoc = doc(db, `propiedades/${propiedadId}/departamentos`, deptoId);
    await updateDoc(refDoc, {
      activar_para_venta: departamento.activar_para_venta || false,
      descripcion: departamento.descripcion || "",
      m2: departamento.m2 || null,
      caracteristicas: departamento.caracteristicas || {},
      faq: departamento.faq || [],
      galeria: departamento.galeria || []
    });
    alert("Cambios guardados");
  };

  if (!departamento) return <div>Cargando...</div>;

  return (
    <div className="container">
      <div className="card">
        <h2>{departamento.id} - {departamento.nombre}</h2>

        <label>
          <input
            type="checkbox"
            checked={!!departamento.activar_para_venta}
            onChange={(e) => handleChange("activar_para_venta", e.target.checked)}
          />
          Activar para la venta
        </label>

        <label>Descripción</label>
        <textarea
          value={departamento.descripcion || ""}
          onChange={(e) => handleChange("descripcion", e.target.value)}
        />

        <label>Metros cuadrados (m2)</label>
        <input
          type="number"
          value={departamento.m2 || ""}
          onChange={(e) => handleChange("m2", e.target.value)}
        />

        <div className="caracteristicas-container">
          <label>Características</label>
          <div className="caracteristicas-lista">
            {Object.entries(departamento.caracteristicas || {}).map(([key, value]) => (
              <div key={key} className="caracteristica-item">
                <input value={key} readOnly className="caracteristica-key" />
                <input value={value} onChange={(e) => handleCaracteristicaChange(key, e.target.value)} />
              </div>
            ))}
          </div>
          <div className="caracteristicas-formulario">
            <select value={nuevaClave} onChange={(e) => setNuevaClave(e.target.value)}>
              <option value="">Seleccionar característica</option>
              {caracteristicasDepartamento.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}

            </select>
            <input type="text" value={nuevoValor} onChange={(e) => setNuevoValor(e.target.value)} placeholder="Valor" />
            <button onClick={agregarCaracteristica}>+ Agregar característica</button>
          </div>
        </div>

        <div className="faqs-container">
          <label>FAQ</label>
          <div className="faqs-lista">
            {(departamento.faq || []).map((regla, i) => (
              <textarea key={i} value={regla} onChange={(e) => handleFaqChange(i, e.target.value)} />
            ))}
          </div>
          <div className="faqs-formulario">
            <button onClick={agregarFaq}>+ Agregar FAQ</button>
          </div>
        </div>

        <label>Galería de imágenes</label>
        <div className="galeria-lista">
          {(departamento.galeria || []).map((img, i) => (
            <div key={i} className="galeria-item">
              <img src={img.url} alt={`Imagen ${i + 1}`} />
              <input
                type="text"
                value={img.tag || ""}
                onChange={(e) => {
                  const nuevaImg = { ...img, tag: e.target.value };
                  handleGaleriaChange(i, nuevaImg);
                }}
              />
              <button
                className="delete-button"
                onClick={() => {
                  const nuevaGaleria = [...(departamento.galeria || [])];
                  nuevaGaleria.splice(i, 1);
                  setDepartamento((prev) => ({ ...prev, galeria: nuevaGaleria }));
                }}
                title="Eliminar imagen"
              >
                <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="#dc3545">
                  <path d="M0 0h24v24H0V0z" fill="none" />
                  <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-4.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z" />
                </svg>
              </button>
            </div>
          ))}
          <div className="galeria-formulario">
            <label className="boton-subir">
              📁 Subir imagen
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleUploadNuevaImagen(e.target.files[0])}
              />
            </label>
            {subiendo && <div className="spinner"></div>}
          </div>
        </div>

        <button onClick={guardarCambios}>Guardar</button>
      </div>
    </div>
  );
}




