// Peticiones educadas: una a la vez por host, con pausa, identificandose
// con honestidad y respetando robots.txt. Si un sitio bloquea, se corta ahi.

const UA = 'catalogo-personal/1.0 (indice de busqueda personal)';
const PAUSA_MS = { 'graphql.anilist.co': 2200 };
const PAUSA_POR_DEFECTO_MS = 1200;
const INTENTOS = 5;

const colas = new Map();

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export class Bloqueado extends Error {}

function turno(host) {
  const pausa = PAUSA_MS[host] ?? PAUSA_POR_DEFECTO_MS;
  const propia = (colas.get(host) ?? Promise.resolve()).then(() => esperar(pausa));
  colas.set(host, propia);
  return propia;
}

export async function pedir(url, opciones = {}) {
  const host = new URL(url).host;
  for (let intento = 1; ; intento++) {
    await turno(host);
    let r;
    try {
      r = await fetch(url, {
        ...opciones,
        headers: { 'User-Agent': UA, ...opciones.headers },
        signal: AbortSignal.timeout(30000),
      });
    } catch (e) {
      if (intento >= INTENTOS) throw e;
      await esperar(intento * 5000);
      continue;
    }
    if (r.status === 403 || r.headers.get('cf-mitigated')) {
      throw new Bloqueado(`${host} respondio ${r.status} en ${url}`);
    }
    if (r.status === 429 || r.status >= 500) {
      if (intento >= INTENTOS) throw new Error(`${r.status} en ${url}`);
      const pide = Number(r.headers.get('retry-after'));
      await esperar(pide > 0 ? pide * 1000 : intento * 15000);
      continue;
    }
    return r;
  }
}

export async function texto(url, opciones) {
  const r = await pedir(url, opciones);
  if (!r.ok) throw new Error(`${r.status} en ${url}`);
  return r.text();
}

export async function json(url, opciones) {
  return JSON.parse(await texto(url, opciones));
}

// Devuelve una funcion ruta => permitida, segun los grupos "User-agent: *".
export async function cargarRobots(origen) {
  const contenido = await texto(`${origen}/robots.txt`);
  const prohibidas = [];
  let aplica = false;
  let leyendoAgentes = false;
  for (const crudo of contenido.split(/\r?\n/)) {
    const linea = crudo.split('#')[0].trim();
    const corte = linea.indexOf(':');
    if (corte < 0) continue;
    const clave = linea.slice(0, corte).trim().toLowerCase();
    const valor = linea.slice(corte + 1).trim();
    if (clave === 'user-agent') {
      aplica = (leyendoAgentes && aplica) || valor === '*';
      leyendoAgentes = true;
    } else {
      leyendoAgentes = false;
      if (clave === 'disallow' && aplica && valor) prohibidas.push(valor);
    }
  }
  return (ruta) => !prohibidas.some((p) => ruta.startsWith(p));
}
