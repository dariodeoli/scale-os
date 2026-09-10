/** @type {import('next').NextConfig} */
const nextConfig = {
  // Resolve legacy URLs before rendering: a real Location header, even without JavaScript.
  async redirects() {
    return [
      { source: '/actividad', destination: '/equipo/actividad', permanent: false },
      { source: '/metricas', destination: '/pipeline', permanent: false },
      { source: '/pipeline/metricas', destination: '/pipeline', permanent: false },
      { source: '/mora', destination: '/pagos/mora', permanent: false },
      { source: '/planes', destination: '/presupuestos/planes', permanent: false },
      { source: '/comisiones', destination: '/equipo/comisiones', permanent: false },
      { source: '/papelera', destination: '/configuracion/papelera', permanent: false },
      { source: '/colaboradores', destination: '/equipo', permanent: false },
    ];
  },
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
