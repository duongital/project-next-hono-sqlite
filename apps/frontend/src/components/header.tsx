'use client';

import Link from 'next/link';
import { useSession } from '../lib/useSession';

export function Header() {
  const { isAuthenticated, logout } = useSession();

  return (
    <header className="w-full flex justify-between items-center px-6 py-4 bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold text-slate-800">Your App</h1>
      </div>
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
