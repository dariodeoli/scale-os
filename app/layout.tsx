import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Scale OS', description: 'Operación interna de Scale Strategy Group' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}</body></html>; }
