import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, AlojamientoResumen, Municipio } from '../api/client';
import { Navbar } from '../components/Navbar';
import { EsqueletoTarjetas, ErrorEstado, Vacio } from '../components/EstadosUI';
import { Foto } from '../components/Foto';
import { SelectorMunicipio } from '../components/SelectorMunicipio';
import { Icono, IconoTipo } from '../components/Icono';
import { MapPin, Search, Star, Tent } from 'lucide';
import { fotoAlojamiento, FOTO_PORTADA } from '../lib/imagenes';

export default function Home() {
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [alojamientos, setAlojamientos] = useState<AlojamientoResumen[] | null>(null);
  const [municipioFiltro, setMunicipioFiltro] = useState<number | ''>('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listarMunicipios().then(setMunicipios).catch(() => {});
  }, []);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    api
      .listarAlojamientos(municipioFiltro ? { municipio: municipioFiltro } : undefined)
      .then(setAlojamientos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [municipioFiltro]);

  useEffect(() => { cargar(); }, [cargar]);

  const municipioActivo = municipios.find((m) => m.ID_MUNICIPIO === municipioFiltro);

  return (
    <div className="min-h-screen bg-white">
      <Navbar sobreImagen />

      {/* Portada. Sin overflow-hidden: recortaba el panel del selector de
          municipio, y la foto de fondo ya va con object-cover, no se sale. */}
      <section className="relative isolate">
        <Foto
          src={FOTO_PORTADA}
          semilla={7}
          alt=""
          eager
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-zinc-950/85 via-zinc-950/70 to-zinc-950/85" />

        {/* El navbar va fijo encima de la portada: el padding superior deja
            libre su altura (h-16 / sm:h-20) más el aire del diseño. */}
        <div className="mx-auto max-w-6xl px-5 pb-24 pt-32 sm:pb-32 sm:pt-40 2xl:max-w-7xl">
          <p className="animate-aparecer text-sm font-semibold uppercase tracking-widest text-brand-300">
            Eje cafetero · Colombia
          </p>
          <h1 className="mt-3 max-w-3xl animate-subir text-4xl font-extrabold leading-[1.05] text-white sm:text-6xl xl:text-7xl">
            Dormir entre cafetales<br className="hidden sm:block" /> nunca fue tan fácil.
          </h1>
          <p className="mt-5 max-w-xl animate-subir text-lg text-zinc-300" style={{ animationDelay: '60ms' }}>
            Fincas cafeteras, glampings, hoteles y hostales en los 12 municipios del Quindío.
            Reserva en minutos, paga seguro.
          </p>

          <div
            className="mt-8 flex w-full max-w-lg animate-subir xl:max-w-xl items-center gap-2 sm:gap-3 rounded-2xl bg-white p-2 shadow-elevada"
            style={{ animationDelay: '120ms' }}
          >
            <span className="pl-2 text-brand-600 sm:pl-3"><Icono icono={MapPin} tamano={20} /></span>
            {/* min-w-0: sin él, el texto truncado del selector impone su ancho
                y en celular empuja el botón fuera de la pantalla. */}
            <div className="min-w-0 flex-1">
              <SelectorMunicipio
                municipios={municipios}
                valor={municipioFiltro}
                onCambio={setMunicipioFiltro}
                sobreImagen
              />
            </div>
            <span className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 p-2.5 text-sm font-semibold text-white sm:px-4">
              <Icono icono={Search} tamano={18} />
              <span className="sr-only sm:not-sr-only">Buscar</span>
            </span>
          </div>
        </div>
      </section>

      {/* Resultados */}
      <main className="mx-auto max-w-6xl px-5 py-14 2xl:max-w-7xl">
        {cargando && (
          <>
            <div className="skeleton mb-6 h-7 w-64" />
            <EsqueletoTarjetas />
          </>
        )}

        {!cargando && error && (
          <ErrorEstado mensaje={`No se pudieron cargar los alojamientos: ${error}`} onReintentar={cargar} />
        )}

        {!cargando && !error && alojamientos && alojamientos.length === 0 && (
          <Vacio icono={Tent} titulo="No hay alojamientos para ese filtro" descripcion="Prueba con otro municipio." />
        )}

        {!cargando && !error && alojamientos && alojamientos.length > 0 && (
          <>
            <div className="mb-6 flex animate-aparecer items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900">
                  {municipioActivo ? `Alojamientos en ${municipioActivo.NOMBRE}` : 'Todos los alojamientos'}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">{alojamientos.length} lugares para quedarte</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {alojamientos.map((a, i) => (
                <Link
                  key={a.ID_ALOJAMIENTO}
                  to={`/alojamientos/${a.ID_ALOJAMIENTO}`}
                  className="group animate-subir"
                  style={{ animationDelay: `${Math.min(i, 11) * 40}ms` }}
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-100">
                    <Foto
                      src={fotoAlojamiento(a.ID_ALOJAMIENTO, a.TIPO_ALOJAMIENTO)}
                      semilla={a.ID_ALOJAMIENTO}
                      alt={a.NOMBRE}
                      className="h-full w-full object-cover transition-transform duration-500 ease-suave group-hover:scale-105"
                    />
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-zinc-800 shadow-suave backdrop-blur">
                      <IconoTipo tipo={a.TIPO_ALOJAMIENTO} className="text-brand-700" /> {a.TIPO_ALOJAMIENTO}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold leading-snug text-zinc-900 transition-colors group-hover:text-brand-700">
                        {a.NOMBRE}
                      </h3>
                      <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-zinc-900">
                        <Icono icono={Star} tamano={14} className="fill-amber-400 text-amber-500" />
                        {Number(a.CALIFICACION_PROMEDIO).toFixed(1)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-zinc-500">{a.MUNICIPIO}, Quindío</p>
                    <p className="mt-1.5 text-sm text-zinc-500">
                      Hasta <span className="font-semibold text-zinc-900">{a.CAPACIDAD_MAX}</span> huéspedes
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="mt-10 border-t border-zinc-200/80 py-10">
        <div className="mx-auto max-w-6xl px-5 text-sm text-zinc-500 2xl:max-w-7xl">
          TurismoUQ · Proyecto de Bases de Datos II · Universidad del Quindío
        </div>
      </footer>
    </div>
  );
}
