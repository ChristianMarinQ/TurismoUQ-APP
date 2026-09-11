import { useId } from 'react';
import { Servicio } from '../api/client';

interface Props {
  servicios: Servicio[];
  /** id_servicio -> cantidad contratada. Si no está la clave, no se contrató. */
  seleccion: Map<number, number>;
  /** `cantidad` en 0 significa quitarlo de la reserva. */
  onCambio: (idServicio: number, cantidad: number) => void;
}

/** Tope de unidades por servicio en la interfaz. El PL/SQL permite hasta 50. */
const MAX_UNIDADES = 10;

function precio(valor: number): string {
  return `$${Number(valor).toLocaleString('es-CO')}`;
}

/**
 * Los servicios adicionales de un alojamiento, contratables junto con la
 * reserva.
 *
 * Los de precio 0 (el "Desayuno incluido" típico) se muestran como parte de la
 * estadía y no se pueden contratar: cobrarlos aparte, o mandarlos al backend
 * como una línea de $0, solo ensucia el desglose.
 */
export function SelectorServicios({ servicios, seleccion, onCambio }: Props) {
  const idBase = useId();

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {servicios.map((s) => {
        const gratis = Number(s.PRECIO) <= 0;
        const cantidad = seleccion.get(s.ID_SERVICIO) ?? 0;
        const contratado = cantidad > 0;
        const idCasilla = `${idBase}-serv-${s.ID_SERVICIO}`;

        if (gratis) {
          return (
            <div
              key={s.ID_SERVICIO}
              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/80 px-4 py-3"
            >
              <span className="text-sm font-medium text-zinc-800">{s.NOMBRE}</span>
              <span className="badge shrink-0 bg-emerald-50 text-emerald-700">Incluido</span>
            </div>
          );
        }

        return (
          <div
            key={s.ID_SERVICIO}
            className={`rounded-xl border px-4 py-3 transition-all duration-200 ease-suave ${
              contratado ? 'border-zinc-900 bg-zinc-50 shadow-suave' : 'border-zinc-200/80 hover:border-zinc-300'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={idCasilla} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input
                  id={idCasilla}
                  type="checkbox"
                  checked={contratado}
                  onChange={(e) => onCambio(s.ID_SERVICIO, e.target.checked ? 1 : 0)}
                  className="h-4 w-4 shrink-0 cursor-pointer rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-zinc-800">{s.NOMBRE}</span>
                  {s.DESCRIPCION && (
                    <span className="block truncate text-xs text-zinc-500">{s.DESCRIPCION}</span>
                  )}
                </span>
              </label>
              <span className="shrink-0 text-sm font-semibold text-zinc-900">{precio(s.PRECIO)}</span>
            </div>

            {contratado && (
              <div className="mt-3 flex animate-desplegar items-center justify-between gap-3 border-t border-zinc-200 pt-3">
                <label htmlFor={`${idCasilla}-cant`} className="text-xs text-zinc-500">
                  Cantidad
                </label>
                <select
                  id={`${idCasilla}-cant`}
                  value={cantidad}
                  onChange={(e) => onCambio(s.ID_SERVICIO, Number(e.target.value))}
                  className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm font-medium text-zinc-900 focus:border-zinc-900 focus:outline-none"
                >
                  {Array.from({ length: MAX_UNIDADES }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
