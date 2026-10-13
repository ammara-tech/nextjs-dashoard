import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import type { Metadata, Viewport } from 'next';
import { getLang } from '@/app/lib/lang';
import { I18nProvider } from '@/app/ui/i18n-provider';
import KeyboardShortcuts from '@/app/ui/keyboard-shortcuts';
import GuidedTour from '@/app/ui/guided-tour';
import { RealtimeNotifier } from '@/app/ui/notifications';

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

// Applies the saved theme before the page paints, so there is no flash.
const themeScript = `try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark'}}catch(e){}`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getLang();
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.className} antialiased`}>
        <I18nProvider lang={lang}>
          {children}
          <KeyboardShortcuts />
          <GuidedTour />
          <RealtimeNotifier />
        </I18nProvider>
      </body>
    </html>
  );
}
