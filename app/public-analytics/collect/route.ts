import {collectAnalytics} from '../../public-analytics-server';
export const dynamic = 'force-dynamic';
export function POST(request: Request) { return collectAnalytics(request); }
