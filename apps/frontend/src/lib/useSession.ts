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
