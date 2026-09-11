/**
 * Fotos de los alojamientos.
 *
 * La base de datos del proyecto no guarda imágenes (no era parte del modelo
 * académico), así que se usa un catálogo curado de fotos reales de Wikimedia
 * Commons, todas con licencia libre. La elección es determinista
 * (`id % lista.length`), de modo que un alojamiento muestra SIEMPRE la misma
 * foto entre recargas.
 *
 * Importante sobre las URL: Wikimedia solo entrega las miniaturas que ya tiene
 * generadas. Pedir un ancho arbitrario (640px, 800px…) responde 400, por eso
 * todas las URL de abajo están fijadas al ancho que el servidor sí sirve
 * (1280px) o al archivo original cuando es pequeño. No las reescribas a otro
 * ancho: se rompen.
 *
 * Cuando tengas fotos propias, reemplaza estas funciones por la URL que venga
 * de la base de datos.
 */

const C = 'https://upload.wikimedia.org/wikipedia/commons';
const T = `${C}/thumb`;

/** Fincas cafeteras del Quindío (hacienda El Ocaso, Salento). */
const FINCAS = [
  `${T}/4/41/Finca_cafetera_.jpg/1280px-Finca_cafetera_.jpg`,
  `${C}/8/8d/CO_El_Ocaso_%28finca_cafetera%29_%2810%29_%2817248486695%29.jpg`,
  `${C}/f/f6/CO_El_Ocaso_%28finca_cafetera%29_%285%29_%2817222506136%29.jpg`,
  `${C}/7/70/CO_El_Ocaso_%28finca_cafetera%29_%2826%29_%2817247926141%29.jpg`,
  `${C}/c/c1/CO_El_Ocaso_%28finca_cafetera%29_%2835%29_%2817060922100%29.jpg`,
  `${C}/8/88/CO_El_Ocaso_%28finca_cafetera%29_%2841%29_%2816625926864%29.jpg`,
  `${C}/b/b6/CO_El_Ocaso_%28finca_cafetera%29_%2825%29_%2816628275463%29.jpg`,
];

/** Habitaciones y zonas comunes de hotel. */
const HOTELES = [
  `${T}/f/ff/Futu-Changsheng-Hotel-guest-room-0052.jpg/1280px-Futu-Changsheng-Hotel-guest-room-0052.jpg`,
  `${T}/1/1c/Hard_Days_Night_Hotel%2C_a_guest_room%2C_Liverpool_2009.jpg/1280px-Hard_Days_Night_Hotel%2C_a_guest_room%2C_Liverpool_2009.jpg`,
  `${T}/b/b8/2008-03-06_a_guest_room_of_Grand_Hotel_Kaohsiung.jpg/1280px-2008-03-06_a_guest_room_of_Grand_Hotel_Kaohsiung.jpg`,
  `${T}/b/b1/Lobby_lounge_of_Amantaka_Suite_Amantaka_luxury_Resort_%26_Hotel_Luang_Prabang_Laos.jpg/1280px-Lobby_lounge_of_Amantaka_Suite_Amantaka_luxury_Resort_%26_Hotel_Luang_Prabang_Laos.jpg`,
  `${T}/1/17/Indoor_pool_of_spa_with_open_door_at_Amantaka_luxury_Resort_%26_Hotel_in_Luang_Prabang_Laos.jpg/1280px-Indoor_pool_of_spa_with_open_door_at_Amantaka_luxury_Resort_%26_Hotel_in_Luang_Prabang_Laos.jpg`,
  `${T}/0/03/Hotel_bed_with_lit_lamp_at_Hotel_Esplanade_in_October_2023.jpg/1280px-Hotel_bed_with_lit_lamp_at_Hotel_Esplanade_in_October_2023.jpg`,
];

/** Carpas de glamping. */
const GLAMPINGS = [
  `${T}/3/3e/Glamping_tents_at_Lakefest_-_geograph.org.uk_-_6040324.jpg/1280px-Glamping_tents_at_Lakefest_-_geograph.org.uk_-_6040324.jpg`,
  `${C}/5/5d/Glamping_tents_-_geograph.org.uk_-_6244841.jpg`,
  `${C}/6/6f/Glamping_tents_-_geograph.org.uk_-_6244843.jpg`,
  `${C}/c/c9/Glamping_tents_-_geograph.org.uk_-_6244880.jpg`,
  `${T}/3/30/Glamping_Thorbjornrud_Hotel.jpg/1280px-Glamping_Thorbjornrud_Hotel.jpg`,
];

/** Hostales y casas de huéspedes. */
const HOSTALES = [
  `${T}/0/0c/Hostel_6-bed_dorm_room%2C_Kuching%2C_Malaysia.jpg/1280px-Hostel_6-bed_dorm_room%2C_Kuching%2C_Malaysia.jpg`,
  `${T}/e/ea/Lishan_Guest_House_bedroom.jpg/1280px-Lishan_Guest_House_bedroom.jpg`,
  `${C}/c/c1/Interior_of_Kirkby_Stephen_youth_hostel_%281%29_-_geograph.org.uk_-_1398856.jpg`,
  `${T}/e/ee/Forest_3030_Youth_Hostel_exterior%2C_as_taken_on_4_December_2021.jpg/1280px-Forest_3030_Youth_Hostel_exterior%2C_as_taken_on_4_December_2021.jpg`,
  `${T}/c/c3/Siena_-_hotel_room_-_2012-5.jpg/1280px-Siena_-_hotel_room_-_2012-5.jpg`,
];

