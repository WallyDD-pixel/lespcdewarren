import type { NextConfig } from "next";
import webpack from "webpack";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  // Configuration pour le middleware Edge Runtime
  experimental: {
    // Exclure globalThis du middleware
    serverComponentsExternalPackages: ['globalThis'],
  },
  webpack: (config, { isServer, webpack }) => {
    // Remplacer globalThis uniquement côté client/middleware (pas côté serveur où il est natif)
    if (!isServer) {
      // Utiliser resolve.alias pour remplacer les imports directs
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...config.resolve.alias,
        'globalThis': require.resolve('./src/lib/globalThis-polyfill.js'),
      };
      
      // Utiliser NormalModuleReplacementPlugin pour remplacer même les imports depuis node_modules
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^globalThis$/,
          require.resolve('./src/lib/globalThis-polyfill.js')
        )
      );
    }

    if (isServer) {
      // Laisser pdfkit en dépendance externe côté serveur pour préserver l'accès à ses fichiers de données (AFM)
      const ext = (config.externals || []) as any[];
      ext.push("pdfkit");
      config.externals = ext;

      // Injecter un polyfill pour 'self' et 'window' dans le bundle serveur
      config.plugins.push(
        new webpack.ProvidePlugin({
          self: 'globalThis',
          window: 'globalThis',
        }),
        new webpack.DefinePlugin({
          'self': 'globalThis',
          'window': 'globalThis',
        }),
        new webpack.BannerPlugin({
          banner: `
            if (typeof globalThis !== 'undefined') {
              if (typeof globalThis.self === 'undefined') {
                globalThis.self = globalThis;
              }
              if (typeof globalThis.window === 'undefined') {
                globalThis.window = globalThis;
              }
            }
          `,
          raw: true,
          entryOnly: false,
        })
      );
    }
    // Ne pas surcharger splitChunks : Next.js gère le chunking et un name: 'vendors' fixe
    // peut casser le runtime (undefined.length dans webpack-runtime).
    return config;
  },
};

export default nextConfig;
