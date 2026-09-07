import { NextRequest, NextResponse } from 'next/server';
import { WorkStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';

const workOrderSchema = z.object({ title: z.string().trim().min(2).max(180), description: z.string().trim().max(2000).optional(), projectId: z.string().min(1), status: z.nativeEnum(WorkStatus).default(WorkStatus.TO_RECORD), driveUrl: z.string().url().optional().or(z.literal('')) });
export async function GET(request: NextRequest) {
  try { requireSession(request); return NextResponse.json({ workOrders: await prisma.workOrder.findMany({ include: { project: { include: { client: true } }, assignee: { select: { name: true } } }, orderBy: { updatedAt: 'desc' } }) }); }
  catch { return NextResponse.json({ error: 'No autorizado.' }, { status: 401 }); }
}
export async function POST(request: NextRequest) {
  try {
    const session = requireSession(request);
    if (!['OWNER', 'ADMIN', 'MANAGEMENT', 'PRODUCTION', 'EDITOR'].includes(session.role)) return NextResponse.json({ error: 'Sin permiso para crear órdenes.' }, { status: 403 });
    const body = workOrderSchema.parse(await request.json());
    const workOrder = await prisma.workOrder.create({ data: { title: body.title, description: body.description || null, projectId: body.projectId, status: body.status, driveUrl: body.driveUrl || null }, include: { project: { include: { client: true } } } });
    return NextResponse.json({ workOrder }, { status: 201 });
  } catch (error) {
    console.error('work_orders.create_failed', { error });
    return NextResponse.json({ error: 'No se pudo crear la orden.' }, { status: 400 });
  }
}
