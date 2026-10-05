import {serveAnalyticsLoader} from '../../public-analytics-server';
export const dynamic = 'force-dynamic';
export function GET(request: Request) { return serveAnalyticsLoader(request); }
