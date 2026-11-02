// hentaihaven.xxx: robots.txt prohibe /api/ y /search/, asi que se entra solo
// por sitemaps y fichas /watch/. No se usan los sitemaps de rule34 ni de canales.
import { texto } from '../http.mjs';
import { sinHtml, unicos } from '../texto.mjs';

const ORIGEN = 'https://hentaihaven.xxx';

async function urlsSeries() {
  const indice = await texto(`${ORIGEN}/sitemap_index.xml`);
  const mapas = [...indice.matchAll(/<loc>([^<]*\/en-manga-sitemap-\d+\.xml)<\/loc>/g)].map((m) => m[1]);
  const urls = [];
  for (const mapa of mapas) {
    const xml = await texto(mapa);
    urls.push(...[...xml.matchAll(/<loc>([^<]*\/watch\/[^<]+)<\/loc>/g)].map((m) => m[1]));
  }
  return unicos(urls).filter((u) => /\/watch\/[^/]+\/$/.test(u));
}

function grafo(html) {
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const pagina = JSON.parse(m[1])['@graph']?.find((n) => n['@type'] === 'WebPage');
      if (pagina) return pagina;
    } catch {}
  }
  return {};
}

// Las etiquetas de la ficha estan antes del bloque "Episodes(n)"; despues
// vienen las recomendaciones, con enlaces de otras series.
function ficha(html) {
  const fin = html.search(/<h2[^>]*>\s*Episodes/);
  const inicio = html.indexOf('<h1');
  const zona = html.slice(Math.max(0, Math.min(inicio, fin >= 0 ? fin : inicio) - 6000), fin >= 0 ? fin : html.length);
  const de = (tipo) => unicos([...zona.matchAll(new RegExp(`href="/${tipo}/([^"/]+)/"[^>]*>([^<]+)<`, 'g'))].map((m) => sinHtml(m[2])));
  return { generos: de('series'), etiquetas: de('tag'), estudios: de('studio'), anio: de('release')[0] ?? null };
}

export const hentaihaven = {
  id: 'hentaihaven',
  origen: ORIGEN,
  idioma: 'en',
  async *recorrer(ya) {
    for (const url of await urlsSeries()) {
      if (ya.has(url)) continue;
      const html = await texto(url);
      const pagina = grafo(html);
      const { generos, etiquetas, estudios, anio } = ficha(html);
      const slug = url.match(/\/watch\/([^/]+)\//)[1];
      const titulo = sinHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]) || sinHtml(pagina.name);
      const numeros = unicos([...html.matchAll(new RegExp(`/watch/${slug}/episode-(\\d+)/`, 'g'))].map((m) => m[1]));
      yield {
        url,
        slug,
        titulo,
        titulos_alt: [],
        descripcion: sinHtml(pagina.description),
        tipo: null,
        estado: null,
        anio: anio ? Number(anio) : null,
        estudios,
        etiquetas: unicos([...generos, ...etiquetas]),
        portada: html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? null,
        publicado_en_sitio: pagina.datePublished?.slice(0, 10) ?? null,
        episodios: numeros.map(Number).sort((a, b) => a - b).map((n) => ({
          numero: n, titulo: null, url: `${url}episode-${n}/`, fecha: null,
        })),
      };
    }
  },
};
