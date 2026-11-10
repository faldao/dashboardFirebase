import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  runTransaction,
} from "firebase/firestore";
import { authReady, db } from "../firebase";
import { nextResource, PROMPTS_COLLECTION, resourceId } from "../../lib/studio/model.mjs";

const knownPrompts = [
  "DETECTOR_IDIOMA",
  "HANDLER0",
  "HANDLER0_CONVERSACIONAL",
  "HANDLER1",
  "HANDLER1_CONVERSACIONAL",
  "HANDLER2",
  "HANDLER2_CONVERSACIONAL",
  "HANDLER3",
  "HANDLER3_CONVERSACIONAL",
  "CORE_RESERVA",
];
export function subscribePrompts(onData, onError) {
  let cancelled = false,
    unsubscribe;
  authReady
    .then(() => {
      if (cancelled) return;
      unsubscribe = onSnapshot(
        query(collection(db, PROMPTS_COLLECTION), limit(500)),
        (snapshot) => {
          onData(
            snapshot.docs.map((item) => ({ ...item.data(), id: item.id })),
            false,
          );
        },
        async (error) => {
          // Some existing projects permit individual prompt reads but not collection listing.
          if (error.code === "permission-denied") {
            const settled = await Promise.allSettled(
              knownPrompts.map((id) =>
                getDoc(doc(db, PROMPTS_COLLECTION, id)),
              ),
            );
            const found = settled.flatMap((result) =>
              result.status === "fulfilled" && result.value.exists()
                ? [{ ...result.value.data(), id: result.value.id }]
                : [],
            );
            if (found.length && !cancelled) {
              onData(found, true);
              return;
            }
          }
          if (!cancelled) onError(error);
        },
      );
    })
    .catch((error) => {
      if (!cancelled) onError(error);
    });
  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export async function readPrompt(id) {
  await authReady;
  const snapshot = await getDoc(doc(db, PROMPTS_COLLECTION, resourceId(id)));
  return snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } : null;
}

export async function savePrompt(
  value,
  { create = false, expectedRevision } = {},
) {
  await authReady;
  const id = resourceId(value.id),
    ref = doc(db, PROMPTS_COLLECTION, id);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const previous = snapshot.exists() ? { ...snapshot.data(), id } : null;
    if (create && previous)
      throw new Error("Ya existe un elemento con ese ID. Elegí otro.");
    if (!create && !previous)
      throw new Error("El elemento ya no existe. Actualizá el listado.");
    if (
      previous &&
      expectedRevision != null &&
      (previous._studio?.revision || 0) !== expectedRevision
    )
      throw new Error(
        "Otra sesión guardó cambios. Volvé a cargar el elemento antes de guardar.",
      );
    const next = nextResource({ ...value, id }, previous);
    // Keep the document comfortably below Firestore's 1 MiB limit, including its history.
    while (JSON.stringify(next).length > 600000 && next._studioHistory.length)
      next._studioHistory.pop();
    if (new Blob([JSON.stringify(next)]).size > 800000)
      throw new Error("El documento es demasiado grande para guardarlo.");
    transaction.set(ref, next);
    return next;
  });
}

export async function trashPrompt(id, deleted) {
  await authReady;
  const ref = doc(db, PROMPTS_COLLECTION, resourceId(id));
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("El elemento ya no existe.");
    const previous = { ...snapshot.data(), id };
    const next = nextResource(previous, previous);
    next._studio.deleted = deleted;
    transaction.set(ref, next);
    return next;
  });
}

