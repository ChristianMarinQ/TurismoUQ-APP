import { useState } from 'react';
import { fotoRespaldo } from '../lib/imagenes';

interface Props {
  src: string;
  /** Semilla para el respaldo, para que la foto alternativa también sea estable. */
  semilla: number;
  alt: string;
  className?: string;
  eager?: boolean;
}

/**
 * <img> con dos protecciones:
 *  - si el servicio de fotos temáticas falla, cae a uno de respaldo en vez
 *    de dejar el ícono de imagen rota;
 *  - mientras carga muestra un fondo gris, para que la tarjeta no "salte".
 */
export function Foto({ src, semilla, alt, className = '', eager = false }: Props) {
  const [url, setUrl] = useState(src);
  const [cargada, setCargada] = useState(false);

  return (
    <img
      src={url}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      onLoad={() => setCargada(true)}
      onError={() => {
        const respaldo = fotoRespaldo(semilla);
        if (url !== respaldo) setUrl(respaldo);
      }}
      className={`${className} ${cargada ? '' : 'bg-zinc-100'}`}
    />
  );
}
