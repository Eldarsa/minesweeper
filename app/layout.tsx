import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Minesveiper',
  description: 'Festvariant av Minesveiper.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no">
      <body>{children}</body>
    </html>
  );
}
