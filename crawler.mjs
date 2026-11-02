// Uso: node crawler.mjs [--solo=hentaila,hanime] [--limite=N]
// Se puede cortar y volver a lanzar: retoma lo que falte desde .cache/.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recorrerAniList } from './lib/anilist.mjs';
import { evaluarRegistro } from './lib/filtro.mjs';
import { Bloqueado, cargarRobots } from './lib/http.mjs';
import { clavesDe } from './lib/texto.mjs';
import { hanime } from './lib/sitios/hanime.mjs';
import { hentaihaven } from './lib/sitios/hentaihaven.mjs';
import { hentaila } from './lib/sitios/hentaila.mjs';
import { hentaiyt } from './lib/sitios/hentaiyt.mjs';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const CACHE = join(RAIZ, '.cache');
const SITIOS = [hentaiyt, hentaila, hentaihaven, hanime];

const argumento = (nombre) => process.argv.find((a) => a.startsWith(`--${nombre}=`))?.split('=')[1];
const solo = argumento('solo')?.split(',');
const limite = Number(argumento('limite')) || Infinity;

const leerCache = (archivo) =>
  existsSync(archivo) ? readFileSync(archivo, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
const agregar = (archivo, objeto) => appendFileSync(archivo, JSON.stringify(objeto) + '\n');

async function bajarAniList() {
  const archivo = join(CACHE, 'anilist.jsonl');
  if (leerCache(archivo).length) return console.log('[anilist] ya descargado');
  let n = 0;
  for await (const m of recorrerAniList()) {
    agregar(archivo, m);
    if (++n % 500 === 0) console.log(`[anilist] ${n}`);
  }
  console.log(`[anilist] listo: ${n}`);
}

async function bajarSitio(sitio) {
  const archivo = join(CACHE, `${sitio.id}.jsonl`);
  const ya = new Set(leerCache(archivo).map((r) => r.url));
  const permitida = await cargarRobots(sitio.origen);
  let nuevos = 0;
  let vetados = 0;
  try {
    for await (const r of sitio.recorrer(ya)) {
      if (!permitida(new URL(r.url).pathname)) continue;
      const motivo = evaluarRegistro(r);
      // De lo vetado solo queda la clave, para vetar la misma obra en otros sitios.
      agregar(archivo, motivo ? { url: r.url, vetado: true, claves: clavesDe(r), id_mal: r.id_mal ?? null } : r);
      if (motivo) vetados++;
      if (++nuevos % 25 === 0) console.log(`[${sitio.id}] ${nuevos} series nuevas (${vetados} fuera por filtro)`);
      if (nuevos >= limite) break;
    }
    console.log(`[${sitio.id}] listo: ${nuevos} nuevas, ${vetados} fuera por filtro`);
  } catch (e) {
    const causa = e instanceof Bloqueado ? 'BLOQUEADO, no se insiste' : 'ERROR';
    console.error(`[${sitio.id}] ${causa}: ${e.message} (guardadas ${nuevos})`);
  }
}

mkdirSync(CACHE, { recursive: true });
const elegidos = SITIOS.filter((s) => !solo || solo.includes(s.id));
await Promise.all([bajarAniList().catch((e) => console.error(`[anilist] ERROR: ${e.message}`)), ...elegidos.map(bajarSitio)]);
