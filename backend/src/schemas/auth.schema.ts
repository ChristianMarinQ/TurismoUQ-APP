import { z } from 'zod';

// El campo "sitio" es un honeypot: un <input> invisible para humanos en
// el formulario. Un bot que autocompleta todos los campos de un
// formulario normalmente también lo llena; si llega con algo adentro,
// se descarta la petición como probable bot (ver auth.controller.ts).
export const registroSchema = z.object({
  nombre: z.string().trim().min(1).max(60),
  apellido: z.string().trim().min(1).max(60),
  tipoDocumento: z.enum(['CC', 'CE', 'PA', 'TI']),
  numeroDocumento: z.string().trim().min(4).max(20),
  email: z.string().trim().toLowerCase().email().max(120),
  telefono: z.string().trim().max(20).optional(),
  password: z.string().min(8).max(72), // 72 = límite real de bcrypt
  sitio: z.string().max(0).optional().default(''),
});

export const loginClienteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(72),
});

export const loginAdminSchema = z.object({
  username: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(72),
});
