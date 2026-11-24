import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { EditorDialogs } from "@/components/editor/editor-prompt";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SyncPad",
  description: "Collaborative real-time document editor",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className={`${inter.className} flex h-full flex-col overflow-hidden font-sans antialiased`}
      >
        {children}
        <EditorDialogs />
      </body>
    </html>
  );
}
