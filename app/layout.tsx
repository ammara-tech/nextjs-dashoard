import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | Family Clinic Platform',
    default: 'Family Clinic, Medical Aid and Invoice Dashboards',
  },
  description:
    'Three dashboards in one app: the Family Clinic for patients, doctors, reception and pharmacy, Medical Aid Care Plans, and the Next.js invoice dashboard.',
  metadataBase: new URL('https://nextjs-dashoard-psi.vercel.app'),
};

export const viewport: Viewport = {
  themeColor: '#0F172A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
