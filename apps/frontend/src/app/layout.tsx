import { type Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Header } from '../components/header';
import './global.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Your App',
  description: 'Next.js + Hono Application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gradient-to-br from-slate-50 to-slate-100`}
      >
        <Header />
        <main className="w-full">{children}</main>
      </body>
    </html>
  );
}
