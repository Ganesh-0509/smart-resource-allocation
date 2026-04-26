import { useMemo } from 'react';

/**
 * A hook to manage authentication state and retrieve identity hints.
 * TODO: Replace localStorage identity hints with a backend-driven /me or /profile fetch.
 */
export const useAuth = () => {
  const token = localStorage.getItem('access_token');
  
  // These are now treated as INSECURE HINTS, not sources of truth.
  // They are only kept to keep the UI functional during the refactor.
  const identityHint = useMemo(() => {
    if (!token) return null;
    
    return {
      ngoId: localStorage.getItem('ngo_id'),
      volunteerId: localStorage.getItem('volunteer_id'),
      roleHint: localStorage.getItem('user_role') || localStorage.getItem('role'),
    };
  }, [token]);

  const logout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return {
    isAuthenticated: !!token,
    token,
    identityHint,
    logout
  };
};
