import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gamletun Vedlikehold",
  description: "Vedlikeholdslogg for gårdsutstyr",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
