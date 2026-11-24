"use client";

import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { api } from "@/lib/api";
import { TIPOS } from "@/lib/tipos";


// Todos los campos del convenio, agrupados en las secciones en que se muestran
// Exportado: la pantalla de conflictos usa las mismas etiquetas
export const CAMPOS = [
  { nombre: "codigo", etiqueta: "Código", tipo: "texto", obligatorio: true, grupo: "principal", info: "Código con el que se identifica el convenio. Formato CONV-AAAA-NNN, por ejemplo: CONV-2026-001." },
  { nombre: "tipo", etiqueta: "Tipo", tipo: "tipo", obligatorio: true, grupo: "principal" },
  { nombre: "titulo", etiqueta: "Título", tipo: "texto", obligatorio: true, grupo: "principal", ancho: true },
  { nombre: "unidad_id", etiqueta: "Unidad", tipo: "unidad", obligatorio: true, grupo: "principal", ancho: true },
  { nombre: "fecha_firma", etiqueta: "Fecha de firma", tipo: "fecha", obligatorio: false, grupo: "fechas" },
  { nombre: "fecha_inicio", etiqueta: "Fecha de inicio", tipo: "fecha", obligatorio: false, grupo: "fechas" },
  { nombre: "fecha_vencimiento", etiqueta: "Fecha de vencimiento", tipo: "fecha", obligatorio: false, grupo: "fechas" },
  { nombre: "fecha_preaviso", etiqueta: "Fecha de preaviso", tipo: "fecha", obligatorio: false, grupo: "fechas", info: "Día desde el que hay que avisar si se quiere renovar o terminar el convenio. Se calcula a partir del vencimiento." },
  // "contenido": el texto del convenio. Si se carga el PDF, ya está en el PDF y no se pide.
  { nombre: "objeto", etiqueta: "Objeto", tipo: "largo", obligatorio: true, contenido: true, grupo: "contenido", ancho: true },
  { nombre: "alcance", etiqueta: "Alcance", tipo: "largo", obligatorio: true, contenido: true, grupo: "contenido", ancho: true, info: "Hasta dónde llega el convenio: qué cubre y qué no." },
  { nombre: "obligaciones", etiqueta: "Obligaciones", tipo: "largo", obligatorio: true, contenido: true, grupo: "contenido", ancho: true, info: "Qué se compromete a hacer cada parte." },
  { nombre: "condiciones_rescision", etiqueta: "Condiciones de rescisión", tipo: "largo", obligatorio: true, contenido: true, grupo: "contenido", ancho: true, info: "Cómo y con qué aviso se puede terminar el convenio." },
  { nombre: "marco_legal", etiqueta: "Marco legal", tipo: "largo", obligatorio: true, contenido: true, grupo: "contenido", ancho: true, info: "Normas en las que se apoya el convenio (leyes, ordenanzas)." },
  { nombre: "resolucion", etiqueta: "Resolución", tipo: "texto", obligatorio: false, grupo: "otros", info: "Resolución que aprueba el convenio. Formato libre, por ejemplo: RESHCS 123/2026." },
  { nombre: "expediente", etiqueta: "Expediente", tipo: "texto", obligatorio: false, grupo: "otros", info: "Número de expediente del trámite. Formato libre, por ejemplo: EXP 1234/2026." },
  { nombre: "condiciones_renovacion", etiqueta: "Condiciones de renovación", tipo: "largo", obligatorio: false, grupo: "otros", ancho: true },
  { nombre: "confidencialidad", etiqueta: "Confidencialidad", tipo: "largo", obligatorio: false, grupo: "otros", ancho: true, info: "Cláusula de confidencialidad, si existe." },
  { nombre: "notas", etiqueta: "Notas", tipo: "largo", obligatorio: false, grupo: "otros", ancho: true },
];

const GRUPOS = [
  { id: "principal", titulo: "Datos principales" },
  { id: "fechas", titulo: "Fechas" },
  { id: "contenido", titulo: "Contenido del convenio" },
  { id: "otros", titulo: "Otros datos" },
];

type Unidad = { id: number; nombre: string; sigla: string };

type Props = {
  // Valores de un convenio existente (al editar); vacío al crear
  inicial?: Record<string, unknown>;
  // Hace el POST o el PUT. Si la API responde con error, se muestra en el formulario.
  // El archivo (PDF) solo se pide al crear; al editar llega null.
  enviar: (datos: Record<string, string>, archivo: File | null) => Promise<void>;
};

// La "i" junto a una etiqueta: el texto se ve al pasar el mouse, al enfocarla con el teclado o al tocarla
function Info({ texto }: { texto: string }) {
  const [abierta, setAbierta] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!abierta) return;
    const cerrar = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setAbierta(false);
    };
    document.addEventListener("pointerdown", cerrar);
    document.addEventListener("keydown", cerrar);
    return () => {
      document.removeEventListener("pointerdown", cerrar);
      document.removeEventListener("keydown", cerrar);
    };
  }, [abierta]);

  return (
    <span className={abierta ? "info abierta" : "info"} ref={ref}>
      <button type="button" aria-label="Qué es este campo" aria-expanded={abierta} aria-describedby={id} onClick={() => setAbierta(!abierta)}>
        i
      </button>
      <span className="info-texto" role="tooltip" id={id}>
        {texto}
      </span>
    </span>
  );
}

