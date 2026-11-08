import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider, themeBootstrapScript } from "@/lib/theme";
import "@/styles/global.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: { default: "NN", template: "%s · NN" },
  description: "A private personal operating environment.",
  applicationName: "NN",
  robots: { index: false, follow: false, nocache: true },
  icons: { icon: "/brand/nn/nn-favicon.svg", apple: "/brand/nn/nn-app-icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07111F" },
    { media: "(prefers-color-scheme: light)", color: "#F7F9FC" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before first paint so there is no flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className={inter.variable}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
