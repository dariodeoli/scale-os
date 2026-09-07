import { NextRequest } from 'next/server';
import { verifySession } from './auth';

export function requireSession(request: NextRequest) {
  const token = request.cookies.get('scale_os_session')?.value;
  if (!token) throw new Error('UNAUTHORIZED');
  return verifySession(token);
}
