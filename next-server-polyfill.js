// Polyfill pour self, window, document, location dans l'environnement Node.js (SSR)
// Charger avec : node -r ./next-server-polyfill.js ...

const noop = () => {};
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

const fakeEl = () => ({
  style: {},
  appendChild: noop,
  removeChild: noop,
  setAttribute: noop,
  addEventListener: noop,
  removeEventListener: noop,
  getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }),
});

const g = typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : this;
if (typeof g.self === 'undefined') g.self = g;
if (typeof g.window === 'undefined') g.window = g;
g.window.location = fakeLocation;
g.location = fakeLocation;
g.window.addEventListener = noop;
g.window.removeEventListener = noop;

if (typeof global !== 'undefined') {
  if (typeof global.self === 'undefined') global.self = global;
  if (typeof global.window === 'undefined') global.window = global;
  global.window.location = fakeLocation;
  global.location = fakeLocation;
  global.window.addEventListener = noop;
  global.window.removeEventListener = noop;
}

if (typeof global !== 'undefined' && typeof global.document === 'undefined') {
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
