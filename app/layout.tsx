import type { Metadata } from "next";
import "./globals.css";

// NOTE: `next/font/google` (Geist) was removed because it downloads the font
// .woff2 files from fonts.gstatic.com at COMPILE time. On this network that
// fetch never completes, so Turbopack hangs forever on "Compiling ...".
// The --font-geist-sans / --font-geist-mono CSS variables are now defined in
// globals.css with a system fallback stack. To get the real Geist typeface
// back without any network-at-compile, run `npm install geist` and import
// GeistSans / GeistMono from "geist/font" (those ship the fonts locally).

export const metadata: Metadata = {
  title: "MegaPrecisionTracker",
  description: "Factory floor precision tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
