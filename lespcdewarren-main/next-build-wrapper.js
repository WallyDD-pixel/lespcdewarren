// Wrapper pour le build Next.js qui charge le polyfill avant le build
require('./next-server-polyfill.js');

// Vérifier que document est bien défini et le forcer si nécessaire
if (typeof document === 'undefined') {
  const docPolyfill = require('./src/lib/document-polyfill.js');
  try {
    Object.defineProperty(global, 'document', {
      value: docPolyfill,
      writable: false,
      enumerable: true,
      configurable: false
    });
  } catch (e) {
    global.document = docPolyfill;
  }
  if (typeof globalThis !== 'undefined') {
    try {
      Object.defineProperty(globalThis, 'document', {
        value: docPolyfill,
        writable: false,
        enumerable: true,
        configurable: false
      });
    } catch (e) {
      globalThis.document = docPolyfill;
    }
  }
}

// Vérifier que document est maintenant défini
if (typeof document === 'undefined') {
  console.error('❌ Erreur: document n\'est toujours pas défini après le chargement du polyfill');
  process.exit(1);
}

// Récupérer les arguments de la ligne de commande
const args = process.argv.slice(2);

// Exécuter Next.js avec les arguments
require('./node_modules/next/dist/bin/next');

