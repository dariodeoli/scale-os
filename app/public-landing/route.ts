import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {analyticsBootstrap,requestAnalyticsConfig} from '../public-analytics-server';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (request.headers.get('host')?.toLowerCase() !== 'sistema.scaleparaguay.com') return new Response(null, {status: 404});
  const html = await readFile(join(process.cwd(), 'public', 'scale-os.html'), 'utf8');
  const config = requestAnalyticsConfig(request.headers);
  const body = config ? html.replace('</head>', `<script>${analyticsBootstrap(config)}</script>\n</head>`) : html;
  return new Response(body, {headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store'}});
}
