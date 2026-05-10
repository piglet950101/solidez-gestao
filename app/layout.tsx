import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Solidez Gestão',
  description: 'Sistema financeiro multi-empresa da Solidez Empreiteira',
  applicationName: 'Solidez Gestão',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico', apple: '/icon-192.png' },
  appleWebApp: { capable: true, title: 'Solidez Gestão', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: '#143d31',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
