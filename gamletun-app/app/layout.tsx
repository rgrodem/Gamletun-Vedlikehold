import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import MobileBottomNav from "@/components/MobileBottomNav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600"],
  display: "swap",
});

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
  themeColor: "#f7f3ec",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="antialiased bg-bg text-ink pb-16 sm:pb-0">
        {children}
        <MobileBottomNav />
      </body>
    </html>
  );
}
