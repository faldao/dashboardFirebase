// dashboard/src/App.jsx
import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";
import { db, authReady } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";
import './App.css';

export default function App() {
    const [propiedades, setPropiedades] = useState([]);
    const [departamentos, setDepartamentos] = useState({});
    const [nuevaClave, setNuevaClave] = useState("");
    const [nuevoValor, setNuevoValor] = useState("");
    const [subiendoPorPropiedad, setSubiendoPorPropiedad] = useState({});
    const [cardsExpandida, setCardsExpandida] = useState({});
    const [caracteristicasPropiedad, setCaracteristicasPropiedad] = useState([]);

    //const opcionesCaracteristicas = [
    //    "wifi", "piscina", "estacionamiento", "desayuno", "mascotas", "aire acondicionado"
    //];

    useEffect(() => {
        async function fetchData() {
            await authReady;
            const querySnapshot = await getDocs(collection(db, "propiedades"));
            const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setPropiedades(data.map((p) => ({
                ...p,
                galeria: Array.isArray(p.galeria) ? p.galeria : [],
                nuevoTag: ""
            })));

            const depsPorPropiedad = {};
            for (const docSnap of querySnapshot.docs) {
                const depSnap = await getDocs(collection(db, `propiedades/${docSnap.id}/departamentos`));
                depsPorPropiedad[docSnap.id] = depSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
            }
            setDepartamentos(depsPorPropiedad);
            // Obtener características de propiedades
            const docProp = await getDoc(doc(db, "configuracion", "caracteristicas-propiedad"));
            //if (docProp.exists()) {
            //  setCaracteristicasPropiedad(docProp.data().lista || []);
            //}
            if (docProp.exists()) {
                const data = docProp.data();
                if (Array.isArray(data.lista)) {
                    setCaracteristicasPropiedad(data.lista);
                } else {
                    console.warn("⚠️ 'lista' no es un array en caracteristicas-propiedad");
                    setCaracteristicasPropiedad([]);
                }
            }

        }
        fetchData();
    }, []);

    const handleChange = (id, field, value) => {
        setPropiedades((prev) =>
            prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
        );
    };

    const handleFaqChange = (id, index, value) => {
        setPropiedades((prev) =>
            prev.map((p) => {
                if (p.id === id) {
                    const nuevasFaq = [...(p.faq || [])];
                    nuevasFaq[index] = value;
                    return { ...p, faq: nuevasFaq };
                }
                return p;
            })
        );
    };

    const agregarFaq = (id) => {
        setPropiedades((prev) =>
            prev.map((p) =>
                p.id === id ? { ...p, faq: [...(p.faq || []), ""] } : p
            )
        );
    };

    const handleCaracteristicaChange = (id, key, value) => {
        setPropiedades((prev) =>
            prev.map((p) => {
                if (p.id === id) {
                    return {
                        ...p,
                        caracteristicas: {
                            ...(p.caracteristicas || {}),
                            [key]: value
                        }
                    };
                }
                return p;
            })
        );
    };

    const agregarCaracteristica = (id) => {
        if (!nuevaClave) return;
        handleCaracteristicaChange(id, nuevaClave, nuevoValor);
        setNuevaClave("");
        setNuevoValor("");
    };

    const handleUbicacionChange = (id, field, value) => {
        setPropiedades((prev) =>
            prev.map((p) =>
                p.id === id
                    ? {
                        ...p,
                        ubicacion: {
                            ...(p.ubicacion || {}),
                            [field]: value,
                        },
                    }
                    : p
            )
        );
    };

    const handleGaleriaChange = (id, index, value) => {
        setPropiedades((prev) =>
            prev.map((p) => {
                if (p.id === id) {
                    const nuevaGaleria = [...(p.galeria || [])];
                    nuevaGaleria[index] = value;
                    return { ...p, galeria: nuevaGaleria };
                }
                return p;
            })
        );
    };

    const handleUploadNuevaImagen = async (propiedadId, file) => {
        if (!file) return;

        const propiedad = propiedades.find((p) => p.id === propiedadId);
        const tag = propiedad?.nuevoTag || "";

        try {
            setSubiendoPorPropiedad(prev => ({ ...prev, [propiedadId]: true }));
            const storageRef = ref(storage, `galeria/${propiedadId}_${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            const nuevaImagen = { url, tag };

            setPropiedades((prev) =>
                prev.map((p) => {
                    if (p.id === propiedadId) {
                        return {
                            ...p,
                            galeria: [...(p.galeria || []), nuevaImagen],
                            nuevoTag: ""
                        };
                    }
                    return p;
                })
            );
        } catch (err) {
            console.error("❌ Error al subir imagen:", err);
            alert("Hubo un error al subir la imagen.");
        } finally {
            setSubiendoPorPropiedad(prev => ({ ...prev, [propiedadId]: false }));
        }
    };

    const eliminarImagen = (id, index) => {
        setPropiedades((prev) =>
            prev.map((p) => {
                if (p.id === id) {
                    const nuevaGaleria = [...(p.galeria || [])];
                    nuevaGaleria.splice(index, 1);
                    return { ...p, galeria: nuevaGaleria };
                }
                return p;
            })
        );
    };

    const guardarCambios = async (id) => {
        const propiedad = propiedades.find((p) => p.id === id);
        const docRef = doc(db, "propiedades", id);
        await updateDoc(docRef, {
            descripcion: propiedad.descripcion,
            descripcion_detallada: propiedad.descripcion_detallada,
            tipo_viajero: propiedad.tipo_viajero,
            historia: propiedad.historia,
            activar_para_venta: propiedad.activar_para_venta || false,
            faq: propiedad.faq || [],
            caracteristicas: propiedad.caracteristicas || {},
            ubicacion: propiedad.ubicacion || {},
            galeria: propiedad.galeria || [],
        });
        alert("Cambios guardados para " + propiedad.nombre);
    };

    const toggleExpandir = (id) => {
        setCardsExpandida((prev) => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    return (
        <div className="container">
            <h1>Dashboard de Propiedades</h1>
            <p><a href="/flujo">Configurar el flujo de conversaciones →</a></p>
            {propiedades.map((p) => (
                <div key={p.id} className="card">
                    <table style={{
                        width: "100%", borderCollapse: "collapse"
                    }}>
                        <tbody>
                            <tr>
                                {/* Columna principal */}
                                <td
                                    style={{
                                        verticalAlign: "top",
                                        paddingRight: "10px",
                                        width: "calc(100% - 270px)",
                                    }}
                                >
                                    <div className="card-content">
                                        <div className="card-header">
                                            <h2>{p.nombre}</h2>
                                            <button onClick={() => toggleExpandir(p.id)}>
                                                {cardsExpandida[p.id] ? "▼ Ocultar" : "► Expandir"}
                                            </button>
                                        </div>

                                        {cardsExpandida[p.id] && (
                                            <>
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={!!p.activar_para_venta}
                                                        onChange={(e) => handleChange(p.id, "activar_para_venta", e.target.checked)}
                                                    />
                                                    Activar para la venta
                                                </label>

                                                <label>Descripción corta</label>
                                                <textarea value={p.descripcion} onChange={(e) => handleChange(p.id, "descripcion", e.target.value)} />

                                                <label>Descripción detallada</label>
                                                <textarea value={p.descripcion_detallada} onChange={(e) => handleChange(p.id, "descripcion_detallada", e.target.value)} />

                                                <label>Tipo de viajero</label>
                                                <textarea value={p.tipo_viajero || ""} onChange={(e) => handleChange(p.id, "tipo_viajero", e.target.value)} />

                                                <label>Historia</label>
                                                <textarea value={p.historia || ""} onChange={(e) => handleChange(p.id, "historia", e.target.value)} />

                                                {/* Características */}
                                                <div className="caracteristicas-container">
                                                    <label>Características</label>
                                                    <div className="caracteristicas-lista">
                                                        {Object.entries(p.caracteristicas || {}).map(([key, value]) => (
                                                            <div key={key} className="caracteristica-item">
                                                                <input value={key} readOnly className="caracteristica-key" />
                                                                <input value={value} onChange={(e) => handleCaracteristicaChange(p.id, key, e.target.value)} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="caracteristicas-formulario">
                                                        <select value={nuevaClave} onChange={(e) => setNuevaClave(e.target.value)}>
                                                            <option value="">Seleccionar característica</option>
                                                            {caracteristicasPropiedad.map((op) => (
                                                                <option key={op} value={op}>{op}</option>
                                                            ))}
                                                        </select>
                                                        <input type="text" value={nuevoValor} onChange={(e) => setNuevoValor(e.target.value)} placeholder="Valor" />
                                                        <button onClick={() => agregarCaracteristica(p.id)}>+ Agregar característica</button>
                                                    </div>
                                                </div>

                                                {/* FAQ */}
                                                <div className="faqs-container">
                                                    <label>FAQ</label>
                                                    <div className="faqs-lista">
                                                        {(p.faq || []).map((regla, i) => (
                                                            <textarea key={i} value={regla} onChange={(e) => handleFaqChange(p.id, i, e.target.value)} />
                                                        ))}
                                                    </div>
                                                    <div className="faqs-formulario">
                                                        <button onClick={() => agregarFaq(p.id)}>+ Agregar FAQ</button>
                                                    </div>
                                                </div>
                                                {/* Ubicación */}
                                                <div className="ubicacion-container">
                                                    <label>Ubicación - dirección</label>
                                                    <label>Dirección</label>
                                                    <textarea
                                                        value={p.ubicacion?.direccion || ""}
                                                        onChange={(e) => handleUbicacionChange(p.id, "direccion", e.target.value)}
                                                    />
                                                    <label>Zona</label>
                                                    <input
                                                        type="text"
                                                        value={p.ubicacion?.zona || ""}
                                                        onChange={(e) => handleUbicacionChange(p.id, "zona", e.target.value)}
                                                    />
                                                    <label>Latitud</label>
                                                    <input
                                                        type="text"
                                                        value={p.ubicacion?.lat || ""}
                                                        onChange={(e) => handleUbicacionChange(p.id, "lat", e.target.value)}
                                                    />
                                                    <label>Longitud</label>
                                                    <input
                                                        type="text"
                                                        value={p.ubicacion?.lng || ""}
                                                        onChange={(e) => handleUbicacionChange(p.id, "lng", e.target.value)}
                                                    />
                                                    {p.ubicacion?.lat && p.ubicacion?.lng && (
                                                        <iframe
                                                            src={`https://www.google.com/maps?q=${p.ubicacion.lat},${p.ubicacion.lng}&output=embed`}
                                                            width="100%"
                                                            height="250"
                                                            style={{ border: 0, marginTop: "10px" }}
                                                            loading="lazy"
                                                            allowFullScreen
                                                            referrerPolicy="no-referrer-when-downgrade"
                                                            title="Mapa por coordenadas"
                                                        />
                                                    )}
                                                </div>


                                                {/* Galería */}
                                                <label>Galería de imágenes</label>
                                                <div className="galeria-lista">
                                                    {(p.galeria || []).map((img, i) => (
                                                        <div key={i} className="galeria-item">
                                                            <img src={img.url} alt={`Imagen ${i + 1}`} />
                                                            <input
                                                                type="text"
                                                                value={img.tag || ""}
                                                                onChange={(e) => {
                                                                    const nuevaGaleria = [...(p.galeria || [])];
                                                                    nuevaGaleria[i] = { ...nuevaGaleria[i], tag: e.target.value };
                                                                    handleGaleriaChange(p.id, i, nuevaGaleria[i]);
                                                                }}
                                                            />
                                                            <button className="delete-button" onClick={() => eliminarImagen(p.id, i)} title="Eliminar imagen">
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
                                                                onChange={(e) => handleUploadNuevaImagen(p.id, e.target.files[0])}
                                                            />
                                                        </label>
                                                        {subiendoPorPropiedad[p.id] && <div className="spinner"></div>}
                                                    </div>
                                                </div>

                                                <button onClick={() => guardarCambios(p.id)}>Guardar</button>
                                            </>
                                        )}
                                    </div>
                                </td>

                                {/* Columna lateral departamentos */}
                                <td style={{ width: "250px", verticalAlign: "top", paddingLeft: "10px" }}>
                                    <div className="departamentos-columna">
                                        <h4>Departamentos</h4>
                                        {(departamentos[p.id] || []).map((d) => (
                                            <div key={d.id}>
                                                <a
                                                    href={`/departamento?id=${d.id}&prop=${p.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    {d.id} - {d.nombre}
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

            ))
            }
        </div >
    );
}


