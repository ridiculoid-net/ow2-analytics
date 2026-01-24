import type { Metadata, Viewport } from "next";
import { Header } from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "OW2 Analytics - ridiculoid + buttstough",
  description: "Screenshot -> OCR -> dashboards. Maps, heroes, KDA, streaks, duo stats.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <ThemeProvider>
          <Header />
          <main className="relative">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
