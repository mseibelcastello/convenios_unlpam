"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icono } from "@/components/Iconos";
import { useAuth } from "@/lib/auth";
import { useCola, useConCopiaLocal } from "@/lib/local";
import { ESTADOS } from "@/lib/estados";
import { diasHasta, fechaLarga } from "@/lib/fechas";
import { PARTES, ROLES_PARTE, ROLES_PERSONA, TIPOS, VINCULOS } from "@/lib/tipos";
import AgregarParte from "./AgregarParte";
import AgregarPersona from "./AgregarPersona";
import AgregarVinculo from "./AgregarVinculo";
import Dictamen from "./Dictamen";
import Documentos from "./Documentos";
import Observaciones from "./Observaciones";
import LineaDeVida from "./LineaDeVida";
import QrFicha from "./QrFicha";

type Convenio = {
  codigo: string;
  titulo: string;
  tipo: string;
  estado: string;
  // Pueden faltar si el convenio se cargó con su PDF
  objeto: string | null;
  alcance: string | null;
  resolucion: string | null;
  expediente: string | null;
  fecha_firma: string | null;
  fecha_inicio: string | null;
  fecha_vencimiento: string | null;
  fecha_preaviso: string | null;
  unidad: { nombre: string; sigla?: string };
  partes: {
    id: number;
    nombre: string;
    tipo: string;
    representante: string | null;
    cargo_representante: string | null;
    pivot: { rol_parte: string };
  }[];
  // Consulta no recibe las personas
  personas?: { id: number; nombre: string; pivot: { rol: string; desde: string | null; hasta: string | null } }[];
  // Token del QR de la ficha (null si todavía no se generó)
  qr_token: string | null;
};

//lista de elementos ed antecedentes y derivados
type Vinculo = { id: number; codigo: string; titulo: string; tipo_vinculo: string };

function fechaHoraCorta(iso: string) {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short", hour12: false });
}

