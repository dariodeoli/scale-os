import { NextRequest, NextResponse } from 'next/server';
import { WorkStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';

const httpsUrl = z.string().url().refine(u => { try { const p = new URL(u); return p.protocol === 'https:' && !p.username && !p.password; } catch { return false; } });
const workOrderSchema = z.object({ title: z.string().trim().min(2).max(180), description: z.string().trim().max(2000).optional(), projectId: z.string().min(1), status: z.enum(['blocked', 'to_record', 'recorded', 'editing', 'review']).default('to_record'), driveUrl: httpsUrl.optional().or(z.literal('')) });
function authFailure(error: unknown) {
  return error instanceof Error && (error.message === 'UNAUTHORIZED' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'NotBeforeError');
}
export async function GET(request: NextRequest) {
  try {
    requireSession(request);
    return NextResponse.json({ workOrders: await prisma.workOrder.findMany({ include: { project: { include: { client: true } }, assignee: { select: { name: true } } }, orderBy: { updatedAt: 'desc' } }) });
  } catch (error) {
    if (authFailure(error)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
    console.error('work_orders.list_failed', error instanceof Error ? error.name : typeof error, error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'No se pudieron cargar las órdenes de trabajo.' }, { status: 500 });
  }
}
export async function POST(request: NextRequest) {
  try {
    const session = requireSession(request);
    if (!['OWNER', 'ADMIN', 'MANAGEMENT', 'PRODUCTION', 'EDITOR'].includes(session.role)) return NextResponse.json({ error: 'Sin permiso para crear órdenes.' }, { status: 403 });
    const body = workOrderSchema.parse(await request.json());
    const workOrder = await prisma.workOrder.create({ data: { title: body.title, description: body.description || null, projectId: body.projectId, status: body.status.toUpperCase() as WorkStatus, driveUrl: body.driveUrl || null }, include: { project: { include: { client: true } } } });
    return NextResponse.json({ workOrder }, { status: 201 });
  } catch (error) {
    if (authFailure(error)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
    console.error('work_orders.create_failed', error instanceof Error ? error.name : typeof error, error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'No se pudo crear la orden.' }, { status: 500 });
  }
}
