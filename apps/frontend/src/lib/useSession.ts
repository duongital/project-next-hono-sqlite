import { useState, useEffect } from 'react';
import { tokenManager } from './api-client';

export function useSession() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if token exists in localStorage
    const savedToken = tokenManager.getToken();
    setToken(savedToken);
    setIsLoading(false);

    // Listen for storage changes (token updates from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === null) {
        const newToken = tokenManager.getToken();
        setToken(newToken);
      }
    };

    // Listen for custom token change events (same-tab updates)
    const handleTokenChanged = () => {
      const newToken = tokenManager.getToken();
      setToken(newToken);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('tokenChanged', handleTokenChanged);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tokenChanged', handleTokenChanged);
    };
  }, []);

  const logout = () => {
    tokenManager.removeToken();
    setToken(null);
    // Optionally redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const isAuthenticated = !!token;

  return {
    token,
    isAuthenticated,
    isLoading,
    logout,
  };
}
