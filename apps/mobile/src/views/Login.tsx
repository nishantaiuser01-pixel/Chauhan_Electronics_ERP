import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Delete, Wifi, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function Login() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const { login, isConnected, logout, desktopUrl } = useAuth();
  const navigate = useNavigate();

  const handleDigit = useCallback((d: string) => {
    if (d === '⌫') { setPin(p => p.slice(0, -1)); setError(''); return; }
    if (d === '') return;
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) submit(next);
  }, [pin]);

  const submit = useCallback(async (p: string) => {
    setLoading(true);
    setError('');
    try {
      await login(p);
      navigate('/app');
    } catch (e: any) {
      setError(e.message || 'Invalid PIN');
      setShake(true);
      setTimeout(() => { setShake(false); setPin(''); }, 600);
    } finally {
      setLoading(false);
    }
  }, [login, navigate]);

  const handleChangeServer = () => {
    logout();
    localStorage.removeItem('erp_desktop_url');
    navigate('/config');
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-6">
        <div>
          <h1 className="text-xl font-black font-mono tracking-widest text-zinc-100 uppercase">Chauhan ERP</h1>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">Enter your PIN to unlock</p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold ${
          isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
        }`}>
          <Wifi size={12} />
          {isConnected ? 'CONNECTED' : 'OFFLINE'}
        </div>
      </div>

      {/* Lock icon */}
      <div className="flex flex-col items-center pt-4 pb-8">
        <div className={`p-5 rounded-full bg-amber-400/10 mb-6 transition-all ${shake ? 'animate-bounce' : ''}`}>
          <Lock size={36} className="text-amber-400" />
        </div>

        {/* PIN dots */}
        <div className={`flex gap-4 mb-3 transition-all ${shake ? 'translate-x-2' : ''}`}>
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              pin.length > i ? 'bg-amber-400 border-amber-400 scale-110' : 'border-zinc-600 bg-transparent'
            }`} />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-1.5 text-red-400 text-xs font-mono mt-1 animate-pulse">
            <AlertCircle size={12} />
            {error}
          </div>
        )}
      </div>

      {/* Numpad */}
      <div className="flex-1 px-8">
        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
          {DIGITS.map((d, i) => (
            <button
              key={i}
              onClick={() => handleDigit(d)}
              disabled={loading || d === ''}
              className={`
                aspect-square rounded-2xl text-2xl font-bold font-mono transition-all active:scale-95
                ${d === '' ? 'invisible' : ''}
                ${d === '⌫'
                  ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-100 hover:bg-zinc-800 hover:border-amber-400/30 active:bg-zinc-700'}
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {d === '⌫' ? <Delete size={20} className="mx-auto" /> : d}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center pb-10 pt-4 gap-3">
        {loading && (
          <div className="text-amber-400 text-xs font-mono animate-pulse tracking-widest">VERIFYING...</div>
        )}
        <button
          onClick={handleChangeServer}
          className="text-zinc-600 text-xs font-mono hover:text-zinc-400 transition-colors"
        >
          Change server ({desktopUrl})
        </button>
      </div>
    </div>
  );
}
