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
  title: "TEGA — Berani khianat?",
  description: "On-chain split-or-steal trust game on Monad",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${orbitron.variable} ${oxanium.variable} scanlines antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
