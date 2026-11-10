// Scoped integration check for the two disposable records created during Studio QA.
// Uses the same public Firebase client configuration and rules as the dashboard.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, setPersistence, signInAnonymously, signOut } from 'firebase/auth';
import { doc, getDoc, getFirestore, runTransaction, terminate } from 'firebase/firestore';
import { nextResource } from '../lib/studio/model.mjs';

if (!process.argv.includes('--cleanup-qa')) throw new Error('This check requires --cleanup-qa.');
const source = await fs.readFile(new URL('../src/firebase.js', import.meta.url), 'utf8');
const fields = [...source.matchAll(/\b(apiKey|authDomain|projectId|storageBucket|messagingSenderId|appId|measurementId)\s*:\s*["']([^"']+)["']/g)];
const config = Object.fromEntries(fields.map(match => [match[1], match[2]]));
assert.equal(config.projectId, 'chatbot-viproomer');
const app = initializeApp(config, 'studio-scoped-qa');
const auth = getAuth(app), db = getFirestore(app);
const ids = ['QA_STUDIO_20261106', 'QA_STUDIO_20261106_COPIA'];
async function setTrash(id, deleted) {
  assert.ok(ids.includes(id));
  const ref = doc(db, 'configuracion_prompts_IA', id);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    assert.equal(snapshot.exists(), true);
    const previous = { ...snapshot.data(), id };
    assert.match(previous.descripcion, /^Verificación del ABM del dashboard/);
    const next = nextResource(previous, previous);
    next._studio.deleted = deleted;
    transaction.set(ref, next);
  });
  const snapshot = await getDoc(ref);
  assert.equal(snapshot.data()._studio.deleted, deleted);
}
try {
  await setPersistence(auth, inMemoryPersistence);
  await signInAnonymously(auth);
  await setTrash(ids[1], true);
  await setTrash(ids[1], false);
  await setTrash(ids[1], true);
  await setTrash(ids[0], true);
  console.log(JSON.stringify({ verified: ['trash', 'restore', 'persistence'], qaRecordsInTrash: ids }));
} finally {
  await signOut(auth);
  await terminate(db);
  await deleteApp(app);
}