export default function Ficha() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const convenioId = Number(id);
  // Al sumar 1 se vuelven a cargar los datos (lo usan los formularios de agregar)
  const [recarga, setRecarga] = useState(0);
  // Cada vez que se abre, se guarda en IndexedDB; sin conexión se muestra lo guardado
  const lectura = useConCopiaLocal<Convenio>(`/agreements/${id}`, convenioId, "datos", recarga);
  const vinculos = useConCopiaLocal<{ antecedentes: Vinculo[]; derivados: Vinculo[] }>(
    `/agreements/${id}/links`,
    convenioId,
    "vinculos",
    recarga,
  );
  const convenio = lectura.datos;
  const antecedentes = vinculos.datos?.antecedentes ?? [];
  const derivados = vinculos.datos?.derivados ?? [];
  // Ediciones hechas sin conexión que todavía no se mandaron (se actualiza sola cuando se envían)
  const { pendientes: cola } = useCola();
  const cambiosPendientes = cola.filter((c) => c.convenio_id === convenioId).length;
  const anteriores = useRef(cambiosPendientes);
  // Observaciones sin resolver; las informa la sección de observaciones
  const [pendientes, setPendientes] = useState(0);
  // Confirmación después de aprobar o devolver (la sección de revisión ya no se muestra)
  const [avisoRevision, setAvisoRevision] = useState("");

  // Cuando se envían los cambios de este convenio, se vuelve a pedir para mostrar cómo quedó
  useEffect(() => {
    if (cambiosPendientes < anteriores.current) setRecarga((n) => n + 1);
    anteriores.current = cambiosPendientes;
  }, [cambiosPendientes]);

  if (lectura.error === 404) {
    return (
      <div className="vacio-grande">
        <strong>Convenio no encontrado</strong>
        <span>No existe o no tenés acceso.</span>
      </div>
    );
  }

  // Sin conexión y nunca abierto en este navegador: no hay copia que mostrar
  if (lectura.sinConexion && !convenio) {
    return (
      <div className="vacio-grande" role="status">
        <strong>Sin conexión</strong>
        <span>Este convenio todavía no se abrió en este navegador, así que no hay una copia guardada para mostrar.</span>
      </div>
    );
  }

  if (!convenio) {
    return (
      <div className="lista-esqueleto" aria-busy="true" aria-label="Cargando convenio">
        <div className="esqueleto" style={{ minHeight: "7rem" }} />
        <div className="esqueleto" />
        <div className="esqueleto" />
      </div>
    );
  }

  const puedeEditar = usuario?.rol === "administracion" || usuario?.rol === "gestion";
  // Agregar partes, personas o vínculos necesita la API; sin conexión solo queda editar (va a la cola)
  const puedeAgregar = puedeEditar && !lectura.sinConexion;
  const enBorrador = convenio.estado === "borrador";
  // Consulta no tiene acceso a las observaciones
  const veObservaciones = usuario !== null && usuario?.rol !== "consulta";
  // Solo revisión aprueba o devuelve, y solo mientras el convenio está en revisión
  // (sin conexión no se puede aprobar ni devolver, así que no se ofrece)
  const puedeDictaminar = usuario?.rol === "revision" && convenio.estado === "revision" && !lectura.sinConexion;

  // La vigencia, en el orden en que ocurre
  const dias = convenio.fecha_vencimiento ? diasHasta(convenio.fecha_vencimiento) : null;
  const avisoVencimiento = convenio.estado === "firmado" && dias !== null && dias <= 30;
  const fechas = [
    { etiqueta: "Firma", valor: convenio.fecha_firma },
    { etiqueta: "Inicio", valor: convenio.fecha_inicio },
    { etiqueta: "Preaviso", valor: convenio.fecha_preaviso },
  ];

  return (
    <>
      <Link href="/convenios" className="volver">
        <Icono nombre="volver" />
        <span>Volver al listado</span>
      </Link>

      {lectura.sinConexion && (
        <div className="aviso-sin-conexion" role="status">
          <Icono nombre="sin-conexion" />
          <p>
            <strong>Sin conexión</strong>
            <span>
              Estás viendo la copia guardada en este navegador
              {lectura.guardadoEn && ` (${fechaHoraCorta(lectura.guardadoEn)})`}. Puede no estar actualizada, y los
              cambios no se pueden enviar hasta que vuelva la red.
            </span>
          </p>
        </div>
      )}

      {cambiosPendientes > 0 && (
        <p className="aviso-pendientes" role="status">
          {cambiosPendientes === 1
            ? "Tenés 1 cambio hecho sin conexión que todavía no se envió."
            : `Tenés ${cambiosPendientes} cambios hechos sin conexión que todavía no se enviaron.`}
        </p>
      )}

      <header className="ficha-cabecera">
        <div>
          <span className="codigo-ficha">{convenio.codigo}</span>
          <h1>{convenio.titulo}</h1>
          <p className="ficha-meta">
            <span className="etiqueta-tipo">{TIPOS[convenio.tipo]}</span>
            <span title={convenio.unidad.nombre}>{convenio.unidad.nombre}</span>
            <span className={`insignia insignia-${convenio.estado}`}>{ESTADOS[convenio.estado]}</span>
          </p>
        </div>
        {/* Solo se edita en borrador, y solo administración y gestión */}
        {enBorrador && puedeEditar && (
          <Link className="boton-secundario" href={`/convenios/${id}/editar`}>
            Editar convenio
          </Link>
        )}
      </header>

      {veObservaciones && pendientes > 0 && (
        <div className="aviso-observaciones" role="status">
          <Icono nombre="alerta" />
          <p>
            <strong>
              {pendientes === 1 ? "Hay 1 observación sin resolver" : `Hay ${pendientes} observaciones sin resolver`}
            </strong>
            <span>El trámite no avanza hasta que revisión las dé por resueltas.</span>
          </p>
          <a href="#observaciones" className="boton-secundario">
            Ver observaciones
          </a>
        </div>
      )}

      {avisoRevision && (
        <div className="ficha-seccion dictamen" role="status">
          <p className="dictamen-hecho">{avisoRevision}</p>
          <Link href="/revision" className="boton-secundario">
            Volver al panel de revisión
          </Link>
        </div>
      )}

      {puedeDictaminar && (
        <Dictamen
          convenioId={Number(id)}
          pendientes={pendientes}
          alCambiar={(mensaje) => {
            setAvisoRevision(mensaje);
            setRecarga(recarga + 1);
          }}
        />
      )}

      {/* A todo el ancho: la línea de tiempo es horizontal */}
      <LineaDeVida convenioId={convenioId} recarga={recarga} />

      <div className="ficha-rejilla">
        <div className="ficha-columna">
          <section className="ficha-seccion">
            <h2>Datos del convenio</h2>
            <dl className="datos-lista">
              <div className="ancho">
                <dt>Objeto</dt>
                <dd>{convenio.objeto ?? <span className="sin-dato">Sin cargar</span>}</dd>
              </div>
              <div className="ancho">
                <dt>Alcance</dt>
                <dd>{convenio.alcance ?? <span className="sin-dato">Sin cargar</span>}</dd>
              </div>
              <div>
                <dt>Resolución</dt>
                <dd>{convenio.resolucion ?? <span className="sin-dato">Sin cargar</span>}</dd>
              </div>
              <div>
                <dt>Expediente</dt>
                <dd>{convenio.expediente ?? <span className="sin-dato">Sin cargar</span>}</dd>
              </div>
            </dl>
          </section>

          {veObservaciones && (
            <Observaciones convenioId={Number(id)} estadoConvenio={convenio.estado} alContarPendientes={setPendientes} />
          )}

          <Documentos convenioId={Number(id)} />

          <section className="ficha-seccion">
            <h2>
              Partes <span className="contador">{convenio.partes.length}</span>
            </h2>
            <ul className="tarjetas-lista">
              {convenio.partes.map((p) => (
                <li key={p.id}>
                  <strong>{p.nombre}</strong>
                  <span className="parte-datos">
                    <span className={p.pivot.rol_parte === "UNLPam" ? "rol rol-unlpam" : "rol"}>{ROLES_PARTE[p.pivot.rol_parte]}</span>
                    <span className="etiqueta-tipo">{PARTES[p.tipo]}</span>
                  </span>
                  {p.representante && (
                    <small>
                      {p.representante}
                      {p.cargo_representante && ` · ${p.cargo_representante}`}
                    </small>
                  )}
                </li>
              ))}
            </ul>

            {puedeAgregar && <AgregarParte convenioId={Number(id)} alGuardar={() => setRecarga(recarga + 1)} />}
          </section>

          {convenio.personas && (
            <section className="ficha-seccion">
              <h2>
                Personas <span className="contador">{convenio.personas.length}</span>
              </h2>
              {convenio.personas.length === 0 && <p className="vacio">Todavía no hay personas vinculadas.</p>}
              <ul className="tarjetas-lista">
                {convenio.personas.map((p) => (
                  <li key={`${p.id}-${p.pivot.rol}`}>
                    <strong>{p.nombre}</strong>
                    <span className="parte-datos">
                      <span className="rol">{ROLES_PERSONA[p.pivot.rol]}</span>
                    </span>
                    {(p.pivot.desde || p.pivot.hasta) && (
                      <small>
                        {p.pivot.desde && `Desde ${fechaLarga(p.pivot.desde)}`}
                        {p.pivot.desde && p.pivot.hasta && " · "}
                        {p.pivot.hasta && `Hasta ${fechaLarga(p.pivot.hasta)}`}
                      </small>
                    )}
                  </li>
                ))}
              </ul>

              {puedeAgregar && <AgregarPersona convenioId={Number(id)} alGuardar={() => setRecarga(recarga + 1)} />}
            </section>
          )}
        </div>

        <aside className="ficha-lateral">
          <section className="ficha-seccion vigencia-seccion">
            <h2>Vigencia</h2>
            <ol className="vigencia">
              {fechas.map((f) => (
                <li key={f.etiqueta} className={f.valor ? "" : "falta"}>
                  <span>{f.etiqueta}</span>
                  <strong>{f.valor ? fechaLarga(f.valor) : "Sin registrar"}</strong>
                </li>
              ))}
              <li className={convenio.fecha_vencimiento ? "" : "falta"}>
                <span>Vencimiento</span>
                <strong>{convenio.fecha_vencimiento ? fechaLarga(convenio.fecha_vencimiento) : "Sin vencimiento registrado"}</strong>
                {avisoVencimiento && dias !== null && (
                  <span className={`urgencia ${dias < 0 ? "urgencia-vencido" : "urgencia-pronto"}`}>
                    {dias < 0 ? `Venció hace ${-dias} d` : dias === 0 ? "Vence hoy" : `Vence en ${dias} d`}
                  </span>
                )}
              </li>
            </ol>
          </section>

          <QrFicha
            convenioId={convenioId}
            codigo={convenio.codigo}
            token={convenio.qr_token ?? null}
            puedeGenerar={puedeAgregar}
            alGenerar={() => setRecarga(recarga + 1)}
          />

          <section className="ficha-seccion">
            <h2>
              Antecedentes <span className="contador">{antecedentes.length}</span>
            </h2>
            {antecedentes.length === 0 && <p className="vacio">Ninguno por ahora.</p>}
            <ul className="filas">
              {antecedentes.map((v) => (
                <li key={v.id}>
                  <Link href={`/convenios/${v.id}`}>
                    <strong>{v.codigo}</strong>
                    <span>{v.titulo}</span>
                  </Link>
                  <span className="etiqueta-tipo">{VINCULOS[v.tipo_vinculo]}</span>
                </li>
              ))}
            </ul>

            {/* Los vínculos solo se cambian en borrador */}
            {enBorrador && puedeAgregar && <AgregarVinculo convenioId={Number(id)} alGuardar={() => setRecarga(recarga + 1)} />}
          </section>

          <section className="ficha-seccion">
            <h2>
              Derivados <span className="contador">{derivados.length}</span>
            </h2>
            {derivados.length === 0 && <p className="vacio">Ninguno por ahora.</p>}
            <ul className="filas">
              {derivados.map((v) => (
                <li key={v.id}>
                  <Link href={`/convenios/${v.id}`}>
                    <strong>{v.codigo}</strong>
                    <span>{v.titulo}</span>
                  </Link>
                  <span className="etiqueta-tipo">{VINCULOS[v.tipo_vinculo]}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
