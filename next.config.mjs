/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {source:'/review/:path*',destination:'https://admin.scaleparaguay.com/review/:path*'},
      {source:'/p/:path*',destination:'https://admin.scaleparaguay.com/p/:path*'},
      {
        source: '/core-api/:path*',
        destination: 'https://admin.scaleparaguay.com/:path*',
      },
    ];
  },
};
export default nextConfig;
