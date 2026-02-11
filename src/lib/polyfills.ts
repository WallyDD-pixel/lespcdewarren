// Polyfill pour 'self' côté serveur
// Export self pour ProvidePlugin de webpack
if (typeof globalThis !== 'undefined') {
  (globalThis as any).self = globalThis;
}
export default globalThis;
