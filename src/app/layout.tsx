import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Uber Eats Fee Calculator', // Update title
  description: 'Calculate Uber Eats prices with and without the configured fee percentage.', // Update description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/*
        Adding suppressHydrationWarning to the body tag can help mitigate hydration errors
        caused by browser extensions (like Grammarly) that inject scripts or modify attributes.
        While the root <html> tag already has it, extensions sometimes specifically target the <body>.
      */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        {children}
        <Toaster /> {/* Add Toaster here */}
      </body>
    </html>
  );
}
