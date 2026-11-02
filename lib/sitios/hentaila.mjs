// hentaila.com: SvelteKit. Las fichas se piden en su formato __data.json, mas
// liviano que el HTML, y ya traen el ID de MyAnimeList.
import { json, texto } from '../http.mjs';
import { unicos } from '../texto.mjs';

const ORIGEN = 'https://hentaila.com';
const ESTADOS = { 1: 'Finalizado', 2: 'En emisión', 3: 'Próximamente' };

// __data.json es una lista plana donde cada valor apunta por indice a otros.
function decodificar(lista, i = 0) {
  if (i < 0) return null;
  const v = lista[i];
  if (Array.isArray(v)) return v.map((x) => decodificar(lista, x));
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, decodificar(lista, x)]));
  }
  return v;
}

async function slugs() {
  const vistos = new Set();
  for (let p = 1; ; p++) {
    const html = await texto(`${ORIGEN}/catalogo?page=${p}`);
    const pagina = [...html.matchAll(/href="\/media\/([^"/?#]+)"/g)].map((m) => m[1]);
    const nuevos = pagina.filter((s) => !vistos.has(s));
    if (!nuevos.length) return [...vistos];
    nuevos.forEach((s) => vistos.add(s));
  }
}

export const hentaila = {
  id: 'hentaila',
  origen: ORIGEN,
  idioma: 'es',
  async *recorrer(ya) {
    for (const slug of await slugs()) {
      const url = `${ORIGEN}/media/${slug}`;
      if (ya.has(url)) continue;
      const crudo = await json(`${url}/__data.json`);
      const nodo = crudo.nodes.find((n) => n?.data && JSON.stringify(n.data).includes('synopsis'));
      if (!nodo) continue;
      const m = decodificar(nodo.data).media;
      yield {
        url,
        slug,
        titulo: m.title,
        titulos_alt: unicos(Object.values(m.aka ?? {}).flat().map((t) => t?.trim())),
        descripcion: m.synopsis ?? '',
        tipo: m.category?.name ?? null,
        estado: ESTADOS[m.status] ?? null,
        fecha_estreno: m.startDate ?? null,
        fecha_fin: m.endDate ?? null,
        etiquetas: (m.genres ?? []).map((g) => g.name),
        id_mal: m.malId ?? null,
        puntuacion_sitio: m.votes ? m.score : null,
        portada: m.poster ?? null,
        publicado_en_sitio: m.createdAt?.slice(0, 10) ?? null,
        episodios: (m.episodes ?? []).map((e) => ({ numero: e.number, titulo: null, url: `${url}/${e.number}`, fecha: null })),
      };
    }
  },
};
