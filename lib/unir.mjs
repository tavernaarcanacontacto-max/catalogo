// Compara las fichas de todos los sitios y deja una sola obra por titulo.
// Una obra vetada en cualquier fuente se descarta entera, en todos los sitios.
import { canonica, ESTACIONES, ESTADOS, FORMATOS, ORIGENES } from './categorias.mjs';
import { evaluar, EXCLUIDAS_A_MANO, textosDe, tieneEvidencia } from './filtro.mjs';
import { clave, clavesDe, mismoTitulo, unicos } from './texto.mjs';

const compacto = (c) => c.replace(/ /g, '');
const cubeta = (c) => compacto(c).slice(0, 3);

// Secuelas y precuelas comparten personajes: si una esta vetada, caen las otras.
function propagarVetos(anilist) {
  for (const m of anilist) if (EXCLUIDAS_A_MANO.has(m.id)) m.vetado = true;
  const vetadas = anilist.filter((m) => m.vetado);
  const ids = new Set(vetadas.map((m) => m.id));
  const vinculadas = new Set(vetadas.flatMap((m) => m.relacionados));
  for (const m of anilist) {
    if (vinculadas.has(m.id) || m.relacionados.some((id) => ids.has(id))) m.vetado = true;
  }
}

function indexarAniList(anilist) {
  const porMal = new Map();
  const porClave = new Map();
  const cubetas = new Map();
  for (const m of anilist) {
    if (m.id_mal) porMal.set(m.id_mal, m);
    for (const c of new Set(m.titulos.map(clave).filter((x) => x.length >= 3))) {
      const previo = porClave.get(c);
      if (previo === undefined) porClave.set(c, m);
      // Titulo compartido: se queda el vetado; si ninguno lo esta, es ambiguo.
      else if (previo && previo.id !== m.id) porClave.set(c, m.vetado ? m : previo.vetado ? previo : null);
      if (!cubetas.has(cubeta(c))) cubetas.set(cubeta(c), []);
      cubetas.get(cubeta(c)).push([c, m]);
    }
  }
  return { porMal, porClave, cubetas };
}

function buscarAniList(r, { porMal, porClave, cubetas }) {
  if (r.id_mal && porMal.has(r.id_mal)) return porMal.get(r.id_mal);
  const claves = r.claves ?? clavesDe(r);
  for (const c of claves) if (porClave.get(c)) return porClave.get(c);
  for (const c of claves) {
    const parecida = (cubetas.get(cubeta(c)) ?? []).find(([k]) => mismoTitulo(c, k));
    if (parecida) return parecida[1];
  }
  return null;
}

class Conjuntos {
  padre = new Map();
  raiz(x) {
    if (!this.padre.has(x)) this.padre.set(x, x);
    let r = x;
    while (this.padre.get(r) !== r) r = this.padre.get(r);
    this.padre.set(x, r);
    return r;
  }
  unir(a, b) {
    this.padre.set(this.raiz(a), this.raiz(b));
  }
}

function agrupar(registros, indice) {
  const conjuntos = new Conjuntos();
  registros.forEach((r, i) => {
    r.al = buscarAniList(r, indice);
    r.claves ??= clavesDe(r);
    if (r.al) conjuntos.unir(i, `al:${r.al.id}`);
    for (const c of r.claves) conjuntos.unir(i, `t:${c}`);
  });
  // Series sin AniList: se comparan por parecido de titulo entre si.
  const sueltas = registros.map((r, i) => [r, i]).filter(([r]) => !r.al);
  for (let a = 0; a < sueltas.length; a++) {
    for (let b = a + 1; b < sueltas.length; b++) {
      const [x, i] = sueltas[a];
      const [y, j] = sueltas[b];
      if (x.sitio !== y.sitio && x.claves.some((c) => y.claves.some((d) => mismoTitulo(c, d)))) conjuntos.unir(i, j);
    }
  }
  const grupos = new Map();
  registros.forEach((r, i) => {
    const raiz = conjuntos.raiz(i);
    if (!grupos.has(raiz)) grupos.set(raiz, []);
    grupos.get(raiz).push(r);
  });
  return [...grupos.values()];
}

function estacionDe(fecha) {
  const mes = Number(fecha?.slice(5, 7));
  if (!mes) return null;
  const nombre = ['Invierno', 'Invierno', 'Invierno', 'Primavera', 'Primavera', 'Primavera', 'Verano', 'Verano', 'Verano', 'Otoño', 'Otoño', 'Otoño'][mes - 1];
  return `${nombre} ${fecha.slice(0, 4)}`;
}

function estreno(fichas, al) {
  const completa = (f) => /^\d{4}-\d{2}-\d{2}$/.test(f ?? '');
  const candidatos = [
    [al?.estreno, 'anilist'],
    ...fichas.filter((r) => r.sitio === 'hentaiyt').map((r) => [r.fecha_estreno, r.sitio]),
    ...fichas.filter((r) => r.sitio === 'hanime').map((r) => [r.fecha_estreno, r.sitio]),
    ...fichas.filter((r) => r.sitio === 'hentaila').map((r) => [r.fecha_estreno, r.sitio]),
  ];
  return candidatos.find(([f]) => completa(f)) ?? candidatos.find(([f]) => f) ?? [null, null];
}

