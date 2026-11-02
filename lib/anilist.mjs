// Catalogo adulto completo de AniList. Da el ID de MyAnimeList, estudios,
// fechas exactas y etiquetas, y sirve para reconocer repetidos entre sitios.
import { json } from './http.mjs';
import { evaluar } from './filtro.mjs';
import { sinHtml } from './texto.mjs';

const CONSULTA = `query($p:Int){Page(page:$p,perPage:50){pageInfo{hasNextPage}media(type:ANIME,genre:"Hentai",sort:ID){
  id idMal format status episodes duration source season seasonYear averageScore popularity favourites siteUrl
  startDate{year month day} endDate{year month day}
  title{romaji english native} synonyms description(asHtml:false) coverImage{large}
  studios{edges{isMain node{name}}} tags{name} genres
  characters(role:MAIN,perPage:6){nodes{age}}
  relations{nodes{id}}
}}}`;

const fecha = (f) => {
  if (!f?.year) return null;
  const dos = (n) => String(n).padStart(2, '0');
  return f.month && f.day ? `${f.year}-${dos(f.month)}-${dos(f.day)}` : String(f.year);
};

function compactar(m) {
  const titulos = [m.title.romaji, m.title.english, m.title.native, ...(m.synonyms ?? [])].filter(Boolean);
  const etiquetas = (m.tags ?? []).map((t) => t.name);
  const edades = (m.characters?.nodes ?? []).map((c) => c.age).filter(Boolean);
  const relacionados = (m.relations?.nodes ?? []).map((n) => n.id);
  const vetado = evaluar({ etiquetas, textos: [...titulos, sinHtml(m.description)], edades }) !== null;
  if (vetado) return { id: m.id, id_mal: m.idMal, titulos, relacionados, vetado: true };
  return {
    id: m.id,
    id_mal: m.idMal,
    url: m.siteUrl,
    relacionados,
    titulos,
    romaji: m.title.romaji,
    ingles: m.title.english,
    nativo: m.title.native,
    descripcion: sinHtml(m.description).replace(/\(Source:[^)]*\)\s*$/i, '').trim(),
    formato: m.format,
    estado: m.status,
    fuente: m.source,
    episodios: m.episodes,
    duracion_min: m.duration,
    estreno: fecha(m.startDate),
    fin: fecha(m.endDate),
    temporada: m.season && m.seasonYear ? `${m.season} ${m.seasonYear}` : null,
    estudios: (m.studios?.edges ?? []).filter((e) => e.isMain).map((e) => e.node.name),
    productoras: (m.studios?.edges ?? []).filter((e) => !e.isMain).map((e) => e.node.name),
    etiquetas,
    puntuacion: m.averageScore,
    popularidad: m.popularity,
    favoritos: m.favourites,
    portada: m.coverImage?.large,
  };
}

export async function* recorrerAniList() {
  for (let p = 1; ; p++) {
    const r = await json('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: CONSULTA, variables: { p } }),
    });
    if (r.errors) throw new Error(JSON.stringify(r.errors).slice(0, 300));
    for (const m of r.data.Page.media) yield compactar(m);
    if (!r.data.Page.pageInfo.hasNextPage) return;
  }
}
