import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';

const clientSchema = z.object({ name: z.string().trim().min(2).max(120), email: z.string().email().optional().or(z.literal('')), phone: z.string().trim().max(40).optional(), notes: z.string().trim().max(1000).optional() });
function authFailure(error: unknown) {
  return error instanceof Error && (error.message === 'UNAUTHORIZED' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'NotBeforeError');
}
export async function GET(request: NextRequest) {
  try {
    requireSession(request);
    return NextResponse.json({ clients: await prisma.client.findMany({ orderBy: { createdAt: 'desc' } }) });
  } catch (error) {
    if (authFailure(error)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
    console.error('clients.list_failed', error instanceof Error ? error.name : typeof error, error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'No se pudieron cargar los clientes.' }, { status: 500 });
  }
}
export async function POST(request: NextRequest) {
  try {
    const session = requireSession(request);
    if (!['OWNER', 'ADMIN', 'MANAGEMENT', 'SALES'].includes(session.role)) return NextResponse.json({ error: 'Sin permiso para crear clientes.' }, { status: 403 });
    const body = clientSchema.parse(await request.json());
    const client = await prisma.client.create({ data: { name: body.name, email: body.email || null, phone: body.phone || null, notes: body.notes || null } });
    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    if (authFailure(error)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
    console.error('clients.create_failed', error instanceof Error ? error.name : typeof error, error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'No se pudo crear el cliente.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = requireSession(request);
    if (!['OWNER', 'ADMIN'].includes(session.role)) return NextResponse.json({ error: 'Sin permiso para eliminar clientes.' }, { status: 403 });
    const raw = new URL(request.url).searchParams.get('id');
    if (!raw) return NextResponse.json({ error: 'Cliente requerido.' }, { status: 400 });
    const id = z.string().min(1).parse(raw);
    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (authFailure(error)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
    console.error('clients.delete_failed', error instanceof Error ? error.name : typeof error, error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'No se pudo eliminar el cliente.' }, { status: 500 });
  }
}
