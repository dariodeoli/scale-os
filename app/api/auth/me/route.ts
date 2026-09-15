import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('scale_os_session')?.value;
    if (!token) return NextResponse.json({ user: null }, { status: 401 });
    const session = verifySession(token);
    const dbUser = await prisma.user.findUnique({ where: { id: session.id } });
    if (!dbUser || !dbUser.active) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({ user: { id: dbUser.id, email: dbUser.email, role: dbUser.role, name: dbUser.name, full_name: null, photo_url: null, organization_id: null, organization_name: null, organization_slug: null, subscription: null, platform_role: null, platform_admin: false, demo_owner_user_id: null, default_currency: null } });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
