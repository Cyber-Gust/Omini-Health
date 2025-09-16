// next.config.mjs
import webpack from 'webpack';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', port: '', pathname: '/**' },
    ],
  },

  webpack: (config, { isServer }) => {
    // 1) ALIASES para impedir bundling do binding nativo
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // módulo “normal”
      'onnxruntime-node': false,
      // módulo (path) que vem “dentro” de @xenova/transformers
      '@xenova/transformers/node_modules/onnxruntime-node': false,
    };

    // 2) IGNORAR QUALQUER require/import desse módulo
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /onnxruntime-node/ })
    );

    // 3) GARANTIA extra: marcar como external (não resolvido pelo bundler)
    // (No client isso ajuda o tree-shaking a desistir do caminho nativo)
    config.externals = [
      ...(config.externals || []),
      ({ request }, callback) => {
        if (request && /onnxruntime-node/.test(request)) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      },
    ];

    // WASM async (onnxruntime-web)
    config.experiments = {
      ...(config.experiments || {}),
      asyncWebAssembly: true,
      layers: true,
    };

    // Tratar .wasm como asset (não tentar parsear como JS)
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    return config;
  },
};

const securityHeaders = [
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // Ative COEP somente se TODOS os recursos externos tiverem CORP/CORS
  // { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
];

export default {
  ...nextConfig,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
