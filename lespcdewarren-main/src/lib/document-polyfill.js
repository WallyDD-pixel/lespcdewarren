// Polyfill pour document côté serveur
// Utilisé par webpack.ProvidePlugin dans next.config.ts

const noop = () => {};
const fakeEl = () => ({
  style: {},
  appendChild: noop,
  removeChild: noop,
  setAttribute: noop,
  addEventListener: noop,
  removeEventListener: noop,
  getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }),
  classList: { add: noop, remove: noop, contains: () => false },
  parentElement: null,
  remove: noop,
});

const fakeDocument = {
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

module.exports = fakeDocument;

