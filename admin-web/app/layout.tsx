import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Devia Admin — Research Dashboard',
  description: 'Internal admin dashboard for the Devia last-mile delivery research study.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
