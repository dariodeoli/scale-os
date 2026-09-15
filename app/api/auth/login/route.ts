import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { signSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
const DUMMY_PASSWORD_HASH = '$2b$12$omy18POaGscUbJnnFWRU3ukVyvfelNjMkdv0COIVQtuLyRRHfN8eK';
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 30;
const loginAttempts = new Map<string, number[]>();
function attemptsInWindow(key: string) {
  const now = Date.now();
  const recent = (loginAttempts.get(key) || []).filter(at => now - at < LOGIN_WINDOW_MS);
  loginAttempts.set(key, recent);
  if (loginAttempts.size > 1000) for (const [k, v] of loginAttempts) if (v.length === 0) loginAttempts.delete(k);
  return recent;
}
export async function POST(request: NextRequest) {
  try {
    let payload: unknown;
    try { payload = await request.json(); } catch { return NextResponse.json({ error: 'Email o contraseña incorrectos.' }, { status: 401 }); }
    const parsed = credentialsSchema.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ error: 'Email o contraseña incorrectos.' }, { status: 401 });
    const email = parsed.data.email.toLowerCase();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const key = `${email}|${ip}`;
    const recent = attemptsInWindow(key);
    if (recent.length >= LOGIN_MAX_ATTEMPTS) return NextResponse.json({ error: 'Demasiados intentos de inicio de sesión. Probá de nuevo en 15 minutos.' }, { status: 429 });
    const user = await prisma.user.findUnique({ where: { email } });
    const passwordOk = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : (await bcrypt.compare(parsed.data.password, DUMMY_PASSWORD_HASH), false);
    if (!user || !user.active || !passwordOk) {
      recent.push(Date.now());
      loginAttempts.set(key, recent);
      return NextResponse.json({ error: 'Email o contraseña incorrectos.' }, { status: 401 });
    }
    loginAttempts.delete(key);
    const response = NextResponse.json({ user: { name: user.name, email: user.email, role: user.role } });
    response.cookies.set('scale_os_session', signSession({ id: user.id, email: user.email, role: user.role, name: user.name }), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 12, path: '/' });
    return response;
  } catch (error) {
    console.error('auth.login_failed', error instanceof Error ? error.name : typeof error, error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'No se pudo iniciar sesión.' }, { status: 500 });
  }
}
