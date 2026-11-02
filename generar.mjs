// Uso: node generar.mjs
// Une lo descargado en .cache/ y escribe catalogo.json, catalogo.md y buscador.html.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hanime } from './lib/sitios/hanime.mjs';
import { hentaila } from './lib/sitios/hentaila.mjs';
import { hentaiyt } from './lib/sitios/hentaiyt.mjs';
import { unir } from './lib/unir.mjs';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const SITIOS = [hentaiyt, hentaila, hanime];

const leer = (nombre) => {
  const archivo = join(RAIZ, '.cache', `${nombre}.jsonl`);
  return existsSync(archivo) ? readFileSync(archivo, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
};

const registros = SITIOS.flatMap((s) => leer(s.id).map((r) => ({ ...r, sitio: s.id, idioma: s.idioma })));
const { obras, estadisticas } = unir(registros, leer('anilist'));

function contar(valores) {
  const cuenta = {};
  for (const v of valores.filter((x) => x !== null && x !== undefined && x !== '')) cuenta[v] = (cuenta[v] ?? 0) + 1;
  return Object.fromEntries(Object.entries(cuenta).sort((a, b) => b[1] - a[1]));
}

const catalogo = {
  meta: {
    nombre: 'Catálogo unificado de hentai',
    generado: new Date().toISOString(),
    sitios: SITIOS.map((s) => s.origen),
    sitios_no_incluidos: {
      'https://hentaihaven.xxx': 'Responde con un desafio antibots a los crawlers; no se intento sortearlo.',
    },
    fuentes_de_datos: ['AniList (ID de MyAnimeList, estudios, fechas, etiquetas)', 'Fichas de cada sitio'],
    totales: estadisticas,
    alcance: 'Solo obras con personajes adultos. Una obra entra unicamente si AniList la respalda con sinopsis y etiquetas, y ninguna fuente la marca como de menores, de ambiente escolar o de personajes descritos por parentesco; un veto alcanza a sus secuelas y precuelas. El filtro es deliberadamente estricto y deja fuera muchas obras de adultos. Las sinopsis de la edicion del 2026-11-02 se leyeron a mano, pero una sinopsis no prueba la edad de un personaje.',
    aviso_uso: 'Indice de referencia para busqueda. hentaiyt.pro publica en robots.txt search=yes, ai-train=no, use=reference: este archivo sirve para consultar y buscar, no para entrenar modelos de IA. Las descripciones pertenecen a sus sitios de origen.',
    esquema: {
      id: 'Identificador estable de la obra (al-<id AniList> o ti-<titulo>).',
      titulo: 'Titulo principal en romaji.',
      titulo_nativo: 'Titulo en japones.',
      titulo_ingles: 'Titulo en ingles, si existe.',
      titulos_alternativos: 'Otros titulos con los que aparece en las fuentes.',
      descripciones: 'Sinopsis por idioma (es, en), tomada de los sitios.',
      formato: 'OVA, ONA, Pelicula, Especial...',
      estado: 'Finalizado, En emision...',
      fuente: 'Origen de la obra: Manga, Novela visual, Original...',
      estudios: 'Estudios de animacion.',
      productoras: 'Productoras y otras companias.',
      'fechas.estreno': 'Fecha de publicacion original (AAAA-MM-DD o AAAA).',
      'fechas.estreno_fuente': 'De que fuente salio esa fecha.',
      'fechas.fin': 'Fecha de finalizacion.',
      'fechas.anio': 'Anio de estreno.',
      'fechas.temporada': 'Temporada de emision.',
      'fechas.alta_en_sitios': 'Fecha en que cada sitio la publico (no es la fecha original).',
      'categorias.etiquetas': 'Generos y etiquetas unificados entre sitios y AniList.',
      'categorias.colecciones': 'Colecciones o franquicias.',
      reparto: 'Personajes y voces, cuando el sitio los publica.',
      puntuacion: 'Nota media y popularidad en AniList.',
      'enlaces.myanimelist': 'Ficha en MyAnimeList.',
      'enlaces.anilist': 'Ficha en AniList.',
      'enlaces.sitios': 'Ficha de la obra en cada sitio donde esta.',
      sitios: 'Sitios en los que aparece. Mas de uno = repetido ya unificado.',
      'episodios.total': 'Cantidad de episodios.',
      'episodios.lista': 'Episodios con titulo, fecha original, duracion y enlace por sitio.',
      portada: 'URL de la portada.',
    },
  },
  facetas: {
    etiquetas: contar(obras.flatMap((o) => o.categorias.etiquetas)),
    estudios: contar(obras.flatMap((o) => o.estudios)),
    productoras: contar(obras.flatMap((o) => o.productoras)),
    formatos: contar(obras.map((o) => o.formato)),
    estados: contar(obras.map((o) => o.estado)),
    fuentes: contar(obras.map((o) => o.fuente)),
    anios: contar(obras.map((o) => o.fechas.anio)),
    temporadas: contar(obras.map((o) => o.fechas.temporada)),
    sitios: contar(obras.flatMap((o) => o.sitios)),
  },
  obras,
};

writeFileSync(join(RAIZ, 'catalogo.json'), JSON.stringify(catalogo, null, 2));

const celda = (s) => String(s ?? '—').replace(/\|/g, '\\|').replace(/\s+/g, ' ');
const enlace = (nombre, url) => `[${nombre}](${url})`;
const filas = obras.map((o) => {
  const sitios = Object.entries(o.enlaces.sitios).map(([s, url]) => enlace(s, url)).join(' · ');
  const mal = o.enlaces.myanimelist ? enlace('MAL', o.enlaces.myanimelist) : '—';
  return `| ${celda(o.titulo)} | ${o.fechas.estreno ?? o.fechas.anio ?? '—'} | ${celda(o.estudios.join(', ') || null)} | ${o.episodios.total ?? '—'} | ${mal} | ${sitios} |`;
});
writeFileSync(
  join(RAIZ, 'catalogo.md'),
  [
    `# ${catalogo.meta.nombre}`,
    '',
    `${obras.length} obras. Generado el ${catalogo.meta.generado.slice(0, 10)}. ${catalogo.meta.alcance}`,
    '',
    '| Título | Estreno | Estudio | Eps | MyAnimeList | Dónde verla |',
    '|---|---|---|---|---|---|',
    ...filas,
    '',
  ].join('\n'),
);

const plantilla = readFileSync(join(RAIZ, 'buscador.plantilla.html'), 'utf8');
const incrustado = JSON.stringify(catalogo).replace(/</g, '\\u003c');
writeFileSync(join(RAIZ, 'buscador.html'), plantilla.replace('/*DATOS*/null', () => incrustado));

console.log(estadisticas);
