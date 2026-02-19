import type { NextConfig } from "next";
import webpack from "webpack";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true }, // Nécessaire pour ignorer les erreurs ESLint pendant le build
  typescript: { ignoreBuildErrors: true }, // Ignorer aussi les erreurs TypeScript si nécessaire
  // Next 15: packages à garder externes côté serveur
  serverExternalPackages: ['pdfkit'],
  webpack: (config, { isServer, webpack }) => {
    // Résoudre le module 'globalThis' (utilisé par Next) vers notre polyfill (client + serveur)
    const polyfillPath = require.resolve('./src/lib/globalThis-polyfill.js');
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      globalThis: polyfillPath,
    };
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^globalThis$/, polyfillPath)
    );

    if (isServer) {
      // Laisser pdfkit en dépendance externe côté serveur pour préserver l'accès à ses fichiers de données (AFM)
      const ext = (config.externals || []) as any[];
      ext.push("pdfkit");
      config.externals = ext;

      // Injecter un polyfill pour 'self', 'window' et 'document' dans le bundle serveur
      const documentPolyfill = require.resolve('./src/lib/document-polyfill.js');
      config.plugins.push(
        new webpack.ProvidePlugin({
          self: 'globalThis',
          window: 'globalThis',
          document: documentPolyfill,
        }),
        new webpack.DefinePlugin({
          'self': 'globalThis',
          'window': 'globalThis',
        }),
        new webpack.BannerPlugin({
          banner: `
            (function() {
              const docPolyfill = require('${documentPolyfill.replace(/\\/g, '\\\\')}');
              if (typeof globalThis !== 'undefined') {
                if (typeof globalThis.self === 'undefined') {
                  globalThis.self = globalThis;
                }
                if (typeof globalThis.window === 'undefined') {
                  globalThis.window = globalThis;
                }
                if (typeof globalThis.document === 'undefined') {
                  globalThis.document = docPolyfill;
                }
              }
              if (typeof global !== 'undefined') {
                if (typeof global.self === 'undefined') {
                  global.self = global;
                }
                if (typeof global.window === 'undefined') {
                  global.window = global;
                }
                if (typeof global.document === 'undefined') {
                  global.document = docPolyfill;
                }
              }
              if (typeof document === 'undefined') {
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
            })();
          `,
          raw: true,
          entryOnly: true,
        })
      );
    }
    // Ne pas surcharger splitChunks : Next.js gère le chunking et un name: 'vendors' fixe
    // peut casser le runtime (undefined.length dans webpack-runtime).
    return config;
  },
};

export default nextConfig;
