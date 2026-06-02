import type { Metadata, Viewport } from "next";
import "./globals.css";
import MobileBottomNav from "@/components/MobileBottomNav";
import ServiceWorkerRegister from "@/components/layout/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Gamletun Vedlikehold",
  description: "Vedlikeholdssystem for Gamletun maskinpark",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gamletun",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#f7f3ec",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <body className="antialiased bg-bg text-ink pb-16 sm:pb-0">
        {children}
        <MobileBottomNav />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
