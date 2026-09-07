import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { signSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(8).max(128) });
export async function POST(request: Request) {
  try {
    const body = credentialsSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !user.active || !(await bcrypt.compare(body.password, user.passwordHash))) return NextResponse.json({ error: 'Email o contraseña incorrectos.' }, { status: 401 });
    const response = NextResponse.json({ user: { name: user.name, email: user.email, role: user.role } });
    response.cookies.set('scale_os_session', signSession({ id: user.id, email: user.email, role: user.role, name: user.name }), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 12, path: '/' });
    return response;
  } catch (error) {
    console.error('auth.login_failed', { error });
    return NextResponse.json({ error: 'No se pudo iniciar sesión.' }, { status: 400 });
  }
}
