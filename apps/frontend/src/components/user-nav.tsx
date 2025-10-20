'use client';

import Link from 'next/link';
import { useSession, signOut } from '../lib/auth-client';

export function UserNav() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div className="text-sm text-slate-500">Loading...</div>;
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full font-medium text-sm px-6 py-2 transition-all shadow-md hover:shadow-lg"
      >
        Sign In
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-slate-700 font-medium">{session.user.email}</span>
      <button
        onClick={() => signOut()}
        className="text-sm text-slate-600 hover:text-slate-800 font-medium transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
