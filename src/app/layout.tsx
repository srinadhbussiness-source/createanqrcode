import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "CreateAnQRCode — Create Stunning QR Codes in Seconds. Free.",
  description:
    "Create stunning QR codes in seconds. 83+ types, full design control, dynamic links with scan analytics. Free forever, no watermark, no sign-up. Pricing in USD.",
  keywords: ["QR code generator", "free QR code", "UPI QR code", "WiFi QR code", "vCard QR", "dynamic QR code", "QR analytics"],
  authors: [{ name: "CreateAnQRCode" }],
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "CreateAnQRCode — Create Stunning QR Codes in Seconds. Free.",
    description: "Create stunning QR codes in seconds. 83+ types, no watermark, free forever.",
    siteName: "CreateAnQRCode",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'CreateAnQRCode',
    description: 'Free QR code generator with 83+ types, full customization, dynamic links, and scan analytics.',
    url: 'https://createanqrcode.com',
    logo: 'https://createanqrcode.com/logo.svg',
    sameAs: [],
  }

  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'CreateAnQRCode',
    description: 'Free QR code generator. 83+ QR types, custom colors & logo, dynamic links with scan analytics. No watermark, no sign-up required.',
    url: 'https://createanqrcode.com',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isAccessibleForFree: true,
    featureList: ['83+ QR types', 'No watermark', 'Dynamic QR codes', 'Scan analytics', 'REST API', 'Bulk generation', 'PNG & SVG export'],
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground theme-transition`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
          <QueryProvider>
            {children}
            <Toaster />
            <SonnerToaster position="bottom-right" richColors={false} closeButton />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
