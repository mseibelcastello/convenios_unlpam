"use client";

import { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import LogoUnidad from "@/components/LogoUnidad";
import { useAuth } from "@/lib/auth";

// Next conserva en memoria las páginas ya visitadas (Activity). Sin esto, al cerrar sesión volvía el login
// tal como se dejó al entrar (tarjeta ya desvanecida, "saliendo"), y se veía solo el fondo negro.
// Con la key, cada cierre de sesión monta un login nuevo.
export default function Login() {
  const { sesion } = useAuth();
  return <FormularioLogin key={sesion} />;
}

function FormularioLogin() {
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
  // Unidad del usuario (para mostrar su logo en el segundo paso)
  const [unidad, setUnidad] = useState<{ nombre: string; sigla: string } | null>(null);
  const [aviso, setAviso] = useState("");
  const [enviandoMail, setEnviandoMail] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  // Giro de la tarjeta al cambiar de paso: "sale" (gira hasta quedar de canto) y "entra" (vuelve a girar de frente)
  const [giro, setGiro] = useState<"" | "sale" | "entra">("");

  // Gira la tarjeta y hace el cambio justo cuando está de canto, para que no se vea el salto
  async function girar(cambio: () => void) {
    setGiro("sale");
    await new Promise((r) => setTimeout(r, 200));
    cambio();
    setGiro("entra");
  }

  // Si ya estaba logueado, lo saca del login. En el paso del código redirige enviar(), después de la animación de salida.
  useEffect(() => {
    if (estado === "autenticado" && paso === "clave") router.replace("/");
  }, [estado, paso, router]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      if (paso === "clave") {
        const r = await iniciarSesion(email.trim(), password);
        await girar(() => {
          setActivacion(r.otpauth_uri && r.clave_manual ? { uri: r.otpauth_uri, clave: r.clave_manual } : null);
          setUnidad(r.unidad);
          setPaso("codigo");
        });
      } else {
        await verificarCodigo(codigo.trim());
        setSaliendo(true);
        // El panel lee esta marca para hacer su animación de entrada (solo después de iniciar sesión)
        try {
          sessionStorage.setItem("entrada-panel", "1");
        } catch {}
        await new Promise((r) => setTimeout(r, 450));
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
    girar(() => {
      setPaso("clave");
      setCodigo("");
      setPassword("");
      setError("");
      setAviso("");
      setActivacion(null);
      setUnidad(null);
    });
  }

  return (
    <main className="login">
      <form
        className={`login-tarjeta ${saliendo ? "saliendo" : giro && `giro-${giro}`}`}
        onSubmit={enviar}
        onPointerMove={(e) => {
          // Posición del mouse dentro de la tarjeta, para el resplandor que lo sigue
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
          e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
        }}
        noValidate
      >
        <LogoUnidad unidad={paso === "codigo" ? unidad : null} />
        <h1>Convenios UNLPam</h1>
        <p className="login-unidad">{paso === "codigo" && unidad ? unidad.nombre : "Universidad Nacional de La Pampa"}</p>
        {paso === "clave" ? (
          <div className="paso" key="clave">
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
          </div>
        ) : (
          <div className="paso" key="codigo">
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
          </div>
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
      {saliendo && <span className="onda" aria-hidden="true" />}
    </main>
  );
}
