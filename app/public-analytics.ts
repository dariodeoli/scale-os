// Public analytics is opt-in per surface. No NEXT_PUBLIC or build-time credentials.
export const ANALYTICS_HOSTS = {
  'sistema.scaleparaguay.com': 'UMAMI_LANDING_WEBSITE_ID',
  'blog.scaleparaguay.com': 'UMAMI_COMPANY_BLOG_WEBSITE_ID',
  'producto.scaleparaguay.com': 'UMAMI_PRODUCT_BLOG_WEBSITE_ID',
} as const;
export type AnalyticsHost = keyof typeof ANALYTICS_HOSTS;
export type AnalyticsConfig = {host: AnalyticsHost; origin: string; website: string};
export const ANALYTICS_LOADER = '/public-analytics/loader.js';
export const ANALYTICS_COLLECT = '/public-analytics/collect';

export function isAnalyticsHost(host: string): host is AnalyticsHost {
  return Object.hasOwn(ANALYTICS_HOSTS, host);
}

export function doNotTrack(value: string | null | undefined): boolean {
  return value === '1' || value?.toLowerCase() === 'yes';
}

export function analyticsConfig(host: string, env: NodeJS.ProcessEnv = process.env): AnalyticsConfig | null {
  host = host.toLowerCase();
  if (!isAnalyticsHost(host)) return null;
  const website = env[ANALYTICS_HOSTS[host]]?.trim() || '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(website)) return null;
  try {
    const origin = new URL(env.UMAMI_ORIGIN?.trim() || '');
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.port ||
        origin.pathname !== '/' || origin.search || origin.hash || isAnalyticsHost(origin.hostname) ||
        !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(origin.hostname) ||
        /\.(?:localhost|local|internal|test|invalid)$/i.test(origin.hostname)) return null;
    return {host, origin: origin.origin, website};
  } catch {
    return null;
  }
}
