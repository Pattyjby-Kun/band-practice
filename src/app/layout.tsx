import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { BandProvider } from "@/components/bands/BandProvider";
import AppShell from "@/components/layout/AppShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import { notoSansThai } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Band Practice Song Manager",
  description: "Manage song lists for band rehearsals — vote, organize, and access all your practice resources.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6366F1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${notoSansThai.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght@8..144,100..1000&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <AuthProvider>
            <BandProvider>
              <AppShell>{children}</AppShell>
            </BandProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
