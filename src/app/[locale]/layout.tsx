import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Analytics } from '@vercel/analytics/next';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { HeaderAuthSlot } from '@/components/layout/header-slot';
import { OnboardingGuard } from '@/components/auth/onboarding-guard';
import { Footer } from '@/components/layout/footer';
import { routing } from '@/i18n/routing';
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from '@/lib/constants';
import '../globals.css';

const sansFont = IBM_Plex_Sans({
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin', 'latin-ext', 'cyrillic-ext'],
});

const monoFont = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin', 'cyrillic'],
});

export const viewport: Viewport = {
  // Color the mobile browser chrome to match the brand. Light vs. dark
  // are auto-selected by the user agent based on the active OS theme.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#a855f7' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${sansFont.variable} ${monoFont.variable} font-sans antialiased overflow-x-hidden`} suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>
              <div className="flex min-h-screen flex-col">
                <Suspense
                  fallback={
                    <div
                      aria-hidden="true"
                      className="sticky top-0 z-50 h-16 w-full border-b bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70"
                    />
                  }
                >
                  <HeaderAuthSlot />
                </Suspense>
                <Suspense fallback={null}>
                  <OnboardingGuard />
                </Suspense>
                <main className="flex-1">
                  <Suspense fallback={null}>{children}</Suspense>
                </main>
                <Suspense fallback={null}>
                  <Footer />
                </Suspense>
              </div>
              <Toaster richColors position="top-right" />
            </TooltipProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