/** Cabañas de madera: tipo por defecto cuando no coincide ninguno. */
const CABANAS = [
  `${C}/b/b5/Old_wooden_cabin_in_forest.jpg`,
  `${T}/0/0d/DREVEN%C3%9D_ZRUB_V_LESE_-_WOODEN_LOG_CABIN_IN_THE_FOREST_-_panoramio.jpg/1280px-DREVEN%C3%9D_ZRUB_V_LESE_-_WOODEN_LOG_CABIN_IN_THE_FOREST_-_panoramio.jpg`,
  `${T}/e/e6/Wooden_cabin_in_Kherzouza_forest.jpg/1280px-Wooden_cabin_in_Kherzouza_forest.jpg`,
  `${C}/a/ae/Giant_Forest_Cabin_A.jpg`,
];

/** Paisajes y pueblos del Quindío, para la galería del detalle. */
const ENTORNO = [
  `${T}/a/af/Valle_de_Cocora%2C_Colombia_02.jpg/1280px-Valle_de_Cocora%2C_Colombia_02.jpg`,
  `${T}/4/40/Valle_de_Cocora%2C_Colombia_03.jpg/1280px-Valle_de_Cocora%2C_Colombia_03.jpg`,
  `${T}/e/e6/Valle_de_Cocora%2C_Colombia_05.jpg/1280px-Valle_de_Cocora%2C_Colombia_05.jpg`,
  `${T}/6/6d/Valle_de_Cocora%2C_Colombia_06.jpg/1280px-Valle_de_Cocora%2C_Colombia_06.jpg`,
  `${T}/9/9d/Valle_de_Cocora%2C_Colombia_08.jpg/1280px-Valle_de_Cocora%2C_Colombia_08.jpg`,
  `${T}/a/ac/Salento%2C_R%C3%ADo_Quind%C3%ADo%2C_2023-07_CN-01.jpg/1280px-Salento%2C_R%C3%ADo_Quind%C3%ADo%2C_2023-07_CN-01.jpg`,
  `${T}/b/ba/Salento%2C_R%C3%ADo_Quind%C3%ADo%2C_2023-07_CN-02.jpg/1280px-Salento%2C_R%C3%ADo_Quind%C3%ADo%2C_2023-07_CN-02.jpg`,
  `${T}/7/71/Calle_5%2C_Salento_01.jpg/1280px-Calle_5%2C_Salento_01.jpg`,
  `${T}/8/8c/Calle_5%2C_Salento_02.jpg/1280px-Calle_5%2C_Salento_02.jpg`,
  `${T}/3/38/Carrera_6%2C_Salento_01.jpg/1280px-Carrera_6%2C_Salento_01.jpg`,
  `${T}/a/aa/Calle_del_Convento%2C_Filandia.jpg/1280px-Calle_del_Convento%2C_Filandia.jpg`,
  `${T}/c/c7/Calle_de_la_Cruz%2C_Filandia.jpg/1280px-Calle_de_la_Cruz%2C_Filandia.jpg`,
  `${T}/9/96/Calle_7%2C_Filandia_02.jpg/1280px-Calle_7%2C_Filandia_02.jpg`,
  `${T}/a/ab/Autopista_del_Caf%C3%A9_en_Armenia%2C_Quind%C3%ADo.jpg/1280px-Autopista_del_Caf%C3%A9_en_Armenia%2C_Quind%C3%ADo.jpg`,
];

const POR_TIPO: Record<string, string[]> = {
  'Finca Cafetera': FINCAS,
  Hotel: HOTELES,
  Glamping: GLAMPINGS,
  Hostal: HOSTALES,
};

/**
 * Revuelve los bits de un entero.
 *
 * Hace falta porque los id de la base de datos van en progresión regular (las
 * habitaciones son 1, 61, 121, 181…, de 60 en 60) y un `id % lista.length`
 * directo colapsa cuando el paso y el tamaño de la lista comparten un divisor:
 * con 7 habitaciones y 4 fotos, 60 % 4 = 0 y las siete salían con LA MISMA
 * foto. Este mezclador (el finalizador de MurmurHash3) reparte los ids
 * parecidos por toda la lista, sin dejar de ser determinista.
 */
function mezclar(n: number): number {
  let x = (Math.abs(Math.trunc(n)) + 0x9e3779b9) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  return (x ^ (x >>> 15)) >>> 0;
}

/** Elige un elemento de forma estable a partir de un id. */
function elegir(lista: string[], semilla: number): string {
  return lista[mezclar(semilla) % lista.length];
}

/** Respaldo si alguna foto no carga: este servicio siempre responde. */
export function fotoRespaldo(semilla: number, ancho = 800, alto = 600): string {
  return `https://picsum.photos/seed/turismouq-${semilla}/${ancho}/${alto}`;
}

/** Foto principal del alojamiento. */
export function fotoAlojamiento(id: number, tipo?: string): string {
  return elegir(POR_TIPO[tipo ?? ''] ?? CABANAS, id);
}

/**
 * Fotos secundarias de la galería del detalle: alterna paisajes del Quindío
 * con interiores del mismo tipo de alojamiento.
 */
export function fotoGaleria(id: number, indice: number, tipo?: string): string {
  const propias = POR_TIPO[tipo ?? ''] ?? CABANAS;
  return indice % 2 === 0
    ? elegir(ENTORNO, id * 7 + indice)
    : elegir(propias, id + indice + 1);
}

/** Miniatura de una habitación. */
export function fotoHabitacion(idHabitacion: number, tipo?: string): string {
  return elegir(POR_TIPO[tipo ?? ''] ?? CABANAS, idHabitacion + 3);
}

/** Foto de portada del inicio: el Valle de Cocora, el ícono del Quindío. */
export const FOTO_PORTADA = ENTORNO[0];

export const ICONO_TIPO: Record<string, string> = {
  'Finca Cafetera': '☕',
  Hotel: '🏨',
  Glamping: '⛺',
  Hostal: '🛏️',
};
