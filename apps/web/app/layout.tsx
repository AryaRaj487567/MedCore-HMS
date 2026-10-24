import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MedCore HMS — Hospital Management Platform',
  description: 'Production-grade, multi-tenant cloud-native hospital management SaaS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-sky-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
