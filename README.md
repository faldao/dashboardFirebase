# ViproomerAIAgentStudio

Panel React y Vite para cargar, importar y editar prompts de IA en Firestore. La biblioteca se abre en `/prompts`. Los enlaces históricos `/IAConfiguration?id=HANDLER0` siguen abriendo el prompt por ID.

Los prompts se guardan en `configuracion_prompts_IA`. El editor conserva los campos existentes, sincroniza `contexto` con `texto` para el backend y mantiene el historial y la papelera recuperable.

## Desarrollo local

```sh
npm install
npm run dev
npm test
npm run build
```

El proyecto de Vercel se llama `viproomer-ai-agent-studio` y conserva el dominio `dashboard-firebase-wine.vercel.app`.

## Prueba con tu WhatsApp personal

ViproomerChatbotBackend recibe los mensajes de Meta, lee los prompts de Firestore y llama a OpenAI. El callback del backend es `https://viproomertest5.vercel.app/api/whatsappWebhook`. Los secretos se configuran en el proyecto de Vercel `viproomer-chatbot-backend`.

La ruta `/api/whatsappWebhook` del panel reenvía las peticiones al backend. Permite consultar el estado desde el navegador y conserva la compatibilidad con el callback anterior.

Desde el número personal registrado en Meta, mandá `prueba` al número de prueba para comprobar la conexión. Después abrí un prompt, guardá los cambios y elegí **Probar en WhatsApp**. Mandá `prompt ID_DEL_PROMPT ¿Cómo me podés ayudar?` para probar la última versión guardada.

[Guía de WhatsApp Cloud API de Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started/)

