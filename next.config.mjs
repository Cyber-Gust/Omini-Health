/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // NOVO: Adiciona a permissão para usar imagens do domínio placehold.co
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
};

export default nextConfig;
