import './globals.css';
import './qa-fixes.css';
import './mobile-forms.css';
import type { Metadata } from 'next';
import {NotificationCenter} from './notification-center';

export const metadata: Metadata = {
  title: 'Scale OS',
  description: 'Operación interna de Scale Strategy Group',
  robots: {index:false,follow:false},
  icons: {
    icon: [
      { url: '/brand/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/brand/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/brand/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/brand/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
    shortcut: '/brand/favicon-32.png',
  },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}<NotificationCenter/></body></html>; }
