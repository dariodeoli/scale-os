import './globals.css';
import './qa-fixes.css';
import './mobile-forms.css';
import './ui-system.css';
import {NotificationCenter} from './notification-center';
import {scaleMetadata} from './brand-metadata';

export const metadata=scaleMetadata;
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}<NotificationCenter/></body></html>; }
