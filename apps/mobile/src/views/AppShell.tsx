import { useState } from 'react';
import { Wifi, WifiOff, ScanBarcode, Users, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Scanner from './Scanner';
import Customers from './Customers';
import SettingsView from './SettingsView';

type Tab = 'scan' | 'customers' | 'settings';

function canSeeCustomers(role: string) {
  return ['OWNER', 'CASHIER', 'SALESPERSON'].includes(role);
}

export default function AppShell() {
  const { user, isConnected, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('scan');

  const role = user?.role ?? '';

  const tabs: { id: Tab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: 'scan' as Tab, label: 'Sell', icon: <ScanBarcode size={22} />, show: true },
    { id: 'customers' as Tab, label: 'Customers', icon: <Users size={22} />, show: canSeeCustomers(role) },
    { id: 'settings' as Tab, label: 'Settings', icon: <Settings size={22} />, show: true },
  ].filter(t => t.show);

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* ── Connection Banner ── */}
      <div className={`flex items-center justify-between px-4 py-2.5 text-xs font-mono font-bold transition-colors duration-500 ${
        isConnected
          ? 'bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400'
          : 'bg-red-500/15 border-b border-red-500/30 text-red-400 animate-pulse'
      }`}>
        <div className="flex items-center gap-2">
          {isConnected
            ? <Wifi size={13} />
            : <WifiOff size={13} />}
          <span>
            {isConnected ? '🟢 HUB CONNECTED' : '🔴 HUB OFFLINE — Sales blocked'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-zinc-400">{user?.name} · {role}</span>
          <button
            onClick={logout}
            title="Log out"
            className="text-zinc-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="flex-1 overflow-hidden relative">
        {/* Disconnected overlay — blocks sell actions */}
        {!isConnected && (
          <div className="absolute inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 pointer-events-none">
            <WifiOff size={40} className="text-red-400" />
            <p className="text-red-400 font-mono text-sm font-bold tracking-widest uppercase">Hub Offline</p>
            <p className="text-zinc-500 font-mono text-xs text-center px-8">
              Cannot guarantee stock or pricing.<br />Reconnect to resume selling.
            </p>
          </div>
        )}

        {activeTab === 'scan' && <Scanner connected={isConnected} />}
        {activeTab === 'customers' && canSeeCustomers(role) && <Customers />}
        {activeTab === 'settings' && <SettingsView />}
      </div>

      {/* ── Bottom Tab Bar ── */}
      <nav className="flex border-t border-zinc-800 bg-zinc-900 pb-safe">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
              activeTab === tab.id
                ? 'text-amber-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.icon}
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest">{tab.label}</span>
            {activeTab === tab.id && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-amber-400 rounded-full" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
