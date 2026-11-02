// hentaiyt.pro: WordPress con API REST publica. Solo series; vídeos y shorts
// no son series y sus fichas no traen datos para comprobarlas.
import { json, pedir, texto } from '../http.mjs';
import { sinHtml, unicos } from '../texto.mjs';

const ORIGEN = 'https://hentaiyt.pro';
const API = `${ORIGEN}/wp-json/wp/v2`;
const MESES = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12 };

async function todo(ruta, campos = '') {
  const salida = [];
  for (let p = 1; ; p++) {
    const r = await pedir(`${API}/${ruta}?per_page=100&page=${p}${campos}`);
    if (!r.ok) throw new Error(`${r.status} en ${ruta}`);
    salida.push(...(await r.json()));
    if (p >= Number(r.headers.get('x-wp-totalpages') ?? 1)) return salida;
  }
}

function fechaEstreno(s) {
  const m = s?.match(/(\d{1,2}) (\w{3})\w* (\d{4})/);
  const mes = m && MESES[m[2].toLowerCase()];
  return mes ? `${m[3]}-${String(mes).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

function datosFicha(html) {
  const dl = html.match(/<dl class="yt-anime-datos[\s\S]*?<\/dl>/)?.[0] ?? '';
  const datos = {};
  for (const m of dl.matchAll(/<dt>([\s\S]*?)<\/dt><dd>([\s\S]*?)<\/dd>/g)) datos[sinHtml(m[1])] = sinHtml(m[2]);
  return datos;
}

function reparto(html) {
  const salida = [];
  for (const m of html.matchAll(/<article class="yt387-cast-pair[\s\S]*?<\/article>/g)) {
    const nombres = [...m[0].matchAll(/<strong>([\s\S]*?)<\/strong>/g)].map((x) => sinHtml(x[1]));
    const rol = m[0].match(/<strong>[\s\S]*?<\/strong><span>([\s\S]*?)<\/span>/)?.[1];
    if (nombres.length) salida.push({ personaje: nombres[0], rol: sinHtml(rol) || null, voz: nombres[1] ?? null });
  }
  return salida;
}

export const hentaiyt = {
  id: 'hentaiyt',
  origen: ORIGEN,
  idioma: 'es',
  async *recorrer(ya) {
    const nombres = async (t) => Object.fromEntries((await todo(t, '&_fields=id,name')).map((x) => [x.id, x.name]));
    const generos = await nombres('hyt_genero');
    const temporadas = await nombres('hyt_temporada_emision');
    const colecciones = await nombres('hyt_coleccion');
    const episodios = await todo('hyt_episodio');
    const porUrl = new Map(episodios.map((e) => [e.link, e]));

    for (const a of await todo('hyt_anime')) {
      if (ya.has(a.link)) continue;
      const html = await texto(a.link);
      const datos = datosFicha(html);
      const enlaces = unicos(html.match(/https:\/\/hentaiyt\.pro\/episodio\/[^"'<\s]+/g) ?? []);
      yield {
        url: a.link,
        slug: a.slug,
        titulo: sinHtml(a.title.rendered),
        titulos_alt: unicos([datos['Título original']]),
        descripcion: sinHtml(a.content.rendered),
        tipo: datos.Tipo ?? null,
        estado: datos.Estado ?? null,
        fuente: datos.Fuente ?? null,
        fecha_estreno: fechaEstreno(datos.Estreno),
        temporada: a.hyt_temporada_emision.map((i) => temporadas[i])[0] ?? null,
        estudios: unicos((datos.Estudio ?? '').split(',').map((s) => s.trim())),
        etiquetas: a.hyt_genero.map((i) => generos[i]),
        colecciones: a.hyt_coleccion.map((i) => colecciones[i]),
        reparto: reparto(html),
        portada: a.yoast_head_json?.og_image?.[0]?.url ?? null,
        publicado_en_sitio: a.date.slice(0, 10),
        episodios: enlaces.map((url) => {
          const e = porUrl.get(url);
          const numero = Number(url.match(/capitulo-(\d+)/)?.[1]) || null;
          return { numero, titulo: e ? sinHtml(e.title.rendered) : null, url, fecha: e?.date.slice(0, 10) ?? null };
        }),
      };
    }
  },
};
