// Wrapper pour le build Next.js qui charge le polyfill avant le build
require('./next-server-polyfill.js');

// Vérifier que document est bien défini
if (typeof document === 'undefined') {
  console.error('❌ Erreur: document n\'est pas défini après le chargement du polyfill');
  process.exit(1);
}

// Récupérer les arguments de la ligne de commande
const args = process.argv.slice(2);

// Exécuter Next.js avec les arguments
require('./node_modules/next/dist/bin/next');

