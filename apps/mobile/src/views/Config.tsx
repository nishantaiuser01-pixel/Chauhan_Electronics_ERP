import { useState } from 'react';
import { Wifi, Search, CheckCircle, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Config() {
  const [ipAddress, setIpAddress] = useState('192.168.');
  const [port, setPort] = useState('47615');
  const [status, setStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const { setDesktopUrl } = useAuth();
  const navigate = useNavigate();

  const handleTest = async () => {
    setStatus('TESTING');
    setErrorMsg('');
    const fullUrl = `http://${ipAddress}:${port}/api/ping`;
    
    try {
      // 3 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(fullUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ok') {
          setStatus('SUCCESS');
          const url = `${ipAddress}:${port}`;
          setDesktopUrl(url);
          setTimeout(() => { navigate('/login'); }, 1200);
        } else {
          throw new Error('Invalid response from server');
        }
      } else {
        throw new Error('Server unreachable');
      }
    } catch (err: any) {
      setStatus('ERROR');
      if (err.name === 'AbortError') {
        setErrorMsg('Connection timed out. Check IP and Wi-Fi.');
      } else {
        setErrorMsg(err.message || 'Failed to connect');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 px-6 py-12">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="bg-amber-400 p-4 rounded-full shadow-[0_0_30px_rgba(251,191,36,0.2)] mb-6">
          <Wifi size={40} className="text-zinc-950" />
        </div>
        
        <h1 className="text-2xl font-black font-mono tracking-widest text-zinc-100 uppercase text-center mb-2">
          Connect ERP
        </h1>
        <p className="text-sm text-zinc-500 font-sans text-center max-w-xs mb-10 leading-relaxed">
          Ensure your phone is on the same Wi-Fi network as the Main Desk Computer.
        </p>

        <div className="w-full space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-1 flex items-center">
            <span className="text-zinc-500 font-mono text-xs px-3">http://</span>
            <input 
              type="text" 
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              className="flex-1 bg-transparent border-none text-zinc-100 font-mono focus:outline-none py-3"
              placeholder="192.168.1.5"
            />
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-1 flex items-center">
            <span className="text-zinc-500 font-mono text-xs px-3">Port:</span>
            <input 
              type="text" 
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="flex-1 bg-transparent border-none text-zinc-100 font-mono focus:outline-none py-3"
              placeholder="3005"
            />
          </div>

          <button 
            onClick={handleTest}
            disabled={status === 'TESTING' || status === 'SUCCESS'}
            className={`w-full py-4 rounded-lg font-bold font-mono uppercase tracking-widest transition-all flex justify-center items-center ${
              status === 'SUCCESS' ? 'bg-emerald-500 text-zinc-950' : 
              status === 'TESTING' ? 'bg-zinc-800 text-amber-400 animate-pulse' : 
              'bg-amber-400 text-zinc-950 hover:bg-amber-500'
            }`}
          >
            {status === 'TESTING' ? (
              <>PINGING...</>
            ) : status === 'SUCCESS' ? (
              <><CheckCircle className="mr-2" size={20} /> LINKED</>
            ) : (
              <><Search className="mr-2" size={20} /> TEST CONNECTION</>
            )}
          </button>

          {status === 'ERROR' && (
            <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-4 flex items-start space-x-3 mt-4">
              <ShieldAlert className="text-red-400 shrink-0" size={18} />
              <p className="text-xs text-red-400 font-mono leading-tight">{errorMsg}</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="text-center text-[10px] text-zinc-600 font-mono uppercase tracking-widest mt-auto pt-6">
        Chauhan ERP • Mobile Node
      </div>
    </div>
  );
}
