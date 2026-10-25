import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Funnel_Display } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";

import "../globals.css";

const funnel = Funnel_Display({
  variable: "--font-funnel",
  subsets: ["latin", "latin-ext"],
  weight: "variable",
});

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: "variable",
  // next/font has no metrics for this family yet, so it cannot generate an adjusted fallback.
  adjustFontFallback: false,
  fallback: ["system-ui", "sans-serif"],
});

export function generateStaticParams(): { locale: string }[] {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("title"), description: t("description") };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">): Promise<React.ReactElement> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${funnel.variable} ${atkinson.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
