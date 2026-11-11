"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";
import type { Usuario } from "./roles";

type Estado = "cargando" | "anonimo" | "autenticado";

type Auth = {
  estado: Estado;
  usuario: Usuario | null;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  verificarCodigo: (codigo: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
};

const Contexto = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [tokenMfa, setTokenMfa] = useState("");

  // Al abrir la página: si hay token guardado, /auth/me confirma que sigue valendo
  useEffect(() => {
    api
      .get("/auth/me")
      .then((r) => {
        setUsuario(r.data.user);
        setEstado("autenticado");
      })
      .catch(() => {
        localStorage.removeItem("token");
        setEstado("anonimo");
      });
  }, []);

  // Paso 1: correo y clave. La API devuelve un token limitado, solo sirve para el código.
  async function iniciarSesion(email: string, password: string) {
    const r = await api.post("/auth/login", { email, password });
    setTokenMfa(r.data.token);
  }

  // Paso 2: código. Si es correcto, la API devuelve el token completo.
  async function verificarCodigo(codigo: string) {
    const r = await api.post(
      "/auth/mfa/verify",
      { codigo },
      { headers: { Authorization: `Bearer ${tokenMfa}` } },
    );
    localStorage.setItem("token", r.data.token);
    setUsuario(r.data.user);
    setEstado("autenticado");
  }

  async function cerrarSesion() {
    await api.post("/auth/logout").catch(() => {});
    localStorage.removeItem("token");
    setUsuario(null);
    setEstado("anonimo");
  }

  return (
    <Contexto.Provider value={{ estado, usuario, iniciarSesion, verificarCodigo, cerrarSesion }}>
      {children}
    </Contexto.Provider>
  );
}

export function useAuth() {
  return useContext(Contexto)!;
}
