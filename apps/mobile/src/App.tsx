import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Config from './views/Config';
import Scanner from './views/Scanner';

function App() {
  const [hasConfig, setHasConfig] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkConfig = () => {
      const ip = localStorage.getItem('desktop_ip');
      if (ip) {
        setHasConfig(true);
      }
      setLoading(false);
    };
    checkConfig();
  }, []);

  if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-amber-400 font-mono animate-pulse">BOOTING...</div>;

  return (
    <HashRouter>
      <div className="h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
        <Routes>
          <Route path="/" element={hasConfig ? <Navigate to="/scanner" /> : <Navigate to="/config" />} />
          <Route path="/config" element={<Config onConfigSuccess={() => setHasConfig(true)} />} />
          <Route path="/scanner" element={hasConfig ? <Scanner /> : <Navigate to="/config" />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
