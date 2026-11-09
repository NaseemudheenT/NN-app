import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ServiceWorker } from "@/components/ServiceWorker";
import { Room } from "@/components/nn/Room";
import { RenProvider } from "@/components/ren/RenProvider";
import { RenChrome } from "@/components/ren/RenChrome";
import { NNAppNavigation } from "@/components/nn/NNAppNavigation";
import { LiquidGlassDefs } from "@/components/ui/LiquidButton";
import { AuthProvider } from "@/lib/auth";
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
  // Tells iOS to open NN full-screen from the home screen rather than in Safari.
  appleWebApp: { capable: true, title: "NN", statusBarStyle: "black-translucent" },
  manifest: "/manifest.webmanifest",
  other: {
    // Next emits the modern `mobile-web-app-capable`, which iOS 16.4+ honours.
    // The legacy Apple name is added explicitly so full-screen launch also
    // works on older iOS versions.
    "apple-mobile-web-app-capable": "yes",
  },
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
        <ThemeProvider>
          {/* The room, behind everything, for the life of the session. */}
          <Room />
          {/* One displacement map, shared by every liquid surface in NN. */}
          <LiquidGlassDefs />
          {/* REN is a property of NN, not a page you navigate to: one
              instance, mounted once, present on every screen. */}
          <AuthProvider>
            <RenProvider>
              <div className="nn-shell nn-page-arrive">{children}</div>
              <RenChrome />
              <NNAppNavigation />
            </RenProvider>
          </AuthProvider>
          <ServiceWorker />
        </ThemeProvider>
      </body>
    </html>
  );
}
