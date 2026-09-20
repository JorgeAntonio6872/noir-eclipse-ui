"use client";
import { useState } from "react";
import {
  LocalUser,
  loginLocal,
  registerLocal,
  saveSession,
} from "../../lib/local-users";

export default function AuthForm({
  mode,
  onMode,
  onSuccess,
}: {
  mode: "login" | "register";
  onMode: (mode: "login" | "register") => void;
  onSuccess: (user: LocalUser) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const email = String(form.get("email")),
        password = String(form.get("password"));
      const action = () =>
        mode === "register"
          ? registerLocal(
              localStorage,
              String(form.get("name")),
              email,
              password,
            )
          : loginLocal(localStorage, email, password);
      const user = navigator.locks
        ? await navigator.locks.request("noir-eclipse.accounts", action)
        : await action();
      saveSession(sessionStorage, user);
      onSuccess(user);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo iniciar sesión. Revisa el almacenamiento del navegador.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="reservation-form" onSubmit={submit}>
      <p className="local-note">
        Cuenta de demostración, guardada solo en este navegador. Usa una
        contraseña de prueba.
      </p>
      {error && (
        <p className="message error" role="alert">
          {error}
        </p>
      )}
      {mode === "register" && (
        <label>
          Nombre
          <input
            name="name"
            autoComplete="given-name"
            required
            maxLength={60}
          />
        </label>
      )}
      <label>
        Correo electrónico
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
        />
      </label>
      <label>
        Contraseña
        <input
          name="password"
          type="password"
          autoComplete={
            mode === "register" ? "new-password" : "current-password"
          }
          required
          minLength={mode === "register" ? 8 : undefined}
          maxLength={128}
        />
      </label>
      <button className="button gold full" disabled={busy}>
        {busy
          ? "Un momento…"
          : mode === "register"
            ? "Registrarse y continuar"
            : "Iniciar sesión y continuar"}
      </button>
      <button
        type="button"
        className="text-link"
        disabled={busy}
        onClick={() => {
          setError("");
          onMode(mode === "register" ? "login" : "register");
        }}
      >
        {mode === "register"
          ? "Ya tengo cuenta · Iniciar sesión"
          : "No tengo cuenta · Registrarse"}
      </button>
    </form>
  );
}
