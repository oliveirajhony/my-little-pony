import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Poppins } from 'next/font/google';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../components/theme-provider';
import '../styles/tokens.css';
import './global.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'my-little-pony',
  description: 'Editor de documentos open-source — escreva, publique e compartilhe por link.',
  manifest: '/favicon/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/favicon/apple-touch-icon-180.svg',
  },
  openGraph: {
    title: 'my-little-pony',
    description: 'Editor de documentos open-source.',
    images: ['/og-image.svg'],
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#1f6bff',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${poppins.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
