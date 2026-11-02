// hanime.tv publica una pagina por episodio: se agrupan en series por slug
// (nombre-1, nombre-2...). Si un episodio queda vetado no se piden los demas.
import { texto } from '../http.mjs';
import { evaluarRegistro } from '../filtro.mjs';
import { sinHtml, unicos } from '../texto.mjs';

const ORIGEN = 'https://hanime.tv';

function agrupar(urls) {
  const grupos = new Map();
  for (const url of urls) {
    const slug = url.split('/').pop();
    const base = slug.replace(/-\d+$/, '');
    if (!grupos.has(base)) grupos.set(base, []);
    grupos.get(base).push({ url, numero: Number(slug.match(/-(\d+)$/)?.[1]) || 1 });
  }
  for (const eps of grupos.values()) eps.sort((a, b) => a.numero - b.numero);
  return grupos;
}

function leerEpisodio(html) {
  const ld = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  const v = ld ? JSON.parse(ld) : {};
  const limpio = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  return {
    nombre: sinHtml(v.name),
    descripcion: sinHtml(v.description),
    fecha: v.uploadDate?.slice(0, 10) ?? null,
    duracion: v.duration ?? null,
    portada: v.thumbnailUrl ?? null,
    // Solo las insignias de la ficha: el pie repite una lista fija de categorias en todas las paginas.
    etiquetas: unicos([...limpio.matchAll(/href="\/browse\/tags\/([^"]+)"\s+class="badge/g)].map((m) => decodeURIComponent(m[1]))),
    estudios: unicos([...limpio.matchAll(/href="\/browse\/brands\/[^"]+"[^>]*title="Browse more ([^"]+?) videos"/g)].map((m) => sinHtml(m[1]))),
  };
}

export const hanime = {
  id: 'hanime',
  origen: ORIGEN,
  idioma: 'en',
  async *recorrer(ya) {
    const xml = await texto(`${ORIGEN}/sitemap.xml`);
    const urls = [...xml.matchAll(/<loc>(https:\/\/hanime\.tv\/videos\/hentai\/[^<]+)<\/loc>/g)].map((m) => m[1]);

    for (const [base, eps] of agrupar(urls)) {
      const url = `${ORIGEN}/videos/hentai/${base}`;
      if (ya.has(url)) continue;
      const serie = {
        url,
        slug: base,
        titulo: '',
        titulos_alt: [],
        descripcion: '',
        tipo: null,
        estado: null,
        estudios: [],
        etiquetas: [],
        portada: null,
        episodios: [],
      };
      for (const ep of eps) {
        const d = leerEpisodio(await texto(ep.url));
        serie.titulo ||= d.nombre.replace(/\s+\d+$/, '');
        serie.descripcion ||= d.descripcion;
        serie.portada ||= d.portada;
        serie.etiquetas = unicos([...serie.etiquetas, ...d.etiquetas]);
        serie.estudios = unicos([...serie.estudios, ...d.estudios]);
        serie.episodios.push({ numero: ep.numero, titulo: d.nombre, url: ep.url, fecha: d.fecha, duracion: d.duracion });
        if (evaluarRegistro(serie)) break;
      }
      serie.fecha_estreno = serie.episodios[0]?.fecha ?? null;
      yield serie;
    }
  },
};
