import { type Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AuthProvider } from '../components/auth-provider';
import { UserNav } from '../components/user-nav';
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
  description: 'Better Auth Authentication',
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
        <AuthProvider>
          <header className="w-full flex justify-between items-center px-6 py-4 bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-800">Your App</h1>
            </div>
            <UserNav />
          </header>
          <main className="w-full">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
