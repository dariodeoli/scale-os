import {notFound} from 'next/navigation';
import {UiCatalog} from './ui-catalog';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Biblioteca local · ScaleOS', robots: {index: false, follow: false}};
export default function Page() {
  if (process.env.SCALE_UI_CATALOG !== '1') notFound();
  return <UiCatalog/>;
}
