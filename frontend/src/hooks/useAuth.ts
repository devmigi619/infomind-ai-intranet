import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';

interface User {
  id: number;
  username: string;
  name: string;
  department: string;
  position: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authApi.getStoredUser().then((storedUser) => {
      if (storedUser) {
        setUser(storedUser);
        setIsLoggedIn(true);
      }
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const loggedInUser = await authApi.login(username, password);
    setUser(loggedInUser);
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setIsLoggedIn(false);
  }, []);

  return { user, isLoggedIn, isLoading, login, logout };
}
