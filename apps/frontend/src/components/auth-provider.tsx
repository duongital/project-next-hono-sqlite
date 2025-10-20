'use client';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Better Auth session management is handled automatically via cookies
  // No need for a session provider wrapper
  return <>{children}</>;
}
