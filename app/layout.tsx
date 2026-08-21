import type { Metadata } from "next";
import { Suspense } from "react";
import { Schibsted_Grotesk, Martian_Mono } from "next/font/google";
import LightRays from "./components/LightRays";
import "./globals.css";
import NavBar from "./components/NavBar";
import { AuthProvider } from "./providers/AuthProvider";

const schibstedGrotesk = Schibsted_Grotesk({
  variable: "--font-schibsted-grotesk",
  subsets: ["latin"],
});

const martianMono = Martian_Mono({
  variable: "--font-martian-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UA Padel Denmark",
  description:
    "Browse, book and create padel events — UA Padel Denmark community hub.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${schibstedGrotesk.variable} ${martianMono.variable} min-h-screen antialiased`}>
        <div className="pointer-events-none fixed inset-0 z-[-1] h-dvh w-screen">
          <LightRays
            raysOrigin="top-center-offset"
            raysColor="#ffffff"
            raysSpeed={0.2}
            lightSpread={0.5}
            rayLength={3}
            followMouse={true}
            mouseInfluence={0.1}
            noiseAmount={0}
            distortion={0}
            className="h-full w-full"
            pulsating={false}
            fadeDistance={0}
            saturation={1}
          />
        </div>
        <AuthProvider>
          <Suspense
            fallback={
              <header>
                <nav>
                  <div className="logo">
                    <div className="h-10 w-10 rounded-sm bg-white/10 sm:h-12" />
                    <p>PadelHub</p>
                  </div>
                  <div
                    className="auth-nav auth-nav__skeleton"
                    aria-hidden="true"
                  />
                </nav>
              </header>
            }>
            <NavBar />
          </Suspense>
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
