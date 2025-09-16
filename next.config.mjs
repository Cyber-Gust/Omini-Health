// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // >>> ADIÇÃO: ajustes de webpack para Xenova/onnxruntime-web <<<
  webpack: (config, { isServer }) => {
    // No cliente, garanta que NUNCA entre o binding nativo
    if (!isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'onnxruntime-node': false, // impede bundling do .node
      };
    }

    // Habilita WASM assíncrono (usado pelo onnxruntime-web)
    config.experiments = {
      ...(config.experiments || {}),
      asyncWebAssembly: true,
      layers: true,
    };

    // Trate .wasm como asset (evita parse como JS)
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    return config;
  },
};

const securityHeaders = [
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // ⚠️ Ative COEP abaixo APENAS se todos os recursos externos tiverem CORP/CORS correto
  // { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
];

export default {
  ...nextConfig,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
