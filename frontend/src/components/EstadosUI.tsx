/** Spinner + mensaje, para mientras se está cargando algo. */
export function Cargando({ mensaje = 'Cargando...' }: { mensaje?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-stone-500">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-brand-600" aria-hidden />
      <p className="text-sm">{mensaje}</p>
    </div>
  );
}

/** Caja de error, con botón de reintentar opcional. */
export function ErrorEstado({ mensaje, onReintentar }: { mensaje: string; onReintentar?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-red-50 px-6 py-10 text-center">
      <span className="text-3xl" aria-hidden>⚠️</span>
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
export function Vacio({ icono = '📭', titulo, descripcion }: { icono?: string; titulo: string; descripcion?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-stone-300 px-6 py-16 text-center text-stone-500">
      <span className="text-4xl" aria-hidden>{icono}</span>
      <p className="font-medium text-stone-700">{titulo}</p>
      {descripcion && <p className="text-sm">{descripcion}</p>}
    </div>
  );
}
