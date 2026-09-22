import type { IconNode } from 'lucide';
import { Inbox, TriangleAlert } from 'lucide';
import { Icono } from './Icono';

/** Spinner chiquito, para meter dentro de un botón mientras procesa. */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white ${className}`}
      aria-hidden
    />
  );
}

/** Spinner + mensaje, para mientras se está cargando algo. */
export function Cargando({ mensaje = 'Cargando...' }: { mensaje?: string }) {
  return (
    <div className="flex animate-aparecer flex-col items-center justify-center gap-3 py-16 text-stone-500">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-brand-600" aria-hidden />
      <p className="text-sm">{mensaje}</p>
    </div>
  );
}

/**
 * Esqueleto con la forma de las tarjetas de alojamiento. Se siente más
 * rápido que un spinner porque la página ya toma su forma final mientras
 * llegan los datos, en vez de saltar de "vacío" a "todo de golpe".
 */
export function EsqueletoTarjetas({ cantidad = 6 }: { cantidad?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cantidad }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="skeleton h-36 rounded-none" />
          <div className="space-y-2 p-4">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
            <div className="flex justify-between pt-2">
              <div className="skeleton h-3 w-12" />
              <div className="skeleton h-3 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Esqueleto de filas, para las tablas del panel de administración. */
export function EsqueletoTabla({ filas = 6, columnas = 5 }: { filas?: number; columnas?: number }) {
  return (
    <div className="card divide-y divide-stone-100">
      {Array.from({ length: filas }).map((_, f) => (
        <div key={f} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: columnas }).map((_, c) => (
            <div key={c} className="skeleton h-3 flex-1" style={{ maxWidth: c === 0 ? '28%' : undefined }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Esqueleto de tarjetas apiladas, para listas tipo "mis reservas". */
export function EsqueletoLista({ filas = 3 }: { filas?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="card flex items-center justify-between gap-4 p-5">
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-3 w-3/4" />
          </div>
          <div className="skeleton h-6 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Caja de error, con botón de reintentar opcional. */
export function ErrorEstado({ mensaje, onReintentar }: { mensaje: string; onReintentar?: () => void }) {
  return (
    <div className="flex animate-subir flex-col items-center gap-3 rounded-xl bg-red-50 px-6 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
        <Icono icono={TriangleAlert} tamano={24} />
      </span>
      <p className="font-medium text-red-700">{mensaje}</p>
      {onReintentar && (
        <button onClick={onReintentar} className="btn-secondary">
          Reintentar
        </button>
      )}
    </div>
  );
}

/** Para cuando la carga funcionó pero no hay nada que mostrar. */
export function Vacio({ icono = Inbox, titulo, descripcion }: { icono?: IconNode; titulo: string; descripcion?: string }) {
  return (
    <div className="flex animate-subir flex-col items-center gap-2 rounded-xl border border-dashed border-stone-300 px-6 py-16 text-center text-stone-500">
      <span className="mb-1 grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700">
        <Icono icono={icono} tamano={26} grosor={1.75} />
      </span>
      <p className="font-medium text-stone-700">{titulo}</p>
      {descripcion && <p className="text-sm">{descripcion}</p>}
    </div>
  );
}
