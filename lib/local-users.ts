// Prototype accounts only: these are not server authentication or authorization.
export type LocalUser = { id: string; name: string; email: string };
type Account = LocalUser & { salt: string; hash: string };
const KEY = "noir-eclipse.accounts.v1";
const SESSION = "noir-eclipse.session.v1";
const encode = (bytes: Uint8Array) =>
  Array.from(bytes, (n) => n.toString(16).padStart(2, "0")).join("");

function accounts(storage: Storage): Account[] {
  const value: unknown = JSON.parse(storage.getItem(KEY) ?? "[]");
  if (
    !Array.isArray(value) ||
    value.some(
      (a) =>
        !a ||
        typeof a.id !== "string" ||
        typeof a.name !== "string" ||
        typeof a.email !== "string" ||
        typeof a.salt !== "string" ||
        !/^[a-f0-9]{32}$/.test(a.salt) ||
        typeof a.hash !== "string" ||
        !/^[a-f0-9]{64}$/.test(a.hash),
    )
  )
    throw new Error(
      "No se pudieron leer las cuentas locales. No se han modificado los datos.",
    );
  return value;
}
function publicUser(account: Account): LocalUser {
  return { id: account.id, name: account.name, email: account.email };
}
async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: 210000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return encode(new Uint8Array(bits));
}
export async function registerLocal(
  storage: Storage,
  name: string,
  email: string,
  password: string,
): Promise<LocalUser> {
  email = email.trim().toLowerCase();
  name = name.trim();
  if (
    !name ||
    name.length > 60 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254
  )
    throw new Error("Introduce un nombre y un correo válidos.");
  if (password.length < 8 || password.length > 128)
    throw new Error(
      "Usa una contraseña de 8 a 128 caracteres para esta demostración.",
    );
  const salt = encode(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await passwordHash(password, salt);
  const latest = accounts(storage);
  if (latest.some((a) => a.email === email))
    throw new Error(
      "Ese correo ya está registrado en este navegador. Inicia sesión.",
    );
  const account = { id: crypto.randomUUID(), name, email, salt, hash };
  storage.setItem(KEY, JSON.stringify([...latest, account]));
  return publicUser(account);
}
export async function loginLocal(
  storage: Storage,
  email: string,
  password: string,
): Promise<LocalUser> {
  const account = accounts(storage).find(
    (a) => a.email === email.trim().toLowerCase(),
  );
  if (!account || (await passwordHash(password, account.salt)) !== account.hash)
    throw new Error("Correo o contraseña incorrectos.");
  return publicUser(account);
}
export function readSession(
  storage: Storage,
  session: Storage,
): LocalUser | null {
  const id = session.getItem(SESSION);
  if (!id) return null;
  const account = accounts(storage).find((a) => a.id === id);
  return account ? publicUser(account) : null;
}
export function saveSession(session: Storage, user: LocalUser | null) {
  if (user) session.setItem(SESSION, user.id);
  else session.removeItem(SESSION);
}
