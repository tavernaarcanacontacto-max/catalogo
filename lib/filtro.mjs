// Filtro de edad. Este catálogo solo admite obras con personajes adultos.
// Ante la duda se excluye. Lo excluido no se escribe en ninguna salida
// y no hay opción para desactivarlo.

import { sinAcentos } from './texto.mjs';

// ============================================================
// 1. Listas y expresiones regulares (rellenar según necesites)
// ============================================================

const ETIQUETA = new RegExp(
  '\\b(' + [
    // ← añade aquí las etiquetas prohibidas
  ].join('|') + ')\\b',
);

const FALSOS_POSITIVOS = // ← falsos positivos que quieres ignorar
  / /g;

const TEXTO = new RegExp(
  [
    // ← palabras/frases prohibidas en títulos y sinopsis
  ].join('|'),
);

const JOVEN = // ← palabras que indican posible minoría de edad
  / /;

const ADULTO = // ← palabras que confirman contexto adulto
  / /;

const GENERICAS = // ← etiquetas genéricas que no cuentan como evidencia
  / /;

// ============================================================
// 2. Exclusiones manuales
// ============================================================

export const EXCLUIDAS_A_MANO = new Set([
  // ← IDs que quieres excluir a mano
]);

// ============================================================
// 3. Funciones auxiliares
// ============================================================

const preparar = (s) => sinAcentos(s).replace(/%20/g, ' ').replace(/[-_]+/g, ' ');

export const etiquetaVetada = (etiqueta) => {
  // ← lógica para decidir si una etiqueta está vetada
  return true;
};

export function textoVetado(t) {
  // ← lógica para decidir si un texto está vetado
  return true;
}

export function edadVetada(edad) {
  // ← lógica para decidir si una edad está vetada
  return true;
}

// ============================================================
// 4. Función principal de evaluación
// ============================================================

export function evaluar({ etiquetas = [], textos = [], edades = [] }) {
  // ← aquí decides el orden y las condiciones de exclusión
  // Devuelve: 'edad' | 'etiqueta' | 'texto' | 'indicio' | null
  return null;
}

// ============================================================
// 5. Helpers de uso
// ============================================================

export const textosDe = (r) => [
  r.titulo,
  ...(r.titulos_alt ?? []),
  r.descripcion,
  ...(r.episodios ?? []).map((e) => e.titulo),
];

export const evaluarRegistro = (r) =>
  evaluar({ etiquetas: r.etiquetas, textos: textosDe(r) });

export function tieneEvidencia(etiquetas, descripcion) {
  // ← decide si hay suficientes datos para confiar en el registro
  return true;
}