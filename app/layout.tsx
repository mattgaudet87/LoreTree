import { Suspense } from "react";
import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import TabBar from "@/components/TabBar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LoreTree",
  description: "Rediscover your photo library through AI-written stories, tags, and guided memory conversations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${fraunces.variable} bg-bg text-text antialiased`}>
        <main className="min-h-dvh">{children}</main>
        {/* TabBar reads the address's query string, which Next.js requires inside Suspense. */}
        <Suspense fallback={null}>
          <TabBar />
        </Suspense>
      </body>
    </html>
  );
}
