"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";
import { borrarDatosLocales, esSinConexion, sincronizar } from "./local";
import type { Usuario } from "./roles";

type Estado = "cargando" | "anonimo" | "autenticado";

// Lo que responde el login: si todavía no activó Google Authenticator, trae los datos para el QR
// "unidad" es la del usuario (null si no tiene), para mostrar su logo en el segundo paso
type RespuestaLogin = {
  mfa_activado: boolean;
  otpauth_uri?: string;
  clave_manual?: string;
  unidad: { nombre: string; sigla: string } | null;
};

type Auth = {
  estado: Estado;
  usuario: Usuario | null;
  iniciarSesion: (email: string, password: string) => Promise<RespuestaLogin>;
  enviarCodigoPorMail: () => Promise<void>;
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
        localStorage.setItem("usuario", JSON.stringify(r.data.user));
        setEstado("autenticado");
      })
      .catch((err) => {
        // Sin conexión no se cierra la sesión: se sigue con el último usuario conocido (para ver lo guardado)
        const guardado = localStorage.getItem("usuario");
        if (esSinConexion(err) && localStorage.getItem("token") && guardado) {
          setUsuario(JSON.parse(guardado));
          setEstado("autenticado");
          return;
        }
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        setEstado("anonimo");
      });
  }, []);

  // Paso 1: correo y clave. La API devuelve un token limitado, solo sirve para el código.
  async function iniciarSesion(email: string, password: string) {
    const r = await api.post("/auth/login", { email, password });
    setTokenMfa(r.data.token);
    return r.data;
  }

  // Alternativa a la app: la API manda un código al mail del usuario
  async function enviarCodigoPorMail() {
    await api.post("/auth/mfa/send-code", null, { headers: { Authorization: `Bearer ${tokenMfa}` } });
  }

  // Paso 2: código. Si es correcto, la API devuelve el token completo.
  async function verificarCodigo(codigo: string) {
    const r = await api.post(
      "/auth/mfa/verify",
      { codigo },
      { headers: { Authorization: `Bearer ${tokenMfa}` } },
    );
    localStorage.setItem("token", r.data.token);
    localStorage.setItem("usuario", JSON.stringify(r.data.user));
    setUsuario(r.data.user);
    setEstado("autenticado");
  }

  async function cerrarSesion() {
    // Antes de borrar lo local, se intenta mandar lo que quedó pendiente (si no hay red, se pierde)
    await sincronizar().catch(() => {});
    await api.post("/auth/logout").catch(() => {});
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    // Lo guardado para ver sin conexión es de este usuario: no queda para el próximo
    await borrarDatosLocales();
    setUsuario(null);
    setEstado("anonimo");
  }

  return (
    <Contexto.Provider value={{ estado, usuario, iniciarSesion, enviarCodigoPorMail, verificarCodigo, cerrarSesion }}>
      {children}
    </Contexto.Provider>
  );
}

export function useAuth() {
  return useContext(Contexto)!;
}
