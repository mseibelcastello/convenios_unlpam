"use client";

import { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const { estado, iniciarSesion, enviarCodigoPorMail, verificarCodigo } = useAuth();
  const router = useRouter();
  const [paso, setPaso] = useState<"clave" | "codigo">("clave");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  // Datos para activar Google Authenticator (solo la primera vez)
  const [activacion, setActivacion] = useState<{ uri: string; clave: string } | null>(null);
  const [aviso, setAviso] = useState("");
  const [enviandoMail, setEnviandoMail] = useState(false);

  useEffect(() => {
    if (estado === "autenticado") router.replace("/");
  }, [estado, router]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      if (paso === "clave") {
        const r = await iniciarSesion(email.trim(), password);
        setActivacion(r.otpauth_uri && r.clave_manual ? { uri: r.otpauth_uri, clave: r.clave_manual } : null);
        setPaso("codigo");
      } else {
        await verificarCodigo(codigo.trim());
        router.replace("/");
      }
    } catch (err) {
      const e = err as AxiosError<{ message: string }>;
      setError(e.response?.data?.message ?? "No se pudo iniciar sesión");
    } finally {
      setEnviando(false);
    }
  }

  // Pide que la API mande el código por mail
  async function mandarPorMail() {
    setError("");
    setAviso("");
    setEnviandoMail(true);
    try {
      await enviarCodigoPorMail();
      setAviso(`Te enviamos un código a ${email}. Ingresalo arriba.`);
    } catch (err) {
      const e = err as AxiosError<{ message: string }>;
      setError(e.response?.data?.message ?? "No se pudo enviar el mail");
    }
    setEnviandoMail(false);
  }

  function volver() {
    setPaso("clave");
    setCodigo("");
    setPassword("");
    setError("");
    setAviso("");
    setActivacion(null);
  }

  return (
    <main className="login">
      <form className="login-tarjeta" onSubmit={enviar} noValidate>
        <h1>Convenios UNLPam</h1>
        {paso === "clave" ? (
          <>
            <label>
              Correo electrónico
              <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Contraseña
              <span className="campo-clave">
                <input type={verClave ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="ojo" aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setVerClave(!verClave)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={verClave ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" fill={verClave ? "var(--color-papel)" : "none"} />
                  </svg>
                </button>
              </span>
            </label>
          </>
        ) : (
          <>
            {activacion ? (
              <>
                <p>Es tu primer ingreso. Escaneá este código con Google Authenticator (o una app parecida) y escribí abajo el código de 6 dígitos que te muestra.</p>
                <div className="qr">
                  <QRCodeSVG value={activacion.uri} size={160} bgColor="#ffffff" fgColor="#000000" title="Código QR para Google Authenticator" />
                </div>
                <p className="clave-manual">
                  ¿No podés escanearlo? Ingresá esta clave a mano en la app: <code>{activacion.clave}</code>
                </p>
              </>
            ) : (
              <p>Ingresá el código de 6 dígitos de Google Authenticator.</p>
            )}
            <label>
              Código de verificación
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                autoFocus
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
              />
            </label>
          </>
        )}
        {error && (
          <p role="alert" className="login-error">
            {error}
          </p>
        )}
        {aviso && <p role="status">{aviso}</p>}
        <button type="submit" disabled={enviando}>
          {enviando ? "Verificando…" : paso === "clave" ? "Continuar" : "Ingresar"}
        </button>
        {paso === "codigo" && (
          <>
            <button type="button" className="secundario" onClick={mandarPorMail} disabled={enviandoMail}>
              {enviandoMail ? "Enviando…" : "Enviarme el código a mi mail"}
            </button>
            <button type="button" className="secundario" onClick={volver}>
              Volver
            </button>
          </>
        )}
      </form>
    </main>
  );
}
