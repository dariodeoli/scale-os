import './globals.css';
import './qa-fixes.css';
import './mobile-forms.css';
import './ui-system.css';
import {NotificationCenter} from './notification-center';
import {scaleMetadata,viewport} from './brand-metadata';

export const metadata=scaleMetadata;
export {viewport};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><head><script dangerouslySetInnerHTML={{__html:`try{var t=localStorage.getItem('scale-theme');if(t==='dark')document.documentElement.dataset.theme='dark';}catch(e){}`}}/></head><body>{children}<NotificationCenter/></body></html>; }
