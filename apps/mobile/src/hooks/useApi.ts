import { useAuth } from '../context/AuthContext';

interface ApiOptions extends RequestInit {
  params?: Record<string, string>;
}

export function useApi() {
  const { token, desktopUrl, logout } = useAuth();

  const call = async <T = any>(path: string, options: ApiOptions = {}): Promise<T> => {
    if (!desktopUrl) throw new Error('No server configured');

    const url = new URL(`http://${desktopUrl}${path}`);
    if (options.params) {
      Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url.toString(), {
      ...options,
      headers,
      signal: options.signal ?? AbortSignal.timeout(8000),
    });

    if (res.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }

    const data = await res.json();
    if (!res.ok) {
      const err: any = new Error(data.error || `HTTP ${res.status}`);
      err.data = data;
      throw err;
    }
    return data as T;
  };

  return { call };
}