function episodios(fichas, al) {
  const porNumero = new Map();
  for (const r of fichas) {
    for (const e of r.episodios ?? []) {
      const n = e.numero ?? 1;
      if (!porNumero.has(n)) porNumero.set(n, { numero: n, titulo: null, estreno: null, duracion: null, enlaces: {} });
      const fila = porNumero.get(n);
      fila.titulo ??= e.titulo;
      fila.enlaces[r.sitio] = e.url;
      // Solo hanime publica la fecha original; las otras son de alta en su sitio.
      if (r.sitio === 'hanime') {
        fila.estreno = e.fecha;
        fila.duracion = e.duracion;
      }
    }
  }
  const lista = [...porNumero.values()].sort((a, b) => a.numero - b.numero);
  return { total: Math.max(lista.length, al?.episodios ?? 0) || null, lista };
}

// "T-REX" y "T-Rex" son el mismo estudio.
function sinRepetirNombres(lista) {
  const vistos = new Map();
  for (const n of lista.filter(Boolean)) if (!vistos.has(n.toLowerCase())) vistos.set(n.toLowerCase(), n);
  return [...vistos.values()];
}

const RELLENO = /Watch\b.*?latest hentai online free download HD on mobile phone tablet laptop desktop\.?/gi;
const sinRelleno = (d) => (d ?? '').replace(RELLENO, '').trim();
// Por debajo de esto suelen ser comentarios sueltos, no sinopsis.
const SINOPSIS_MINIMA = 120;

function construir(fichas, al) {
  if (!al || !tieneEvidencia(al.etiquetas, al.descripcion)) return null;
  const sitios = unicos(fichas.map((r) => r.sitio));
  const crudas = unicos([...fichas.flatMap((r) => r.etiquetas ?? []), ...al.etiquetas]);
  const textos = [...fichas.flatMap(textosDe), al.descripcion];
  if (evaluar({ etiquetas: crudas, textos }) !== null) return null;
  const descripciones = {};
  for (const r of fichas) {
    const texto = sinRelleno(r.descripcion);
    if (texto.length >= SINOPSIS_MINIMA && texto.length > (descripciones[r.idioma]?.length ?? 0)) descripciones[r.idioma] = texto;
  }
  descripciones.en = al.descripcion;

  const [fechaEstreno, fuenteFecha] = estreno(fichas, al);
  const titulo = al?.romaji ?? fichas.map((r) => r.titulo).sort((a, b) => b.length - a.length)[0];
  const alternativos = unicos([...(al?.titulos ?? []), ...fichas.flatMap((r) => [r.titulo, ...(r.titulos_alt ?? [])])]).filter((t) => t !== titulo);
  const temporadaAl = al?.temporada?.split(' ');
  const sitioCon = (campo) => fichas.find((r) => r[campo])?.[campo] ?? null;
  const reparto = fichas.flatMap((r) => r.reparto ?? []);
  const idMal = al?.id_mal ?? sitioCon('id_mal');

  return {
    id: al ? `al-${al.id}` : `ti-${compacto(fichas[0].claves[0] ?? fichas[0].slug)}`,
    titulo,
    titulo_nativo: al?.nativo ?? null,
    titulo_ingles: al?.ingles ?? null,
    titulos_alternativos: alternativos,
    descripciones,
    formato: FORMATOS[al?.formato] ?? sitioCon('tipo'),
    estado: ESTADOS[al?.estado] ?? sitioCon('estado'),
    fuente: ORIGENES[al?.fuente] ?? sitioCon('fuente'),
    estudios: sinRepetirNombres([...(al?.estudios ?? []), ...fichas.flatMap((r) => r.estudios ?? [])]),
    productoras: al?.productoras ?? [],
    fechas: {
      estreno: fechaEstreno,
      estreno_fuente: fuenteFecha,
      fin: al?.fin ?? sitioCon('fecha_fin'),
      anio: fechaEstreno ? Number(fechaEstreno.slice(0, 4)) : sitioCon('anio'),
      temporada: temporadaAl ? `${ESTACIONES[temporadaAl[0]]} ${temporadaAl[1]}` : sitioCon('temporada') ?? estacionDe(fechaEstreno),
      alta_en_sitios: Object.fromEntries(fichas.filter((r) => r.publicado_en_sitio).map((r) => [r.sitio, r.publicado_en_sitio])),
    },
    categorias: {
      etiquetas: unicos(crudas.map(canonica)).sort((a, b) => a.localeCompare(b, 'es')),
      colecciones: unicos(fichas.flatMap((r) => r.colecciones ?? [])),
    },
    reparto,
    puntuacion: { anilist: al?.puntuacion ?? null, popularidad: al?.popularidad ?? null, favoritos: al?.favoritos ?? null },
    enlaces: {
      myanimelist: idMal ? `https://myanimelist.net/anime/${idMal}/` : null,
      anilist: al?.url ?? null,
      // hanime no tiene pagina de serie: su enlace es el primer episodio.
      sitios: Object.fromEntries(fichas.map((r) => [r.sitio, r.sitio === 'hanime' ? r.episodios[0]?.url ?? r.url : r.url])),
    },
    sitios,
    episodios: episodios(fichas, al),
    portada: al?.portada ?? sitioCon('portada'),
  };
}

export function unir(registros, anilist) {
  propagarVetos(anilist);
  const indice = indexarAniList(anilist);
  const obras = [];
  let fuera = 0;
  const fichasValidas = registros.filter((r) => !r.vetado).length;
  for (const grupo of agrupar(registros, indice)) {
    const al = grupo.find((r) => r.al)?.al ?? null;
    const vetada = al?.vetado || grupo.some((r) => r.vetado || r.al?.vetado);
    const obra = vetada ? null : construir(grupo, al);
    if (obra) obras.push(obra);
    else fuera++;
  }
  obras.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
  const enVarios = obras.filter((o) => o.sitios.length > 1).length;
  return { obras, estadisticas: { fichas_validas: fichasValidas, obras: obras.length, obras_en_varios_sitios: enVarios, obras_fuera_por_filtro: fuera } };
}
