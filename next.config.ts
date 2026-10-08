import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/medic-clinic/:path*',
        destination: '/medi-clinic/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
