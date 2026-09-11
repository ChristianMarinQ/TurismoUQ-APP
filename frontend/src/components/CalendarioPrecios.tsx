import { useEffect, useMemo, useRef, useState } from 'react';
import { api, CalendarioPrecios as Calendario, DiaCalendario } from '../api/client';
import { ErrorEstado } from './EstadosUI';

interface Props {
  idAlojamiento: number;
  /**
   * Habitación elegida. Sin ella se muestra el precio "desde" del alojamiento;
   * con ella, la tarifa de esa habitación, que es lo que hace que el precio
   * cambie de verdad al pasar de una individual a una suite.
   */
  idHabitacion?: number;
  checkin: string;                                  // 'YYYY-MM-DD' o ''
  checkout: string;                                 // 'YYYY-MM-DD' o ''
  onCambio: (checkin: string, checkout: string) => void;
}

/** Un mes concreto del calendario. `mes` va de 1 a 12, no de 0 a 11. */
interface Mes {
  anio: number;
  mes: number;
}

const DIAS_SEMANA = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

/** Cuántos meses pedimos al backend alrededor del mes visible. */
const MESES_ALREDEDOR = 1;

const ESTILO_TEMPORADA: Record<string, string> = {
  BAJA: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  MEDIA: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
  ALTA: 'bg-red-50 text-red-700 hover:bg-red-100',
};

const LEYENDA: { tipo: string; nombre: string; punto: string }[] = [
  { tipo: 'BAJA', nombre: 'Temporada baja', punto: 'bg-emerald-100 ring-emerald-300' },
  { tipo: 'MEDIA', nombre: 'Temporada media', punto: 'bg-amber-100 ring-amber-300' },
  { tipo: 'ALTA', nombre: 'Temporada alta', punto: 'bg-red-100 ring-red-300' },
];

/**
 * Ojo con las zonas horarias: `new Date('2026-09-01')` se interpreta como UTC
 * y en Colombia (UTC-5) cae el día anterior. Por eso todas las fechas se
 * construyen y se formatean a mano, siempre en hora local.
 */
function aISO(f: Date): string {
  const mes = String(f.getMonth() + 1).padStart(2, '0');
  const dia = String(f.getDate()).padStart(2, '0');
  return `${f.getFullYear()}-${mes}-${dia}`;
}

function deISO(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}

