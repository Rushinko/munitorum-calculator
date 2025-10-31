
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css"
import AppBar from "@/components/ui/appbar";
import { ThemeProvider } from "@/components/theme-provider";
import useToolsStore from "./store";
import ModifiersBar from "@/components/ui/modifiersBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Munitorum Calculator",
  description: "A calculator tool for the Munitorum 40K companion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <AppBar />

          <div className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground font-sans min-h-fill flex flex-col p-4`}>
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
