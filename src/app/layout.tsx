import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Manrope, Space_Grotesk } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { CountryProvider } from "@/components/providers/country-context";
import { DemoStoreProvider } from "@/components/providers/demo-store-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { RootLoadingFallback } from "@/components/root-loading-fallback";
import { getSessionUserId } from "@/lib/session";
import { getAppBootstrap } from "@/server/data/bootstrap";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim() || "http://localhost:3007";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Followable · mapa a skrytá místa",
    template: "%s · Followable",
  },
  description:
    "Mobilní mapa a feed pro komunity, cestovatele a průvodce — přesná místa, regiony, témata a tvůrci.",
  openGraph: {
    type: "website",
    siteName: "Followable",
  },
};

async function AppWithBootstrap({ children }: { children: React.ReactNode }) {
  const viewerId = await getSessionUserId();
  const { snapshot, featureModes } = await getAppBootstrap();

  return (
    <DemoStoreProvider
      key={`${featureModes.appMode}:${viewerId ?? "guest"}`}
      viewerId={viewerId}
      initialSnapshot={snapshot}
      featureModes={featureModes}
    >
      <CountryProvider>
        <AppShell>{children}</AppShell>
      </CountryProvider>
    </DemoStoreProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bodyFont.variable} ${displayFont.variable} antialiased`}>
        <ThemeProvider>
          <Suspense fallback={<RootLoadingFallback />}>
            <AppWithBootstrap>{children}</AppWithBootstrap>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