/** Hoy a las 00:00 en local, para comparar días sin que estorbe la hora. */
function hoyLocal(): Date {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

/** Índice ordinal del mes, para compararlos y sumarlos sin líos. */
function indiceMes(m: Mes): number {
  return m.anio * 12 + (m.mes - 1);
}

function desdeIndice(indice: number): Mes {
  return { anio: Math.floor(indice / 12), mes: (indice % 12) + 1 };
}

function sumarMeses(m: Mes, cantidad: number): Mes {
  return desdeIndice(indiceMes(m) + cantidad);
}

/** Clave 'YYYY-MM' con la que cacheamos los meses ya pedidos. */
function claveMes(m: Mes): string {
  return `${m.anio}-${String(m.mes).padStart(2, '0')}`;
}

function diasDelMes(m: Mes): number {
  return new Date(m.anio, m.mes, 0).getDate();
}

/** Lunes = 0 ... domingo = 6. `getDay()` devuelve 0 para domingo, hay que rotar. */
function desfaseInicial(m: Mes): number {
  return (new Date(m.anio, m.mes - 1, 1).getDay() + 6) % 7;
}

function nombreMes(m: Mes): string {
  const texto = new Date(m.anio, m.mes - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function fechaLarga(iso: string): string {
  return deISO(iso).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Precio corto para que quepa en la celda: 120000 -> "$120k". */
function precioCorto(valor: number): string {
  if (valor >= 1_000_000) return `$${(valor / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (valor >= 1_000) return `$${Math.round(valor / 1_000)}k`;
  return `$${valor}`;
}

function precioLargo(valor: number): string {
  return `$${valor.toLocaleString('es-CO')}`;
}

/**
 * Calendario mensual con el precio de cada noche, coloreado por temporada:
 * de un vistazo se ve qué fechas son caras y cuáles baratas. La selección es
 * de rango (primer clic entrada, segundo clic salida) y se comunica hacia
 * arriba con `onCambio`.
 */
export function CalendarioPrecios({ idAlojamiento, idHabitacion, checkin, checkout, onCambio }: Props) {
  const hoy = useMemo(hoyLocal, []);
  const mesActual = useMemo<Mes>(() => ({ anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 }), [hoy]);

  const [mesVisible, setMesVisible] = useState<Mes>(() => {
    if (!checkin) return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
    const f = deISO(checkin);
    return { anio: f.getFullYear(), mes: f.getMonth() + 1 };
  });

  // Caché en memoria: los días ya traídos no se vuelven a pedir al navegar
  // entre meses. `version` sólo existe para re-renderizar cuando la caché
  // cambia, porque vive en refs y no en el estado.
  const cache = useRef(new Map<string, DiaCalendario>());
  const mesesPedidos = useRef(new Set<string>());
  const mesesListos = useRef(new Set<string>());
  // La caché es de un alojamiento Y una habitación concretos. Si solo mirara el
  // alojamiento, al cambiar de habitación seguiríamos mostrando los precios de
  // la anterior, que es justo el fallo que esto viene a corregir.
  const claveCache = `${idAlojamiento}:${idHabitacion ?? ''}`;
  const idCacheado = useRef(claveCache);
  const [version, setVersion] = useState(0);

  const [resumen, setResumen] = useState<Calendario['resumen'] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reintento, setReintento] = useState(0);

  useEffect(() => {
    // Si cambia el alojamiento o la habitación, la caché anterior ya no sirve.
    if (idCacheado.current !== claveCache) {
      idCacheado.current = claveCache;
      cache.current.clear();
      mesesPedidos.current.clear();
      mesesListos.current.clear();
      setResumen(null);
    }

    // Pedimos el mes visible y sus vecinos, saltando los que ya tenemos y
    // los anteriores al mes actual (que ni siquiera son navegables).
    const faltantes: Mes[] = [];
    for (let salto = -MESES_ALREDEDOR; salto <= MESES_ALREDEDOR; salto++) {
      const m = sumarMeses(mesVisible, salto);
      if (indiceMes(m) < indiceMes(mesActual)) continue;
      if (!mesesPedidos.current.has(claveMes(m))) faltantes.push(m);
    }
    if (faltantes.length === 0) return;

    faltantes.sort((a, b) => indiceMes(a) - indiceMes(b));
    const claves = faltantes.map(claveMes);
    claves.forEach((c) => mesesPedidos.current.add(c));

    const primero = faltantes[0];
    const ultimo = faltantes[faltantes.length - 1];
    const desde = `${claveMes(primero)}-01`;
    const hasta = aISO(new Date(ultimo.anio, ultimo.mes, 0));

    let vivo = true;
    let resuelta = false;
    setCargando(true);
    setError(null);

    api.calendarioPrecios(idAlojamiento, desde, hasta, idHabitacion)
      .then((datos) => {
        resuelta = true;
        // La caché se llena SIEMPRE, aunque este efecto ya se haya limpiado.
        // Descartar la respuesta por estar "muerto" dejaba los meses marcados
        // como pedidos pero nunca listos, y el calendario se quedaba cargando
        // para siempre (ver la nota sobre StrictMode en el cleanup).
        datos.dias.forEach((d) => cache.current.set(d.FECHA, d));
        claves.forEach((c) => mesesListos.current.add(c));
        if (!vivo) return;
        setResumen((previo) => fusionarResumen(previo, datos.resumen));
        setVersion((v) => v + 1);
      })
      .catch((e) => {
        resuelta = true;
        // Si falló, los soltamos para que el reintento vuelva a pedirlos.
        claves.forEach((c) => mesesPedidos.current.delete(c));
        if (!vivo) return;
        setError((e as Error).message);
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });

    return () => {
      vivo = false;
      // En desarrollo, StrictMode monta el componente, lo desmonta y lo vuelve
      // a montar. Los refs sobreviven a ese ciclo, así que si dejáramos los
      // meses marcados como "pedidos" con la petición aún en vuelo, el segundo
      // montaje los daría por pedidos y saldría por el `return` de arriba sin
      // volver a pedirlos nunca. Soltarlos aquí hace que el remontaje los pida
      // otra vez; la respuesta de la primera petición igual entra a la caché.
      if (!resuelta) claves.forEach((c) => mesesPedidos.current.delete(c));
    };
  }, [idAlojamiento, idHabitacion, claveCache, mesVisible, mesActual, reintento]);

  // `version` está en las dependencias a propósito: la caché vive en un ref,
  // así que es lo que ata este cálculo a los datos que van llegando.
  const celdas = useMemo(() => {
    const total = diasDelMes(mesVisible);
    const lista: { iso: string; dia: number; datos: DiaCalendario | undefined }[] = [];
    for (let dia = 1; dia <= total; dia++) {
      const iso = aISO(new Date(mesVisible.anio, mesVisible.mes - 1, dia));
      lista.push({ iso, dia, datos: cache.current.get(iso) });
    }
    return lista;
  }, [mesVisible, version]);

  const noches = checkin && checkout
    ? Math.round((deISO(checkout).getTime() - deISO(checkin).getTime()) / 86400000)
    : 0;

  // Se cobran las noches, no los días: la noche de salida no cuenta.
  const totalRango = useMemo(() => {
    if (noches <= 0) return 0;
    let suma = 0;
    const cursor = deISO(checkin);
    for (let i = 0; i < noches; i++) {
      const datos = cache.current.get(aISO(cursor));
      suma += datos?.VALOR_NOCHE ?? 0;
      cursor.setDate(cursor.getDate() + 1);
    }
    return suma;
  }, [checkin, noches, version]);

  function alHacerClic(iso: string) {
    // Primer clic: entrada. Segundo: salida. Tercero (o uno anterior a la
    // entrada): reinicia la selección desde ahí.
    if (!checkin || (checkin && checkout)) {
      onCambio(iso, '');
      return;
    }
    if (iso <= checkin) {
      onCambio(iso, '');
      return;
    }
    onCambio(checkin, iso);
  }

  const mesListo = mesesListos.current.has(claveMes(mesVisible));
  const puedeRetroceder = indiceMes(mesVisible) > indiceMes(mesActual);

  // La tabla TEMPORADA solo tiene rangos cargados para 2026, así que a partir
  // de enero de 2027 el mes llega entero sin tarifa. Sin un aviso, el usuario
  // ve una rejilla gris con guiones y no entiende si está cargando o si el
  // lugar está agotado.
  const mesSinTarifas = mesListo && celdas.every((c) => c.datos?.VALOR_NOCHE == null);

  return (
    <div className="animate-aparecer">
      {/* Cabecera con el mes y las flechas */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMesVisible(sumarMeses(mesVisible, -1))}
          disabled={!puedeRetroceder}
          aria-label="Mes anterior"
          className="grid h-8 w-8 place-items-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-transparent"
        >
          ‹
        </button>
        <p className="text-sm font-semibold text-zinc-900" aria-live="polite">{nombreMes(mesVisible)}</p>
        <button
          type="button"
          onClick={() => setMesVisible(sumarMeses(mesVisible, 1))}
          aria-label="Mes siguiente"
          className="grid h-8 w-8 place-items-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100"
        >
          ›
        </button>
      </div>

      {/* Encabezados de los días de la semana */}
      <div className="mt-3 grid grid-cols-7 gap-1">
        {DIAS_SEMANA.map((d) => (
          <span key={d} className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            {d}
          </span>
        ))}
      </div>

      {error && !mesListo ? (
        <div className="mt-2">
          <ErrorEstado
            mensaje={error}
            onReintentar={() => { setError(null); setReintento((r) => r + 1); }}
          />
        </div>
      ) : cargando && !mesListo ? (
        <EsqueletoRejilla />
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: desfaseInicial(mesVisible) }).map((_, i) => (
            <div key={`hueco-${i}`} aria-hidden />
          ))}

          {celdas.map(({ iso, dia, datos }) => {
            const pasado = deISO(iso).getTime() < hoy.getTime();
            const valor = datos?.VALOR_NOCHE ?? null;
            const seleccionable = !pasado && valor !== null;

            const esEntrada = iso === checkin;
            const esSalida = iso === checkout;
            const esExtremo = esEntrada || esSalida;
            const enRango = Boolean(checkin && checkout && iso > checkin && iso < checkout);

            let clases: string;
            if (esExtremo) {
              clases = 'bg-zinc-900 text-white shadow-suave';
            } else if (enRango) {
              clases = 'bg-zinc-100 text-zinc-800 ring-1 ring-inset ring-zinc-200';
            } else if (pasado) {
              clases = 'text-zinc-300 opacity-60';
            } else if (valor === null) {
              clases = 'bg-zinc-50 text-zinc-300';
            } else {
              clases = ESTILO_TEMPORADA[datos?.TIPO ?? ''] ?? 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100';
            }

            const etiqueta = valor !== null
              ? `${fechaLarga(iso)}, ${precioLargo(valor)} por noche${datos?.TEMPORADA ? `, ${datos.TEMPORADA}` : ''}`
              : `${fechaLarga(iso)}, sin tarifa disponible`;

            return (
              <button
                key={iso}
                type="button"
                onClick={() => alHacerClic(iso)}
                disabled={!seleccionable}
                aria-label={etiqueta}
                aria-pressed={esExtremo || enRango}
                className={`flex h-12 flex-col items-center justify-center rounded-lg transition-colors duration-150 ease-suave disabled:cursor-not-allowed ${clases}`}
              >
                <span className="text-sm font-semibold leading-none">{dia}</span>
                <span className="mt-1 text-[10px] font-medium leading-none opacity-80">
                  {valor !== null ? precioCorto(valor) : '—'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {mesSinTarifas && (
        <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2.5 text-center text-xs text-zinc-500">
          Todavía no hay tarifas publicadas para este mes.
        </p>
      )}

      {/* Leyenda de temporadas */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-zinc-200/80 pt-3">
        {LEYENDA.map((l) => (
          <span key={l.tipo} className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <span className={`h-2.5 w-2.5 rounded-full ring-1 ${l.punto}`} aria-hidden />
            {l.nombre}
          </span>
        ))}
      </div>

      {resumen && resumen.MINIMO !== null && resumen.MAXIMO !== null && (
        <p className="mt-2 text-[11px] text-zinc-400">
          Entre {precioLargo(resumen.MINIMO)} y {precioLargo(resumen.MAXIMO)} por noche
        </p>
      )}

      {/* Total del rango elegido */}
      {noches > 0 && (
        <div className="mt-3 flex animate-desplegar items-baseline justify-between rounded-xl bg-zinc-50 px-3 py-2.5">
          <span className="text-sm text-zinc-600">
            {noches} {noches === 1 ? 'noche' : 'noches'}
          </span>
          <span className="text-sm font-bold text-zinc-900">{precioLargo(totalRango)}</span>
        </div>
      )}
    </div>
  );
}

/** Esqueleto con la forma de la rejilla, mientras llegan los precios. */
function EsqueletoRejilla({ filas = 5 }: { filas?: number }) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: filas * 7 }).map((_, i) => (
        <div key={i} className="skeleton h-12 rounded-lg" />
      ))}
    </div>
  );
}

/** El resumen se va ampliando a medida que llegan más meses. */
function fusionarResumen(previo: Calendario['resumen'] | null, nuevo: Calendario['resumen']): Calendario['resumen'] {
  if (!previo) return nuevo;
  return {
    MINIMO: menor(previo.MINIMO, nuevo.MINIMO),
    MAXIMO: mayor(previo.MAXIMO, nuevo.MAXIMO),
  };
}

function menor(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}

function mayor(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}
