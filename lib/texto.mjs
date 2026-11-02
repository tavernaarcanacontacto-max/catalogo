const ENTIDADES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…',
  ndash: '–', mdash: '—', laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”',
};

export function sinHtml(s) {
  return (s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, e) => ENTIDADES[e.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

export const sinAcentos = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Clave de comparacion de titulos: ignora mayusculas, puntuacion, sufijos de
// formato y las variantes de romanizacion (Joou/Joō/Jo).
export function clave(titulo) {
  return sinAcentos(titulo ?? '')
    .replace(/['’`´]/g, '')
    .replace(/\b(the animation|the motion anime|motion anime|ova|ona|oad|ovas|special|sub espanol|sin censura|uncensored|episode|episodio|capitulo)\b/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/ou|oo/g, 'o')
    .replace(/uu/g, 'u')
    .trim();
}

export const clavesDe = (r) => [...new Set([r.titulo, ...(r.titulos_alt ?? [])].map(clave).filter((c) => c.length >= 3))];

function bigramas(s) {
  const compacto = s.replace(/ /g, '');
  const conjunto = new Set();
  for (let i = 0; i < compacto.length - 1; i++) conjunto.add(compacto.slice(i, i + 2));
  return conjunto;
}

export function parecido(a, b) {
  const x = bigramas(a);
  const y = bigramas(b);
  if (!x.size || !y.size) return 0;
  let comunes = 0;
  for (const g of x) if (y.has(g)) comunes++;
  return (2 * comunes) / (x.size + y.size);
}

const digitos = (s) => (s.match(/\d+/g) ?? []).join(',');

// Dos titulos muy parecidos pero con distinto numero son secuelas, no repetidos.
export const mismoTitulo = (a, b, umbral = 0.92) => digitos(a) === digitos(b) && parecido(a, b) >= umbral;

const unicos = (lista) => [...new Set(lista.filter(Boolean))];
export { unicos };
