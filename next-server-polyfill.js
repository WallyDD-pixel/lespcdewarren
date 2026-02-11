// Polyfill pour self, window et document dans l'environnement Node.js
// Ce fichier est chargé avant Next.js pour définir ces variables globales
// À charger avec : node -r ./next-server-polyfill.js ...

const g = typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : this;
if (typeof g.self === 'undefined') g.self = g;
if (typeof g.window === 'undefined') g.window = g;
// Mock window.location pour le SSR (évite "Cannot destructure property 'protocol' of 'window.location'")
const fakeLocation = {
  protocol: 'https:',
  host: 'lespcdewarren.fr',
  hostname: 'lespcdewarren.fr',
  href: 'https://lespcdewarren.fr/',
  origin: 'https://lespcdewarren.fr',
  pathname: '/',
  search: '',
  hash: '',
  port: '',
};
if (g.window && typeof g.window.location === 'undefined') g.window.location = fakeLocation;
// Node expose les globaux via global ; s'assurer que self/window y sont
if (typeof global !== 'undefined') {
  if (typeof global.self === 'undefined') global.self = global;
  if (typeof global.window === 'undefined') global.window = global;
  if (global.window && typeof global.window.location === 'undefined') global.window.location = fakeLocation;
}

// Mock minimal de document pour le SSR (évite "document is not defined" dans certaines libs)
if (typeof global !== 'undefined' && typeof global.document === 'undefined') {
  const noop = () => {};
  const fakeEl = () => ({
    style: {},
    appendChild: noop,
    removeChild: noop,
    setAttribute: noop,
    addEventListener: noop,
    removeEventListener: noop,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }),
  });
  global.document = {
    createElement: () => fakeEl(),
    createElementNS: () => fakeEl(),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: noop,
    removeEventListener: noop,
    body: fakeEl(),
    head: fakeEl(),
    documentElement: fakeEl(),
  };
  if (typeof globalThis !== 'undefined') globalThis.document = global.document;
}
