import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Wifi, Server, User } from 'lucide-react';

export default function SettingsView() {
  const { user, desktopUrl, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangeServer = () => {
    logout();
    localStorage.removeItem('erp_desktop_url');
    navigate('/config');
  };

  return (
    <div className="flex flex-col h-full px-4 pt-6 gap-4">
      <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-zinc-400 mb-2">Settings</h2>

      {/* Session info */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 divide-y divide-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <User size={16} className="text-zinc-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-zinc-100">{user?.name}</p>
            <p className="text-xs text-zinc-500 font-mono">{user?.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <Server size={16} className="text-zinc-400 shrink-0" />
          <div>
            <p className="text-xs text-zinc-400 font-mono">Hub address</p>
            <p className="text-sm text-zinc-100 font-mono">{desktopUrl}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 divide-y divide-zinc-800">
        <button
          onClick={handleChangeServer}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800 transition-colors"
        >
          <Wifi size={16} className="text-amber-400 shrink-0" />
          <span className="text-sm text-zinc-100">Change Server / IP</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-950/30 transition-colors"
        >
          <LogOut size={16} className="text-red-400 shrink-0" />
          <span className="text-sm text-red-400">Log Out</span>
        </button>
      </div>

      <p className="text-center text-[10px] text-zinc-600 font-mono uppercase tracking-widest mt-auto pb-4">
        Chauhan ERP · Mobile Node
      </p>
    </div>
  );
}
