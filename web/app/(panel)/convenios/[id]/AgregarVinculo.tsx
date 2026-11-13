"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { leerError } from "@/lib/errores";
import { TIPOS, VINCULOS } from "@/lib/tipos";

type Resultado = { id: number; codigo: string; titulo: string; tipo: string };

type Props = {
  convenioId: number;
  // Se llama cuando el vínculo se guardó, para que la ficha se vuelva a cargar
  alGuardar: () => void;
};

export default function AgregarVinculo({ convenioId, alGuardar }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [destino, setDestino] = useState("");
  const [tipoVinculo, setTipoVinculo] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState("");

  function buscar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    api.get("/agreements", { params: { q: busqueda } }).then((r) => {
      // Un convenio no se vincula con sí mismo
      setResultados(r.data.data.filter((c: Resultado) => c.id !== convenioId));
      setDestino("");
    });
  }

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrores({});
    setMensaje("");
    try {
      await api.post(`/agreements/${convenioId}/links`, {
        convenio_destino_id: destino,
        tipo_vinculo: tipoVinculo,
      });
      setBusqueda("");
      setResultados([]);
      setDestino("");
      setTipoVinculo("");
      alGuardar();
    } catch (err) {
      const { mensaje, campos } = leerError(err);
      setErrores(campos);
      // Si el error ya sale bajo un campo, no se repite arriba
      setMensaje(campos.convenio_destino_id || campos.tipo_vinculo ? "" : mensaje);
    }
  }

  return (
    <div className="agregar">
      <h3>Agregar antecedente</h3>

      <form className="filtros" onSubmit={buscar}>
        <label htmlFor="busqueda-vinculo" className="solo-lector">
          Buscar convenio por código o título
        </label>
        <input
          id="busqueda-vinculo"
          placeholder="Buscar por código o título"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <button type="submit">Buscar</button>
      </form>

      <form className="formulario" onSubmit={guardar}>
        {mensaje && (
          <p className="login-error" role="alert">
            {mensaje}
          </p>
        )}

        <div className="campo">
          <label htmlFor="destino-vinculo">Convenio antecedente *</label>
          <select
            id="destino-vinculo"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            required
            aria-invalid={errores.convenio_destino_id ? true : undefined}
            aria-describedby={errores.convenio_destino_id ? "error-destino-vinculo" : undefined}
          >
            <option value="">{resultados.length ? "Elegí un convenio" : "Primero buscá un convenio"}</option>
            {resultados.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} · {c.titulo} ({TIPOS[c.tipo]})
              </option>
            ))}
          </select>
          {errores.convenio_destino_id && (
            <p className="campo-error" id="error-destino-vinculo">
              {errores.convenio_destino_id}
            </p>
          )}
        </div>

        <div className="campo">
          <label htmlFor="tipo-vinculo">Tipo de vínculo *</label>
          <select
            id="tipo-vinculo"
            value={tipoVinculo}
            onChange={(e) => setTipoVinculo(e.target.value)}
            required
            aria-invalid={errores.tipo_vinculo ? true : undefined}
            aria-describedby={errores.tipo_vinculo ? "error-tipo-vinculo" : undefined}
          >
            <option value="">Elegí un tipo de vínculo</option>
            {Object.entries(VINCULOS).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
          {errores.tipo_vinculo && (
            <p className="campo-error" id="error-tipo-vinculo">
              {errores.tipo_vinculo}
            </p>
          )}
        </div>

        <button type="submit">Agregar vínculo</button>
      </form>
    </div>
  );
}
