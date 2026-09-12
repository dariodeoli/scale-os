/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://admin.scaleparaguay.com" },
      ],
    }];
  },
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
