import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const token = localStorage.getItem('access_token');
  const location = useLocation();

  if (!token) {
    // Redirect to login but save the current location they were trying to go to
    return <Navigate to="/ngo/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
