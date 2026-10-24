import type { Metadata } from "next";
import { Orbitron, Oxanium } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  variable: "--font-display",
});
const oxanium = Oxanium({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--font-ui",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "TEGA: Split it. Or steal it.",
  description: "A live on-chain trust game on Monad. Split the pot, or take it all. Built for Monad Blitz Jogja.",
  manifest: "/site.webmanifest",
  appleWebApp: { title: "Tega" },
  icons: {
    icon: [
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  openGraph: {
    title: "TEGA: Split it. Or steal it.",
    description: "A live on-chain trust game on Monad. Split it, or steal it.",
    images: ["/tega-asset/tega-og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${orbitron.variable} ${oxanium.variable} bg-arcade scanlines min-h-screen antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
