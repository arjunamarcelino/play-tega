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
  icons: { icon: "/tega-asset/tega-icon.png" },
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
