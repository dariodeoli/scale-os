import jwt from 'jsonwebtoken';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');
  return secret;
}

export type Session = { id: string; email: string; role: string; name: string };
export function signSession(session: Session) { return jwt.sign(session, getSecret(), { expiresIn: '12h' }); }
export function verifySession(token: string) { return jwt.verify(token, getSecret()) as Session; }
