import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "../../components/AuthProvider";
import { ThemeProvider } from "../../components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jyutcitzi = localFont({
  src: [
    {
      path: "../../public/fonts/JyutcitziWithSourceHanSansHCNormal.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-jyutcitzi",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Evil Twitter",
  description: "A complete Twitter clone with all the features you love",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${jyutcitzi.variable} antialiased bg-black`}
      >
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
