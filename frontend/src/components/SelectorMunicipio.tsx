import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as EventoTeclado } from 'react';
import { Municipio } from '../api/client';

interface Props {
  municipios: Municipio[];
  valor: number | '';
  onCambio: (valor: number | '') => void;
  /** true cuando va sobre la portada oscura, para ajustar contraste si hace falta */
  sobreImagen?: boolean;
}

const MARCADOR = '¿A dónde vas? · Todos los municipios';
const TODOS = 'Todos los municipios';

/**
 * Quita tildes y pasa a minúsculas para comparar: así "circasia" encuentra
 * "Circasía" y "GENOVA" encuentra "Génova".
 */
function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Combobox propio para elegir municipio. Reemplaza al <select> nativo, cuya
 * lista desplegable la dibuja el sistema operativo y no se puede estilizar.
 * Sin librerías: solo React y Tailwind.
 */
export function SelectorMunicipio({ municipios, valor, onCambio, sobreImagen = false }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [resaltado, setResaltado] = useState(0);

  const idBase = useId();
  const contenedorRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const busquedaRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  const seleccionado = municipios.find((m) => m.ID_MUNICIPIO === valor);

  const coincidencias = useMemo(() => {
    const consulta = normalizar(busqueda);
    if (!consulta) return municipios;
    return municipios.filter((m) => normalizar(m.NOMBRE).includes(consulta));
  }, [municipios, busqueda]);

  // "Todos los municipios" siempre encabeza la lista, aunque se esté buscando:
  // es la forma de limpiar el filtro sin cerrar el panel.
  const opciones = useMemo(
    () => [
      { id: '' as number | '', nombre: TODOS },
      ...coincidencias.map((m) => ({ id: m.ID_MUNICIPIO as number | '', nombre: m.NOMBRE })),
    ],
    [coincidencias],
  );

  const sinCoincidencias = busqueda.trim() !== '' && coincidencias.length === 0;

  function abrir() {
    setBusqueda('');
    // Arranca el resaltado sobre lo que ya está elegido (0 = "todos").
    setResaltado(valor === '' ? 0 : municipios.findIndex((m) => m.ID_MUNICIPIO === valor) + 1);
    setAbierto(true);
  }

  function cerrar(devolverFoco: boolean) {
    setAbierto(false);
    setBusqueda('');
    if (devolverFoco) botonRef.current?.focus();
  }

  function elegir(id: number | '') {
    onCambio(id);
    cerrar(true);
  }

  // Al abrir, el foco va al campo de búsqueda: se puede escribir de una.
  useEffect(() => {
    if (abierto) busquedaRef.current?.focus();
  }, [abierto]);

  // Mantiene visible la opción resaltada cuando se navega con el teclado.
  useEffect(() => {
    if (!abierto) return;
    const nodo = listaRef.current?.children[resaltado] as HTMLElement | undefined;
    nodo?.scrollIntoView({ block: 'nearest' });
  }, [abierto, resaltado]);

  // Cerrar al hacer clic fuera del componente.
  useEffect(() => {
    if (!abierto) return;
    function alClicFuera(evento: MouseEvent) {
      if (!contenedorRef.current?.contains(evento.target as Node)) {
        setAbierto(false);
        setBusqueda('');
      }
    }
    document.addEventListener('mousedown', alClicFuera);
    return () => document.removeEventListener('mousedown', alClicFuera);
  }, [abierto]);

  function alTeclado(evento: EventoTeclado<HTMLDivElement>) {
    if (evento.key === 'Escape') {
      if (!abierto) return;
      evento.preventDefault();
      cerrar(true);
      return;
    }

    if (!abierto) {
      if (evento.key === 'ArrowDown' || evento.key === 'Enter' || evento.key === ' ') {
        evento.preventDefault();
        abrir();
      }
      return;
    }

    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setResaltado((i) => (i + 1) % opciones.length);
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setResaltado((i) => (i - 1 + opciones.length) % opciones.length);
    } else if (evento.key === 'Home') {
      evento.preventDefault();
      setResaltado(0);
    } else if (evento.key === 'End') {
      evento.preventDefault();
      setResaltado(opciones.length - 1);
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      const opcion = opciones[resaltado];
      if (opcion) elegir(opcion.id);
    } else if (evento.key === 'Tab') {
      cerrar(false);
    }
  }

  // Sobre la portada el botón va dentro de una tarjeta blanca, así que se
  // deja transparente; suelto en un formulario necesita su propio borde.
  const estiloBoton = sobreImagen
    ? 'px-2 bg-transparent hover:bg-zinc-50'
    : 'px-3.5 border border-zinc-200 bg-white shadow-suave hover:border-zinc-300';

  return (
    <div ref={contenedorRef} className="relative" onKeyDown={alTeclado}>
      <button
        ref={botonRef}
        type="button"
        onClick={() => (abierto ? cerrar(false) : abrir())}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-label="Filtrar por municipio"
        className={`flex w-full items-center gap-2 rounded-xl py-2.5 text-left text-[15px] font-medium text-zinc-900
                    transition-all duration-150 ease-suave
                    focus:outline-none focus:ring-4 focus:ring-zinc-900/5 ${estiloBoton}`}
      >
        <span className={`flex-1 truncate ${seleccionado ? 'text-zinc-900' : 'text-zinc-500'}`}>
          {seleccionado ? seleccionado.NOMBRE : MARCADOR}
        </span>
        <span
          aria-hidden
          className={`shrink-0 text-xs text-zinc-400 transition-transform duration-200 ease-suave ${abierto ? 'rotate-180' : ''}`}
        >
          ▼
        </span>
      </button>

      {abierto && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 min-w-[15rem] animate-desplegar overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-elevada">
          <div className="border-b border-zinc-100 p-2">
            <input
              ref={busquedaRef}
              type="text"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setResaltado(0);
              }}
              placeholder="Buscar municipio..."
              aria-label="Buscar municipio"
              aria-controls={`${idBase}-lista`}
              aria-activedescendant={`${idBase}-opcion-${resaltado}`}
              autoComplete="off"
              className="input-field"
            />
          </div>

          <ul
            ref={listaRef}
            id={`${idBase}-lista`}
            role="listbox"
            aria-label="Municipios"
            tabIndex={-1}
            className="max-h-60 overflow-y-auto p-1.5"
          >
            {opciones.map((opcion, i) => {
              const elegida = opcion.id === valor;
              return (
                <li
                  key={String(opcion.id)}
                  id={`${idBase}-opcion-${i}`}
                  role="option"
                  aria-selected={elegida}
                  onMouseEnter={() => setResaltado(i)}
                  onClick={() => elegir(opcion.id)}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150
                              ${i === resaltado ? 'bg-brand-50 text-brand-900' : 'text-zinc-700'}
                              ${elegida ? 'font-semibold' : 'font-medium'}`}
                >
                  <span className="flex-1 truncate">{opcion.nombre}</span>
                  {elegida && (
                    <span className="shrink-0 text-brand-600" aria-hidden>
                      ✓
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {sinCoincidencias && (
            <p className="border-t border-zinc-100 px-4 py-4 text-center text-sm text-zinc-500">
              Ningún municipio coincide
            </p>
          )}
        </div>
      )}
    </div>
  );
}
