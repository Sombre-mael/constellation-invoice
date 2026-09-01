import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaProvider } from "@/components/pwa-manager";
import { getAppVersion } from "@/lib/app-version";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Constellation — Studio de devis",
  description:
    "Créez, personnalisez et partagez des devis professionnels avec Constellation.",
  openGraph: {
    title: "Constellation — Studio de devis",
    description: "Créez, personnalisez et partagez des devis professionnels.",
    images: [{ url: "/og.png", width: 1792, height: 1024, alt: "Constellation — Studio de devis" }],
    locale: "fr_CD",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Constellation — Studio de devis",
    description: "Créez, personnalisez et partagez des devis professionnels.",
    images: ["/og.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Constellation",
  },
  icons: {
    apple: [{ url: "/pwa-icon/180", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#16231f",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body><PwaProvider clientVersion={getAppVersion()}>{children}</PwaProvider></body>
    </html>
  );
}
