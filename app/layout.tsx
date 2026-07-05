import type { Metadata, Viewport } from 'next';
import './globals.css';
import { EditModeProvider, EditModeToggle } from '@/components/edit-mode-provider';

export const metadata: Metadata = {
  title: 'Territórios da Norte - Navegantes',
  description: 'Controle de visitas porta a porta por território e quadra',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body
        className="m-0 bg-[#f8fafc] text-slate-900 font-sans"
        suppressHydrationWarning
      >
        <EditModeProvider>
          <div className="flex flex-col w-full min-h-screen bg-[#f8fafc] text-slate-900 font-sans relative">
            {children}
            <EditModeToggle />
          </div>
        </EditModeProvider>
      </body>
    </html>
  );
}
