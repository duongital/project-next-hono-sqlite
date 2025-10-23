'use client';

import Link from 'next/link';
import { useSession } from '../lib/useSession';

export function Header() {
  const { isAuthenticated, logout } = useSession();

  return (
    <header className="w-full flex justify-between items-center px-6 py-4 bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200">
      <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="flex-shrink-0"
        >
          <circle cx="16" cy="16" r="14" fill="#3b82f6" opacity="0.2" />
          <path
            d="M16 4L20.472 12.528L30 14.472L23 21.056L24.944 30L16 25.528L7.056 30L9 21.056L2 14.472L11.528 12.528L16 4Z"
            fill="#3b82f6"
          />
          <circle cx="16" cy="16" r="4" fill="#1e40af" />
        </svg>
        <h1 className="text-xl font-semibold text-slate-800">Your App</h1>
      </Link>
      <nav className="flex items-center gap-4">
        {isAuthenticated ? (
          <>
            <Link
              href="/"
              className="text-slate-600 hover:text-slate-800 transition-colors"
            >
              Todos
            </Link>
            <Link
              href="/gallery"
              className="text-slate-600 hover:text-slate-800 transition-colors"
            >
              Gallery
            </Link>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Sign In
          </Link>
        )}
      </nav>
    </header>
  );
}
