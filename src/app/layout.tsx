import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import { PrivateAnalytics } from "@/components/PrivateAnalytics";
import { RegisterSW } from "@/components/RegisterSW";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Countersign — prove it's really them",
  description:
    "An AI fraud investigator that checks every claim in a suspicious message, and a call shield that stops voice-clone impersonators with a question only the real person can answer.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${plexMono.variable} antialiased`}>
      <body className="min-h-screen">
        <SiteHeader />
        {children}
        <RegisterSW />
        <PrivateAnalytics />
      </body>
    </html>
  );
}
