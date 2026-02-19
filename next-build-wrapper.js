// Wrapper pour le build Next.js qui charge le polyfill avant le build
require('./next-server-polyfill.js');

// Récupérer les arguments de la ligne de commande
const args = process.argv.slice(2);

// Exécuter Next.js avec les arguments
require('./node_modules/next/dist/bin/next');

