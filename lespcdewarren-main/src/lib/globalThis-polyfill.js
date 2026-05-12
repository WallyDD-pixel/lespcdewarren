// Polyfill pour globalThis compatible Edge Runtime (sans eval ni Function)
// Retourne toujours globalThis s'il est disponible, sinon crée un objet minimal compatible

let g;

if (typeof globalThis !== 'undefined') {
  // globalThis est disponible, l'utiliser directement
  g = globalThis;
} else if (typeof self !== 'undefined') {
  g = self;
} else if (typeof window !== 'undefined') {
  g = window;
} else if (typeof global !== 'undefined') {
  g = global;
} else {
  // Fallback minimal pour Edge Runtime
  // Créer un objet qui hérite des propriétés globales de base
  g = Object.create(null);
  
  // Copier les propriétés globales essentielles
  if (typeof Array !== 'undefined') g.Array = Array;
  if (typeof Object !== 'undefined') g.Object = Object;
  if (typeof String !== 'undefined') g.String = String;
  if (typeof Number !== 'undefined') g.Number = Number;
  if (typeof Boolean !== 'undefined') g.Boolean = Boolean;
  if (typeof Date !== 'undefined') g.Date = Date;
  if (typeof Math !== 'undefined') g.Math = Math;
  if (typeof JSON !== 'undefined') g.JSON = JSON;
  if (typeof Promise !== 'undefined') g.Promise = Promise;
  if (typeof Map !== 'undefined') g.Map = Map;
  if (typeof Set !== 'undefined') g.Set = Set;
  if (typeof console !== 'undefined') g.console = console;
  if (typeof setTimeout !== 'undefined') g.setTimeout = setTimeout;
  if (typeof clearTimeout !== 'undefined') g.clearTimeout = clearTimeout;
  if (typeof setInterval !== 'undefined') g.setInterval = setInterval;
  if (typeof clearInterval !== 'undefined') g.clearInterval = clearInterval;
  
  // S'assurer que globalThis pointe vers lui-même pour les références circulaires
  g.globalThis = g;
}

// Toujours retourner globalThis s'il est disponible, sinon retourner notre objet
module.exports = typeof globalThis !== 'undefined' ? globalThis : g;
