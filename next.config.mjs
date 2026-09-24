/** @type {import('next').NextConfig} */
import {resolveCoreApiOrigin} from './core-api-origin.mjs';

const nextConfig = {
  output: 'standalone',
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
        { key: 'X-DNS-Prefetch-Control', value: 'off' },
        { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
        // Google OAuth uses a redirect-based flow. `same-origin-allow-popups` keeps
        // cross-origin isolation without breaking that user-controlled handoff.
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; frame-src 'none'; img-src 'self' data: https:; font-src 'self' data:; media-src 'self'; manifest-src 'self'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://api.scaleparaguay.com; upgrade-insecure-requests" },
      ],
    }];
  },
  // Resolve legacy URLs before rendering: a real Location header, even without JavaScript.
  async redirects() {
    return [
      { source: '/actividad', destination: '/equipo/actividad', permanent: false },
      { source: '/metricas', destination: '/pipeline/metricas', permanent: false },
      { source: '/mora', destination: '/pagos/mora', permanent: false },
      { source: '/planes', destination: '/presupuestos/planes', permanent: false },
      { source: '/comisiones', destination: '/equipo/comisiones', permanent: false },
      { source: '/papelera', destination: '/configuracion/papelera', permanent: false },
      { source: '/colaboradores', destination: '/equipo', permanent: false },
    ];
  },
  async rewrites() {
    const coreApiOrigin=resolveCoreApiOrigin();
    return [
      {source:'/review/:path*',destination:coreApiOrigin+'/review/:path*'},
      {source:'/p/:path*',destination:coreApiOrigin+'/p/:path*'},
      {
        source: '/core-api/:path*',
        destination: coreApiOrigin+'/:path*',
      },
    ];
  },
};
export default nextConfig;
