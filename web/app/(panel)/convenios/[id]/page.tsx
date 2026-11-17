"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icono } from "@/components/Iconos";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ESTADOS } from "@/lib/estados";
import { diasHasta, fechaLarga } from "@/lib/fechas";
import { PARTES, ROLES_PARTE, ROLES_PERSONA, TIPOS, VINCULOS } from "@/lib/tipos";
import AgregarParte from "./AgregarParte";
import AgregarPersona from "./AgregarPersona";
import AgregarVinculo from "./AgregarVinculo";
import Documentos from "./Documentos";
import Observaciones from "./Observaciones";

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
};

//lista de elementos ed antecedentes y derivados
type Vinculo = { id: number; codigo: string; titulo: string; tipo_vinculo: string };

export default function Ficha() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const [convenio, setConvenio] = useState<Convenio | null>(null);
  const [antecedentes, setAntecedentes] = useState<Vinculo[]>([]);
  const [derivados, setDerivados] = useState<Vinculo[]>([]);
  // Al sumar 1 se vuelven a cargar los datos (lo usan los formularios de agregar)
  const [recarga, setRecarga] = useState(0);
  // Observaciones sin resolver; las informa la sección de observaciones
  const [pendientes, setPendientes] = useState(0);

  //carga datos
  useEffect(() => {
    api.get(`/agreements/${id}`).then((r) => setConvenio(r.data));
    api.get(`/agreements/${id}/links`).then((r) => {
      setAntecedentes(r.data.antecedentes);
      setDerivados(r.data.derivados);
    });
  }, [id, recarga]);

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
  const enBorrador = convenio.estado === "borrador";
  // Consulta no tiene acceso a las observaciones
  const veObservaciones = usuario !== null && usuario?.rol !== "consulta";

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

            {puedeEditar && <AgregarParte convenioId={Number(id)} alGuardar={() => setRecarga(recarga + 1)} />}
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

              {puedeEditar && <AgregarPersona convenioId={Number(id)} alGuardar={() => setRecarga(recarga + 1)} />}
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
            {enBorrador && puedeEditar && <AgregarVinculo convenioId={Number(id)} alGuardar={() => setRecarga(recarga + 1)} />}
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
