// Uso: node servir.mjs
// Sirve el buscador en la red local para abrirlo desde el celular (misma Wi-Fi).
// Mientras este corriendo, cualquiera en esa red puede abrirlo.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const PUERTO = 8765;
const RUTAS = {
  '/': ['buscador.html', 'text/html; charset=utf-8'],
  '/catalogo.json': ['catalogo.json', 'application/json; charset=utf-8'],
};

createServer(async (req, res) => {
  const ruta = RUTAS[new URL(req.url, 'http://local').pathname];
  if (!ruta) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'Content-Type': ruta[1], 'Cache-Control': 'no-store' });
  res.end(await readFile(join(RAIZ, ruta[0])));
}).listen(PUERTO, '0.0.0.0', () => {
  const direcciones = Object.values(networkInterfaces()).flat().filter((d) => d.family === 'IPv4' && !d.internal);
  console.log(`En esta PC: http://localhost:${PUERTO}`);
  for (const d of direcciones) console.log(`En el celular: http://${d.address}:${PUERTO}`);
});
