import { Inter } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import StoryblokProvider from "../../components/StoryblokProvider";
import ConsentedAnalytics from "../../components/ConsentedAnalytics";
import CookieBanner from "../../components/CookieBanner";
import { AlternateLinksProvider } from "../../contexts/AlternateLinksContext";
import { ThemeProvider } from "../../contexts/ThemeContext";
import NavBarWrapper from "../../components/NavBarWrapper";
import ErrorBoundary from "../../components/ErrorBoundary";
import { headers } from "next/headers";
import { getAuthorizedDraftMode } from "../../lib/draft-session";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DEFAULT_LANGUAGE, HTML_LANGUAGES } from "../../utils/i18n";
import { getSiteUrl } from "../../utils/seo";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jhonattan Benitez Portfolio",
  description:
    "Hello, I'm Jhonattan Benitez, a Front-End Developer. I specialize in building websites and web applications using modern technologies with a accessibility-first approach.",
  metadataBase: new URL(getSiteUrl()),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const { isEnabled: isDraft } = await getAuthorizedDraftMode();
  // Reject before the root shell streams, so unauthorized previews return a
  // real 404. The page repeats authorization before touching the data layer.
  if (requestHeaders.get("x-live-preview-path") === "1" && !isDraft) notFound();
  // Enable only after the GA4 history-based enhanced measurement setting has
  // been checked. Otherwise manual pageviews could duplicate remote settings.
  const analyticsEnabled = process.env.NODE_ENV === "production"
    && process.env.ANALYTICS_ENABLED === "true"
    && !isDraft && requestHeaders.get("x-preview-request") !== "1";
  const locale = requestHeaders.get("x-language") === "es-co"
    ? "es-co"
    : DEFAULT_LANGUAGE;
  const htmlLanguage = HTML_LANGUAGES[locale];

  return (
    <html lang={htmlLanguage} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Theme detection
                  var theme = localStorage.getItem('theme') || 'system';
                  var resolvedTheme = theme;
                  
                  if (theme === 'system') {
                    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  
                  document.documentElement.classList.add(resolvedTheme);
                  
                } catch (e) {
                  console.warn('Error in layout script:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <ThemeProvider>
            <AlternateLinksProvider>
              <StoryblokProvider>
                <NavBarWrapper />
                {children}
                <CookieBanner />
                <Suspense fallback={null}>
                  <ConsentedAnalytics enabled={analyticsEnabled} />
                </Suspense>
              </StoryblokProvider>
            </AlternateLinksProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
