import { z } from 'zod';

export const crearAlojamientoSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  direccion: z.string().trim().min(1).max(200),
  capacidadMax: z.coerce.number().int().positive().max(500),
  idMunicipio: z.coerce.number().int().positive(),
  idTipo: z.coerce.number().int().positive(),
});

export const actualizarAlojamientoSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  direccion: z.string().trim().min(1).max(200),
  capacidadMax: z.coerce.number().int().positive().max(500),
  estado: z.enum(['ACTIVO', 'INACTIVO']),
});

export const crearHabitacionSchema = z.object({
  numero: z.string().trim().min(1).max(10),
  tipoHabitacion: z.enum(['INDIVIDUAL', 'DOBLE', 'TRIPLE', 'SUITE', 'FAMILIAR']),
  capacidad: z.coerce.number().int().positive().max(50),
});

export const actualizarHabitacionSchema = z.object({
  tipoHabitacion: z.enum(['INDIVIDUAL', 'DOBLE', 'TRIPLE', 'SUITE', 'FAMILIAR']),
  capacidad: z.coerce.number().int().positive().max(50),
  estado: z.enum(['DISPONIBLE', 'MANTENIMIENTO', 'INACTIVA']),
});
