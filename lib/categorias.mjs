// Cada sitio nombra distinto la misma categoria: aqui se unifican en una sola
// etiqueta para que el buscador no muestre "Tetonas" y "Big Boobs" por separado.
const GRUPOS = {
  'Pechos grandes': ['big boobs', 'big breasts', 'big tits', 'large breasts', 'tetonas'],
  Paizuri: ['paizuri', 'boob job', 'boobjob'],
  'Violación': ['rape', 'violacion'],
  Felación: ['fellatio', 'blow job', 'blowjob'],
  'Masturbación': ['masturbation'],
  'Vírgenes': ['virgin', 'virgins', 'virgenes'],
  MILF: ['milf', 'milfs', 'mature'],
  Sirvientas: ['maid', 'maids', 'sirvientas'],
  NTR: ['ntr', 'netorare'],
  Infidelidad: ['cheating', 'infidelity', 'adultery'],
  'Tentáculos': ['tentacle', 'tentacles', 'tentaculos'],
  'Tríos': ['threesome', 'trios', 'group sex', 'grupal'],
  'Orgías': ['orgy', 'orgias', 'gangbang'],
  Elfas: ['elf', 'elves', 'elfas'],
  Enfermeras: ['nurse', 'nurses', 'enfermeras'],
  Esposas: ['housewife', 'wife', 'wives', 'esposas', 'casadas'],
  Bondage: ['bondage', 'bdsm'],
  Comedia: ['comedy'],
  'Fantasía': ['fantasy'],
  Terror: ['horror'],
  'Control mental': ['mind control', 'mind break'],
  Monstruos: ['monster', 'monsters'],
  'Chicas monstruo': ['monster girl', 'monster girls'],
  Embarazo: ['pregnant', 'pregnancy', 'impregnation'],
  'Sin censura': ['uncensored', 'sin censura'],
  'Con censura': ['censored'],
  Oficina: ['office lady', 'office ladies', 'office'],
};

const DESCARTAR = new Set(['hentai', 'hd', 'ova', 'ona', 'nudity']);

const MAPA = new Map(
  Object.entries(GRUPOS).flatMap(([nombre, variantes]) => variantes.map((v) => [v, nombre])),
);

const capitalizar = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function canonica(etiqueta) {
  const base = etiqueta.toLowerCase().replace(/[-_]+/g, ' ').trim();
  if (!base || DESCARTAR.has(base)) return null;
  return MAPA.get(base) ?? capitalizar(base);
}

export const FORMATOS = { TV: 'Serie TV', TV_SHORT: 'Serie corta', MOVIE: 'Película', SPECIAL: 'Especial', OVA: 'OVA', ONA: 'ONA', MUSIC: 'Música' };
export const ESTADOS = { FINISHED: 'Finalizado', RELEASING: 'En emisión', NOT_YET_RELEASED: 'Próximamente', CANCELLED: 'Cancelado', HIATUS: 'En pausa' };
export const ORIGENES = {
  ORIGINAL: 'Original', MANGA: 'Manga', LIGHT_NOVEL: 'Novela ligera', VISUAL_NOVEL: 'Novela visual',
  VIDEO_GAME: 'Videojuego', OTHER: 'Otro', NOVEL: 'Novela', DOUJINSHI: 'Doujinshi', ANIME: 'Anime',
  WEB_NOVEL: 'Novela web', GAME: 'Juego', COMIC: 'Cómic', MULTIMEDIA_PROJECT: 'Proyecto multimedia', PICTURE_BOOK: 'Libro ilustrado',
};
export const ESTACIONES = { WINTER: 'Invierno', SPRING: 'Primavera', SUMMER: 'Verano', FALL: 'Otoño' };
