import type { Metadata } from "next";
import { Header } from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "OW2 Analytics — ridiculoid + buttstough",
  description: "Screenshot → OCR → dashboards. Maps, heroes, KDA, streaks, duo stats.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
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
