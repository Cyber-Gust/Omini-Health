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
    // ❗ só no servidor: não deixe o SSR tocar no onnxruntime-node
    if (isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'onnxruntime-node': false,
        '@xenova/transformers/node_modules/onnxruntime-node': false,
      };

      config.plugins.push(
        new webpack.IgnorePlugin({ resourceRegExp: /onnxruntime-node/ })
      );

      config.externals = [
        ...(config.externals || []),
        'onnxruntime-node',
      ];
    }

    return config;
  },

  // 👉 Para o caminho "mais simples", REMOVA COOP/COEP.
  // Se você mantiver COEP:require-corp, terá que hospedar os modelos/wasm localmente
  // e servir com CORP, ou habilitar CORS nos terceiros. Então vamos tirar:
  async headers() {
    return []; // sem COOP/COEP por enquanto
  },
};

export default nextConfig;
