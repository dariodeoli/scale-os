/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/core-api/:path*',
        destination: 'https://admin.scaleparaguay.com/:path*',
      },
    ];
  },
};
export default nextConfig;
