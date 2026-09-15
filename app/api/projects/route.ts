import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';

const httpsUrl = z.string().url().refine(u => { try { const p = new URL(u); return p.protocol === 'https:' && !p.username && !p.password; } catch { return false; } });
const projectSchema = z.object({ name: z.string().trim().min(2).max(150), clientId: z.string().min(1), driveUrl: httpsUrl.optional().or(z.literal('')) });
function authFailure(error: unknown) {
  return error instanceof Error && (error.message === 'UNAUTHORIZED' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'NotBeforeError');
}
export async function GET(request: NextRequest) {
  try {
    requireSession(request);
    return NextResponse.json({ projects: await prisma.project.findMany({ include: { client: true, _count: { select: { workOrders: true } } }, orderBy: { createdAt: 'desc' } }) });
  } catch (error) {
    if (authFailure(error)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
    console.error('projects.list_failed', error instanceof Error ? error.name : typeof error, error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'No se pudieron cargar los proyectos.' }, { status: 500 });
  }
}
export async function POST(request: NextRequest) {
  try {
    const session = requireSession(request);
    if (!['OWNER', 'ADMIN', 'MANAGEMENT', 'PRODUCTION', 'SALES'].includes(session.role)) return NextResponse.json({ error: 'Sin permiso para crear proyectos.' }, { status: 403 });
    const body = projectSchema.parse(await request.json());
    const project = await prisma.project.create({ data: { name: body.name, clientId: body.clientId, driveUrl: body.driveUrl || null }, include: { client: true, _count: { select: { workOrders: true } } } });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (authFailure(error)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
    console.error('projects.create_failed', error instanceof Error ? error.name : typeof error, error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'No se pudo crear el proyecto.' }, { status: 500 });
  }
}
