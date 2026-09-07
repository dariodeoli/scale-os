import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('scale_os_session')?.value;
    if (!token) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({ user: verifySession(token) });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
