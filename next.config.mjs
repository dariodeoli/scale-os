/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
    const api='http://127.0.0.1:3001';
    return {beforeFiles:[
      // Existing Google callback domain becomes an alias of this same deployment.
      {source:'/:path*',has:[{type:'host',value:'admin.scaleparaguay.com'}],destination:api+'/:path*'},
      {source:'/health',destination:api+'/health'},
      {source:'/review/:path*',destination:api+'/review/:path*'},
      {source:'/p/:path*',destination:api+'/p/:path*'},
      {source:'/core-api/:path*',destination:api+'/:path*'},
    ],afterFiles:[],fallback:[]};
  },
};
export default nextConfig;