export default function FormularioConvenio({ inicial, enviar }: Props) {
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      CAMPOS.map((c) => {
        const v = String(inicial?.[c.nombre] ?? "");
        // Las fechas pueden llegar con hora; el input solo quiere AAAA-MM-DD
        return [c.nombre, c.tipo === "fecha" ? v.slice(0, 10) : v];
      })
    )
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState("");
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const router = useRouter();
  const esAlta = !inicial;
  // Al crear se elige cómo cargar el convenio: con su PDF o completando todos los campos
  const [modo, setModo] = useState<"pdf" | "formulario">("pdf");
  const conPdf = esAlta && modo === "pdf";
  // El específico, la pasantía y la adenda se crean ya ligados al convenio del que dependen
  const pideAntecedente = esAlta && ["especifico", "pasantia", "adenda"].includes(valores.tipo);
  const esAdenda = valores.tipo === "adenda";
  const [busqueda, setBusqueda] = useState("");
  const [opciones, setOpciones] = useState<{ id: number; codigo: string; titulo: string; tipo: string }[]>([]);

  // La lista se guarda para poder editar sin conexión (sin ella, "Unidad" quedaría vacía y no deja guardar)
  useEffect(() => {
    api
      .get("/unidades")
      .then((r) => {
        setUnidades(r.data);
        try {
          localStorage.setItem("unidades", JSON.stringify(r.data));
        } catch {}
      })
      .catch(() => {
        let guardadas: Unidad[] = [];
        try {
          guardadas = JSON.parse(localStorage.getItem("unidades") ?? "[]");
        } catch {}
        // Si nunca se cargó la lista, al menos la unidad del propio convenio (viene en la copia de la ficha)
        const propia = inicial?.unidad as Unidad | undefined;
        setUnidades(guardadas.length > 0 ? guardadas : propia ? [propia] : []);
      });
    // Solo al montar: la lista no depende de los valores del formulario
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cambiar(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setValores({ ...valores, [e.target.name]: e.target.value });
  }

  function buscarAntecedente() {
    // Específico y pasantía se apoyan en un marco; la adenda puede modificar cualquier convenio
    const params = esAdenda ? { q: busqueda } : { q: busqueda, tipo: "marco" };
    api
      .get("/agreements", { params })
      .then((r) => setOpciones(r.data.data))
      .catch(() => setOpciones([]));
  }

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrores({});
    setMensaje("");

    // La API también lo controla; acá se avisa antes de mandar
    if (conPdf && !archivo) {
      setErrores({ archivo: "Elegí el PDF del convenio." });
      return;
    }
    if (conPdf && archivo && (archivo.type !== "application/pdf" || archivo.size > 20 * 1024 * 1024)) {
      setErrores({ archivo: "Tiene que ser un PDF de hasta 20 MB." });
      return;
    }

    // Con el PDF no se mandan los campos de contenido
    const datos = { ...valores };
    if (!pideAntecedente) delete datos.antecedente_id;
    if (conPdf) {
      for (const c of CAMPOS) if (c.contenido) delete datos[c.nombre];
    }

    try {
      await enviar(datos, conPdf ? archivo : null);
    } catch (err) {
      const respuesta = isAxiosError(err) ? err.response : undefined;
      if (respuesta?.status === 422 && respuesta.data.errors) {
        // La API manda {campo: [mensajes]}; se muestra el primero bajo cada campo
        const nuevos: Record<string, string> = {};
        for (const campo in respuesta.data.errors) nuevos[campo] = respuesta.data.errors[campo][0];
        setErrores(nuevos);
        setMensaje("Revisá los campos marcados.");
      } else {
        setMensaje(respuesta?.data?.message ?? (err instanceof Error ? err.message : "No se pudo guardar."));
      }
    }
  }

  function campo(c: (typeof CAMPOS)[number]) {
    const obligatorio = "contenido" in c && c.contenido ? esAlta : c.obligatorio;
    const comun = {
      id: c.nombre,
      name: c.nombre,
      value: valores[c.nombre],
      onChange: cambiar,
      required: obligatorio,
      "aria-invalid": errores[c.nombre] ? true : undefined,
      "aria-describedby": errores[c.nombre] ? `error-${c.nombre}` : undefined,
    };

    return (
      <div className={"ancho" in c && c.ancho ? "campo campo-ancho" : "campo"} key={c.nombre}>
        <div className="campo-etiqueta">
          <label htmlFor={c.nombre}>
            {c.etiqueta}
            {obligatorio && " *"}
          </label>
          {"info" in c && c.info && <Info texto={c.info} />}
        </div>

        {c.tipo === "largo" && <textarea rows={3} {...comun} />}
        {c.tipo === "texto" && <input type="text" {...comun} />}
        {c.tipo === "fecha" && <input type="date" {...comun} />}
        {c.tipo === "tipo" && (
          <select {...comun}>
            <option value="">Elegí un tipo</option>
            {Object.entries(TIPOS).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
        )}
        {c.tipo === "unidad" && (
          <select {...comun}>
            <option value="">Elegí una unidad</option>
            <optgroup label="Facultades">
              {unidades
                .filter((u) => !u.nombre.startsWith("Secretaría"))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.sigla} · {u.nombre}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Secretarías">
              {unidades
                .filter((u) => u.nombre.startsWith("Secretaría"))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.sigla} · {u.nombre}
                  </option>
                ))}
            </optgroup>
          </select>
        )}

        {errores[c.nombre] && (
          <p className="campo-error" id={`error-${c.nombre}`}>
            {errores[c.nombre]}
          </p>
        )}
      </div>
    );
  }

  function soltar(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setArrastrando(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setArchivo(f);
  }

  const tamano = archivo ? (archivo.size < 1024 * 1024 ? `${Math.max(1, Math.round(archivo.size / 1024))} KB` : `${(archivo.size / 1024 / 1024).toFixed(1)} MB`) : "";

  return (
    <form className="formulario" onSubmit={guardar}>
      {mensaje && (
        <p className="login-error" role="alert">
          {mensaje}
        </p>
      )}

      {esAlta && (
        <fieldset className="modo-opciones">
          <legend>¿Cómo querés cargar el convenio?</legend>
          <label className="modo-opcion">
            <input type="radio" name="modo" checked={modo === "pdf"} onChange={() => setModo("pdf")} />
            <strong>Subir el PDF</strong>
            <span>Más rápido: el texto del convenio queda en el archivo.</span>
          </label>
          <label className="modo-opcion">
            <input type="radio" name="modo" checked={modo === "formulario"} onChange={() => setModo("formulario")} />
            <strong>Completar el formulario</strong>
            <span>Cargás objeto, alcance, obligaciones y demás a mano.</span>
          </label>
        </fieldset>
      )}

      {conPdf && (
        <section className="ficha-seccion">
          <h2>PDF del convenio</h2>
          <label
            className={`zona-pdf${arrastrando ? " arrastrando" : ""}${archivo ? " con-archivo" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={soltar}
          >
            <input
              id="archivo"
              name="archivo"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              aria-invalid={errores.archivo ? true : undefined}
              aria-describedby={errores.archivo ? "error-archivo" : undefined}
            />
            {archivo ? (
              <>
                <strong>{archivo.name}</strong>
                <span>{tamano} · tocá para elegir otro</span>
              </>
            ) : (
              <>
                <strong>Arrastrá el PDF hasta acá</strong>
                <span>o tocá para elegirlo · hasta 20 MB</span>
              </>
            )}
          </label>
          {errores.archivo && (
            <p className="campo-error" id="error-archivo">
              {errores.archivo}
            </p>
          )}
        </section>
      )}

      {GRUPOS.map((g) => {
        // Con el PDF no se piden los campos de contenido. Al completar el formulario son
        // obligatorios; al editar no, porque un convenio cargado con PDF puede no tenerlos.
        const lista = CAMPOS.filter((c) => c.grupo === g.id && !("contenido" in c && c.contenido && conPdf));
        if (lista.length === 0) return null;
        return (
          <section className="ficha-seccion" key={g.id}>
            <h2>{g.titulo}</h2>
            <div className="campos-rejilla">
              {lista.map(campo)}
              {g.id === "principal" && pideAntecedente && (
                <div className="campo campo-ancho">
                  <div className="campo-etiqueta">
                    <label htmlFor="busqueda-antecedente">{esAdenda ? "Convenio que modifica *" : "Marco al que pertenece *"}</label>
                  </div>
                  <div className="filtros">
                    <input
                      id="busqueda-antecedente"
                      placeholder="Buscar por código o título"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          buscarAntecedente();
                        }
                      }}
                    />
                    <button type="button" onClick={buscarAntecedente}>
                      Buscar
                    </button>
                  </div>
                  <select
                    name="antecedente_id"
                    value={valores.antecedente_id ?? ""}
                    onChange={cambiar}
                    required
                    aria-label={esAdenda ? "Convenio que modifica" : "Marco"}
                    aria-invalid={errores.antecedente_id ? true : undefined}
                    aria-describedby={errores.antecedente_id ? "error-antecedente_id" : undefined}
                  >
                    <option value="">{opciones.length ? "Elegí un convenio" : "Primero buscá un convenio"}</option>
                    {opciones.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.codigo} · {c.titulo} ({TIPOS[c.tipo]})
                      </option>
                    ))}
                  </select>
                  {errores.antecedente_id && (
                    <p className="campo-error" id="error-antecedente_id">
                      {errores.antecedente_id}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        );
      })}

      <div className="formulario-barra">
        <span>Los campos con * son obligatorios.</span>
        <button type="button" className="boton-secundario" onClick={() => router.back()}>
          Cancelar
        </button>
        <button type="submit">Guardar</button>
      </div>
    </form>
  );
}
