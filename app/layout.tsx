import './globals.css';
import './qa-fixes.css';
import './mobile-forms.css';
import './ui-system.css';
import {NotificationCenter} from './notification-center';
import {scaleMetadata,viewport} from './brand-metadata';

export const metadata=scaleMetadata;
export {viewport};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}<NotificationCenter/></body></html>; }
