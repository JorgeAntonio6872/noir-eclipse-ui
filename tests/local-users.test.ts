import assert from "node:assert/strict";
import test from "node:test";
import {
  registerLocal,
  loginLocal,
  readSession,
  saveSession,
} from "../lib/local-users";
function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => {
      values.set(k, v);
    },
    removeItem: (k) => {
      values.delete(k);
    },
    clear: () => values.clear(),
    key: (i) => [...values.keys()][i] ?? null,
  };
}
test("registro, contraseña, sesión y cierre de usuarios locales", async () => {
  const storage = memoryStorage(),
    session = memoryStorage();
  const user = await registerLocal(
    storage,
    "Prueba",
    "PRUEBA@example.test",
    "demo-pass-123",
  );
  assert.equal(user.email, "prueba@example.test");
  assert.equal(
    storage.getItem(storage.key(0)!)?.includes("demo-pass-123"),
    false,
  );
  await assert.rejects(loginLocal(storage, user.email, "incorrecta"));
  await assert.rejects(
    registerLocal(storage, "Otro", user.email, "demo-pass-456"),
  );
  assert.deepEqual(
    await loginLocal(storage, "PRUEBA@example.test", "demo-pass-123"),
    user,
  );
  saveSession(session, user);
  assert.deepEqual(readSession(storage, session), user);
  saveSession(session, null);
  assert.equal(readSession(storage, session), null);
});
test("registro rechaza campos inválidos sin escribir cuentas", async () => {
  const storage = memoryStorage();
  await assert.rejects(
    registerLocal(storage, "", "a@example.test", "long-pass"),
  );
  await assert.rejects(
    registerLocal(storage, "Ana", "incorrecto", "long-pass"),
  );
  await assert.rejects(
    registerLocal(storage, "Ana", "a@example.test", "corta"),
  );
  assert.equal(storage.length, 0);
});
