import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Icon from "./Icons";

const callback = "https://viproomertest5.vercel.app/api/whatsappWebhook.mjs";

export default function WhatsAppPage() {
  const [params] = useSearchParams();
  const promptId = params.get("prompt") || "ID_DEL_PROMPT";
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState("");

  async function checkWebhook() {
    setChecking(true);
    setStatus("");
    try {
      const response = await fetch(callback, { signal: AbortSignal.timeout(8000) });
      const { configured, promptConfigured } = await response.json();
      if (response.ok && configured === true) {
        setStatus(promptConfigured
          ? "El webhook responde y tiene las credenciales para la prueba con un prompt. Mandá el comando desde tu WhatsApp para verificar la respuesta."
          : "El webhook responde. Para probar un prompt, faltan credenciales de OpenAI o Firebase en Vercel.");
      } else if (response.status === 503 && configured === false) {
        setStatus("El webhook responde. Revisá que estén completas las variables de WhatsApp en el servidor.");
      } else {
        throw new Error("Respuesta inesperada");
      }
    } catch {
      setStatus("El webhook no está disponible en este entorno. Probalo desde el despliegue de Vercel o con vercel dev.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <div className="studio-page-heading">
        <div>
          <h1>Prueba de WhatsApp</h1>
          <p>Intercambiá un mensaje con el número de prueba de Meta desde tu WhatsApp personal.</p>
        </div>
      </div>
      <section className="studio-panel studio-whatsapp" aria-labelledby="whatsapp-setup">
        <h2 id="whatsapp-setup">Configuración inicial</h2>
        <ol>
          <li>En Meta for Developers, agregá tu número personal como destinatario verificado del número de prueba.</li>
          <li>Configurá los secretos de WhatsApp en el proyecto <code>viproomer-chatbot-backend</code> de Vercel.</li>
          <li>En Meta, registrá la URL HTTPS del webhook y el mismo token de verificación. Suscribí el evento <code>messages</code>.</li>
          <li>Desde tu WhatsApp personal, mandá <strong>prueba</strong> al número de prueba de Meta. Vas a recibir una confirmación fija.</li>
        </ol>
        <p>URL del webhook</p>
        <code className="studio-whatsapp-url">{callback}</code>
        <button className="studio-button secondary" type="button" onClick={checkWebhook} disabled={checking}>
          <Icon name="refresh" size={16} />
          {checking ? "Comprobando…" : "Comprobar webhook"}
        </button>
        {status && <p role="status">{status}</p>}
        <h2>Prueba con un prompt guardado</h2>
        <p>
          Abrí un prompt de la <Link to="/prompts">biblioteca</Link>, guardá los cambios y elegí
          <strong> Probar en WhatsApp</strong>. Mandá este comando al número de prueba de Meta
          desde tu WhatsApp personal y cambiá la pregunta por la que quieras probar.
        </p>
        <code className="studio-whatsapp-url">prompt {promptId} ¿Cómo me podés ayudar?</code>
        <p>Cada mensaje usa la última versión guardada del prompt en una conversación independiente.</p>
      </section>
    </>
  );
}
