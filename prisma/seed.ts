import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';

const email = process.env.ADMIN_EMAIL?.toLowerCase();
const password = process.env.ADMIN_PASSWORD;
async function main() {
  if (!email || !password) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required to seed the owner account.');
  const passwordHash = bcrypt.hashSync(password, 12);
  await prisma.user.upsert({ where: { email }, update: { name: 'Dario', passwordHash, role: Role.OWNER, active: true }, create: { name: 'Dario', email, passwordHash, role: Role.OWNER } });
}
main().finally(() => prisma.$disconnect());
