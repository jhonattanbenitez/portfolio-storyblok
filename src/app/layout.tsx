import { Inter } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import StoryblokProvider from "../../components/StoryblokProvider";
import { GoogleAnalytics } from "@next/third-parties/google";
import CookieBanner from "../../components/CookieBanner";
import { LanguageProvider } from "../../contexts/LanguageContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jhonattan Benitez Portfolio",
  description:
    "Hello, I'm Jhonattan Benitez, a Front-End Developer. I specialize in building websites and web applications using modern technologies with a accessibility-first approach.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LanguageProvider>
          <StoryblokProvider>
            {children}
            <CookieBanner />
          </StoryblokProvider>
        </LanguageProvider>
        <GoogleAnalytics gaId="G-ZT1LVQ4YHC" />
      </body>
    </html>
  );
}
