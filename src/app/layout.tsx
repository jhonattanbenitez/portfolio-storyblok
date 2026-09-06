import { Inter } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import StoryblokProvider from "../../components/StoryblokProvider";
import { GoogleAnalytics } from "@next/third-parties/google";
import CookieBanner from "../../components/CookieBanner";
import { AlternateLinksProvider } from "../../contexts/AlternateLinksContext";
import { ThemeProvider } from "../../contexts/ThemeContext";
import NavBarWrapper from "../../components/NavBarWrapper";
import ErrorBoundary from "../../components/ErrorBoundary";
import { headers } from "next/headers";
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
              </StoryblokProvider>
            </AlternateLinksProvider>
          </ThemeProvider>
        </ErrorBoundary>
        <GoogleAnalytics gaId="G-ZT1LVQ4YHC" />
      </body>
    </html>
  );
}
