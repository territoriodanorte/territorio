import type {Metadata} from 'next';
import './globals.css';
import { EditModeProvider, EditModeToggle } from '@/components/edit-mode-provider';

export const metadata: Metadata = {
  title: 'Territórios da Norte - Navegantes',
  description: 'Controle de visitas porta a porta por território e quadra',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full m-0 bg-[#f8fafc] text-slate-900 font-sans" suppressHydrationWarning>
        <EditModeProvider>
          <div className="flex flex-col min-h-full w-full max-w-[1024px] mx-auto bg-[#f8fafc] text-slate-900 font-sans shadow-2xl relative">
            {children}
            <EditModeToggle />
          </div>
        </EditModeProvider>
      </body>
    </html>
  );
}
