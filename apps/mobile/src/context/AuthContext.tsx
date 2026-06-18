import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

interface User {
  user_id: number;
  name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isConnected: boolean;
  desktopUrl: string | null;
  login: (pin: string) => Promise<void>;
  logout: () => void;
  setDesktopUrl: (url: string) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('erp_token'));
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('erp_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [desktopUrl, setDesktopUrlState] = useState<string | null>(() => localStorage.getItem('erp_desktop_url'));
  const [isConnected, setIsConnected] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setDesktopUrl = useCallback((url: string) => {
    localStorage.setItem('erp_desktop_url', url);
    setDesktopUrlState(url);
  }, []);

  // Health polling — every 8 seconds
  const poll = useCallback(async () => {
    if (!desktopUrl) { setIsConnected(false); return; }
    try {
      const res = await fetch(`http://${desktopUrl}/api/health`, { signal: AbortSignal.timeout(3000) });
      setIsConnected(res.ok);
    } catch {
      setIsConnected(false);
    }
  }, [desktopUrl]);

  useEffect(() => {
    poll();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(poll, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [poll]);

  const login = useCallback(async (pin: string) => {
    if (!desktopUrl) throw new Error('No server configured');
    const res = await fetch(`http://${desktopUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Invalid PIN');
    localStorage.setItem('erp_token', data.token);
    localStorage.setItem('erp_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    setIsConnected(true);
  }, [desktopUrl]);

  const logout = useCallback(() => {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, isConnected, desktopUrl, login, logout, setDesktopUrl }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
