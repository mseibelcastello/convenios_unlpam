"use client";

import { useEffect, useState } from "react";
import Ventana from "@/components/Ventana";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { leerError } from "@/lib/errores";
import { ROLES, type Rol } from "@/lib/roles";

type Unidad = { id: number; nombre: string; sigla?: string };

type UsuarioFila = {
  id: number;
  name: string;
  email: string;
  rol: Rol;
  unidad_id: number | null;
  mfa_activado: boolean;
  unidad: Unidad | null;
};

const SIN_FILTROS = { q: "", rol: "", unidad_id: "" };
const FORM_VACIO = { nombre: "", correo: "", clave: "", rol: "gestion" as Rol, unidad_id: "" };

// Gestión y revisión trabajan sobre una unidad; administración y consulta pueden ser globales (igual que la API)
const exigeUnidad = (rol: Rol) => rol === "gestion" || rol === "revision";

function Formulario({
  editando,
  unidades,
  alGuardar,
}: {
  editando: UsuarioFila | null;
  unidades: Unidad[];
  alGuardar: (mensaje: string) => void;
}) {
  const [form, setForm] = useState(
    editando
      ? { nombre: editando.name, correo: editando.email, clave: "", rol: editando.rol, unidad_id: editando.unidad_id ? String(editando.unidad_id) : "" }
      : FORM_VACIO,
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  function cambiar(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setErrores({});
    setError("");
    const cuerpo: Record<string, unknown> = {
      nombre: form.nombre,
      correo: form.correo,
      rol: form.rol,
      unidad_id: form.unidad_id ? Number(form.unidad_id) : null,
    };
    // Al editar, la clave solo se manda si se escribió una nueva
    if (!editando || form.clave) cuerpo.clave = form.clave;
    try {
      if (editando) {
        await api.put(`/users/${editando.id}`, cuerpo);
        alGuardar("Usuario actualizado.");
      } else {
        await api.post("/users", cuerpo);
        alGuardar("Usuario creado.");
      }
    } catch (err) {
      const { mensaje, campos } = leerError(err);
      setErrores(campos);
      if (Object.keys(campos).length === 0) setError(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  const campo = (nombre: string) => ({
    "aria-invalid": errores[nombre] ? true : undefined,
    "aria-describedby": errores[nombre] ? `error-${nombre}` : undefined,
  });
  const mensaje = (nombre: string) =>
    errores[nombre] && (
      <p className="campo-error" id={`error-${nombre}`}>
        {errores[nombre]}
      </p>
    );

  return (
    <form className="formulario" onSubmit={guardar}>
      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}
      <div className="campo">
        <label htmlFor="u-nombre">Nombre *</label>
        <input id="u-nombre" name="nombre" required maxLength={255} value={form.nombre} onChange={cambiar} {...campo("nombre")} />
        {mensaje("nombre")}
      </div>
      <div className="campo">
        <label htmlFor="u-correo">Correo *</label>
        <input id="u-correo" name="correo" type="email" required maxLength={255} value={form.correo} onChange={cambiar} {...campo("correo")} />
        {mensaje("correo")}
      </div>
      <div className="campo">
        <label htmlFor="u-clave">{editando ? "Nueva clave (dejala vacía para no cambiarla)" : "Clave *"}</label>
        <input
          id="u-clave"
          name="clave"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required={!editando}
          value={form.clave}
          onChange={cambiar}
          {...campo("clave")}
        />
        {mensaje("clave")}
      </div>
      <div className="campo">
        <label htmlFor="u-rol">Rol *</label>
        <select id="u-rol" name="rol" value={form.rol} onChange={cambiar} {...campo("rol")}>
          {(Object.keys(ROLES) as Rol[]).map((r) => (
            <option key={r} value={r}>
              {ROLES[r]}
            </option>
          ))}
        </select>
        {mensaje("rol")}
      </div>
      <div className="campo">
        <label htmlFor="u-unidad">Unidad {exigeUnidad(form.rol) ? "*" : "(opcional: sin unidad ve todas)"}</label>
        <select id="u-unidad" name="unidad_id" value={form.unidad_id} onChange={cambiar} required={exigeUnidad(form.rol)} {...campo("unidad_id")}>
          <option value="">{exigeUnidad(form.rol) ? "Elegí una unidad" : "Todas las unidades"}</option>
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>
              {u.sigla ? `${u.sigla} · ${u.nombre}` : u.nombre}
            </option>
          ))}
        </select>
        {mensaje("unidad_id")}
      </div>
      <button type="submit" disabled={enviando}>
        {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Crear usuario"}
      </button>
    </form>
  );
}

export default function Usuarios() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === "administracion";
  const [filtros, setFiltros] = useState(SIN_FILTROS);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [usuarios, setUsuarios] = useState<UsuarioFila[]>([]);
  const [total, setTotal] = useState(0);
  const [ultimaPagina, setUltimaPagina] = useState(1);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [aviso, setAviso] = useState("");
  // null: ventana cerrada; "nuevo": alta; un usuario: edición
  const [ventana, setVentana] = useState<UsuarioFila | "nuevo" | null>(null);

  useEffect(() => {
    if (!esAdmin) return;
    api
      .get("/unidades")
      .then((r) => setUnidades(r.data))
      .catch(() => {});
  }, [esAdmin]);

  useEffect(() => {
    if (!esAdmin) return;
    let vigente = true;
    api
      .get("/users", { params: { ...filtros, page: pagina } })
      .then((r) => {
        if (!vigente) return;
        setUsuarios(r.data.data);
        setTotal(r.data.meta.total);
        setUltimaPagina(r.data.meta.last_page);
      })
      .catch(() => vigente && setError("No se pudo cargar la lista de usuarios."))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [esAdmin, filtros, pagina, recarga]);

  if (usuario && !esAdmin) {
    return (
      <div className="vacio-grande">
        <strong>Sin acceso</strong>
        <span>La gestión de usuarios solo está disponible para administración.</span>
      </div>
    );
  }

  function ir(nuevosFiltros: typeof SIN_FILTROS, nuevaPagina: number) {
    setCargando(true);
    setError("");
    setFiltros(nuevosFiltros);
    setPagina(nuevaPagina);
  }

  const hayFiltros = Object.values(filtros).some(Boolean);

  return (
    <>
      <header className="ficha-cabecera">
        <div>
          <h1>
            Usuarios <span className="contador">{total}</span>
          </h1>
          <p className="subtitulo">Quién entra al sistema, con qué rol y sobre qué unidad.</p>
        </div>
        <button type="button" className="boton-secundario" onClick={() => setVentana("nuevo")}>
          Nuevo usuario
        </button>
      </header>

      <form
        className="filtros"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          ir({ ...filtros, q: busqueda.trim() }, 1);
        }}
      >
        <input type="search" placeholder="Nombre o correo" aria-label="Buscar por nombre o correo" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <select value={filtros.rol} onChange={(e) => ir({ ...filtros, rol: e.target.value }, 1)} aria-label="Rol">
          <option value="">Todos los roles</option>
          {(Object.keys(ROLES) as Rol[]).map((r) => (
            <option key={r} value={r}>
              {ROLES[r]}
            </option>
          ))}
        </select>
        <select value={filtros.unidad_id} onChange={(e) => ir({ ...filtros, unidad_id: e.target.value }, 1)} aria-label="Unidad">
          <option value="">Todas las unidades</option>
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>
              {u.sigla ?? u.nombre}
            </option>
          ))}
        </select>
        <button type="submit">Buscar</button>
        {hayFiltros && (
          <button
            type="button"
            className="boton-texto"
            onClick={() => {
              setBusqueda("");
              ir(SIN_FILTROS, 1);
            }}
          >
            Limpiar
          </button>
        )}
      </form>

      {aviso && (
        <p className="aviso-pendientes" role="status">
          {aviso}
        </p>
      )}

      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}

      {cargando && usuarios.length === 0 && (
        <div className="lista-esqueleto" aria-busy="true" aria-label="Cargando usuarios">
          {Array.from({ length: 5 }, (_, i) => (
            <div className="esqueleto" key={i} />
          ))}
        </div>
      )}

      {!cargando && !error && usuarios.length === 0 && (
        <div className="vacio-grande">
          <strong>No hay usuarios con estos filtros</strong>
          <span>Probá con otra búsqueda.</span>
        </div>
      )}

      {usuarios.length > 0 && (
        <div className="tabla-desplazable">
          <table className="tabla" aria-busy={cargando}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Unidad</th>
                <th>Doble factor</th>
                <th>
                  <span className="lector">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    <small style={{ display: "block" }}>{u.email}</small>
                  </td>
                  <td>
                    <span className="etiqueta-tipo">{ROLES[u.rol] ?? u.rol}</span>
                  </td>
                  <td>{u.unidad ? (u.unidad.sigla ?? u.unidad.nombre) : <span className="sin-dato">Todas</span>}</td>
                  <td>{u.mfa_activado ? "Activado" : <span className="sin-dato">No</span>}</td>
                  <td>
                    <button type="button" className="boton-texto" onClick={() => setVentana(u)} aria-label={`Editar a ${u.name}`}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ultimaPagina > 1 && (
        <div className="paginacion">
          <button className="boton-secundario" disabled={pagina <= 1} onClick={() => ir(filtros, pagina - 1)}>
            Anterior
          </button>
          <span>
            Página {pagina} de {ultimaPagina}
          </span>
          <button className="boton-secundario" disabled={pagina >= ultimaPagina} onClick={() => ir(filtros, pagina + 1)}>
            Siguiente
          </button>
        </div>
      )}

      <Ventana abierta={ventana !== null} titulo={ventana === "nuevo" ? "Nuevo usuario" : "Editar usuario"} alCerrar={() => setVentana(null)}>
        {ventana !== null && (
          <Formulario
            key={ventana === "nuevo" ? "nuevo" : ventana.id}
            editando={ventana === "nuevo" ? null : ventana}
            unidades={unidades}
            alGuardar={(m) => {
              setVentana(null);
              setAviso(m);
              setRecarga((n) => n + 1);
            }}
          />
        )}
      </Ventana>
    </>
  );
}
