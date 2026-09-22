import { MorphIcon } from 'morphicons/react';
import type { IconNode } from 'lucide';
import { House } from 'lucide';
import { ICONO_TIPO } from '../lib/imagenes';

/**
 * Envoltorio único de los íconos: todos salen del set de Lucide, dibujados
 * con MorphIcon para que, si el ícono cambia (por ejemplo al desplegar un
 * panel), la transición sea un morph del trazo y no un salto. Sin `label`
 * queda aria-hidden, que es lo correcto para los decorativos.
 */
export function Icono({
  icono,
  tamano = 18,
  grosor = 2,
  className,
  label,
}: {
  icono: IconNode;
  tamano?: number;
  grosor?: number;
  className?: string;
  label?: string;
}) {
  return (
    <MorphIcon
      icon={icono}
      size={tamano}
      strokeWidth={grosor}
      color="currentColor"
      reducedMotion="user"
      label={label}
      className={`shrink-0 ${className ?? ''}`}
    />
  );
}

/** Ícono según el tipo de alojamiento, con la casa como respaldo. */
export function IconoTipo({ tipo, tamano = 14, className }: { tipo: string; tamano?: number; className?: string }) {
  return <Icono icono={ICONO_TIPO[tipo] ?? House} tamano={tamano} className={className} />;
}
