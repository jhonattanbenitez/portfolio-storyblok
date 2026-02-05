import { Inter } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import StoryblokProvider from "../../components/StoryblokProvider";
import { GoogleAnalytics } from "@next/third-parties/google";
import CookieBanner from "../../components/CookieBanner";
import { LanguageProvider } from "../../contexts/LanguageContext";
import { ThemeProvider } from "../../contexts/ThemeContext";
import NavBarWrapper from "../../components/NavBarWrapper";
import ErrorBoundary from "../../components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jhonattan Benitez Portfolio",
  description:
    "Hello, I'm Jhonattan Benitez, a Front-End Developer. I specialize in building websites and web applications using modern technologies with a accessibility-first approach.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://jhonattanbenitez.dev",
  ),
  alternates: {
    canonical: "/",
    languages: {
      en: "/",
      "es-co": "/es-co",
      es: "/es",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
                  
                  // Language detection
                  var savedLanguage = localStorage.getItem('language');
                  if (!savedLanguage) {
                    var browserLang = navigator.language || navigator.languages?.[0];
                    if (browserLang) {
                      if (browserLang.startsWith('es')) {
                        savedLanguage = 'es-co';
                      } else if (browserLang.startsWith('en')) {
                        savedLanguage = 'en';
                      } else {
                        savedLanguage = 'en';
                      }
                      localStorage.setItem('language', savedLanguage);
                    }
                  }
                  
                  // Set language attribute
                  document.documentElement.lang = savedLanguage || 'en';
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
            <LanguageProvider>
              <StoryblokProvider>
                <NavBarWrapper />
                {children}
                <CookieBanner />
              </StoryblokProvider>
            </LanguageProvider>
          </ThemeProvider>
        </ErrorBoundary>
        <GoogleAnalytics gaId="G-ZT1LVQ4YHC" />
      </body>
    </html>
  );
}
