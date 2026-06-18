import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Config from './views/Config';
import Login from './views/Login';
import AppShell from './views/AppShell';

// Inner router — reads auth state from context
function AppRoutes() {
  const { token, desktopUrl } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Brief tick to let localStorage hydration settle
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center text-amber-400 font-mono text-xs tracking-widest animate-pulse">
        BOOTING...
      </div>
    );
  }

  return (
    <Routes>
      {/* Step 1: configure server IP */}
      <Route path="/config" element={<Config />} />

      {/* Step 2: PIN login (needs server configured) */}
      <Route
        path="/login"
        element={desktopUrl ? <Login /> : <Navigate to="/config" replace />}
      />

      {/* Step 3: app shell (needs token) */}
      <Route
        path="/app/*"
        element={token ? <AppShell /> : <Navigate to={desktopUrl ? '/login' : '/config'} replace />}
      />

      {/* Default: route based on state */}
      <Route
        path="*"
        element={
          !desktopUrl
            ? <Navigate to="/config" replace />
            : !token
            ? <Navigate to="/login" replace />
            : <Navigate to="/app" replace />
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <div className="h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
          <AppRoutes />
        </div>
      </HashRouter>
    </AuthProvider>
  );
}
