import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Package, FolderInput, Settings as SettingsIcon, Terminal, Wifi, CloudOff, Lock, ShoppingCart, Users, Truck, Wrench, Calculator, ShieldCheck, CornerUpLeft, ClipboardList } from 'lucide-react';
import Dashboard from './views/Dashboard';
import Catalogue from './views/Catalogue';
import StockIn from './views/StockIn';
import Settings from './views/Settings';
import Sales from './views/Sales';
import Customers from './views/Customers';
import Suppliers from './views/Suppliers';
import Repairs from './views/Repairs';
import Accounting from './views/Accounting';
import Warranty from './views/Warranty';
import Returns from './views/Returns';
import RMARegister from './views/RMARegister';
import Outbox from './views/Outbox';
import PrintView from './views/PrintView';
import Reports from './views/Reports';
import * as bcrypt from 'bcryptjs';

export default function App() {
  const [activeView, setActiveView] = useState('Dashboard');
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [firstRun, setFirstRun] = useState<boolean | null>(null);
  
  // First-run wizard form state
  const [shopName, setShopName] = useState('Chauhan Electronics');
  const [address, setAddress] = useState('12, SP Road, Bengaluru, Karnataka - 560002');
  const [gstin, setGstin] = useState('29ABCDE1234F1Z5');
  const [ownerPin, setOwnerPin] = useState('');
  const [ownerName, setOwnerName] = useState('Nishant Chauhan');
  const [wizardError, setWizardError] = useState('');

  // LAN Express server status
  const [lanIp, setLanIp] = useState('127.0.0.1');
  const [serverOnline, setServerOnline] = useState(false);
  const [dbPath, setDbPath] = useState('');

  useEffect(() => {
    if (window.location.hash.startsWith('#/print/')) {
      setIsPrintMode(true);
      return; // Skip normal initialization for print mode
    }

    checkFirstRun();
    fetchSystemInfo();

    // Setup global keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setActiveView('Sales');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveView('StockIn');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveView('Catalogue');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setActiveView('Settings');
      } else if (e.key === 'F6') {
        e.preventDefault();
        setActiveView('Dashboard');
      } else if (e.key === 'F7') {
        e.preventDefault();
        setActiveView('Customers');
      } else if (e.key === 'F8') {
        e.preventDefault();
        setActiveView('Suppliers');
      } else if (e.key === 'F9') {
        e.preventDefault();
        setActiveView('Repairs');
      } else if (e.key === 'F10') {
        e.preventDefault();
        setActiveView('Accounting');
      } else if (e.key === 'F11') {
        e.preventDefault();
        setActiveView('Warranty');
      } else if (e.key === 'F12') {
        e.preventDefault();
        setActiveView('Returns');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const checkFirstRun = async () => {
    try {
      const db = window.electronAPI;
      const res = await db.invoke('db-query', "SELECT value FROM settings WHERE key = 'first_run'");
      if (res && res.length > 0 && res[0].value === '0') {
        setFirstRun(false);
      } else {
        setFirstRun(true);
      }
    } catch (e) {
      console.error('Failed to query settings, showing wizard', e);
      setFirstRun(true);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const info = await window.electronAPI.invoke('get-lan-info');
      setLanIp(info.ip);
      setServerOnline(true);

      const config = await window.electronAPI.invoke('get-db-config');
      setDbPath(config.dbPath);
    } catch (e) {
      console.error('Failed to get system info', e);
    }
  };

  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWizardError('');

    if (!/^\d{4}$/.test(ownerPin)) {
      setWizardError('Owner PIN must be exactly 4 digits (e.g. 1234).');
      return;
    }

    try {
      const db = window.electronAPI;

      // Hash PIN using bcryptjs
      const salt = bcrypt.genSaltSync(10);
      const pinHash = bcrypt.hashSync(ownerPin, salt);

      const queries = [
        { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('first_run', '0')", params: [] },
        { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('shop_name', ?)", params: [shopName] },
        { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('address', ?)", params: [address] },
        { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('gstin', ?)", params: [gstin] },
        { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('state_code', ?)", params: [gstin.substring(0, 2) || '29'] },
        // Create owner user
        { sql: "INSERT INTO users (name, pin_hash, role, active) VALUES (?, ?, 'OWNER', 1)", params: [ownerName, pinHash] },
        // Create counter customer
        { sql: "INSERT OR IGNORE INTO customers (name, phone, tier, credit_limit, current_balance) VALUES ('Counter Customer', '0000000000', 'COUNTER', 0, 0)", params: [] }
      ];

      await db.invoke('db-transaction', queries);
      setFirstRun(false);
      fetchSystemInfo();
    } catch (err: any) {
      setWizardError(`Database initialization failed: ${err.message}`);
    }
  };

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');

  // Auto-logout logic
  useEffect(() => {
    if (!currentUser) return;
    let idleTimer: any;
    const resetTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        handleLogout();
      }, 15 * 60 * 1000); // 15 minutes
    };
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    resetTimer();
    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await window.electronAPI.invoke('verify-desktop-pin', loginPin);
      if (res.success) {
        setCurrentUser(res.user);
        setLoginPin('');
      } else {
        setLoginError(res.error || 'Invalid PIN');
      }
    } catch (err: any) {
      setLoginError(err.message);
    }
  };

  const handleLogout = async () => {
    await window.electronAPI.invoke('desktop-logout');
    setCurrentUser(null);
  };

  if (isPrintMode) {
    return <PrintView />;
  }

  if (firstRun === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="text-center font-mono space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-amber-400 border-r-2 mx-auto"></div>
          <span className="text-xs uppercase tracking-widest text-zinc-500">Checking ERP Core...</span>
        </div>
      </div>
    );
  }

  if (firstRun) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 p-6 relative overflow-hidden font-sans">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-400/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-lg border border-zinc-850 bg-zinc-900/40 p-8 rounded-xl shadow-2xl relative">
          <div className="flex items-center space-x-2 text-amber-400 mb-6">
            <Terminal size={24} className="animate-pulse" />
            <h1 className="text-xl font-bold font-mono tracking-wider uppercase">Chauhan ERP Setup</h1>
          </div>

          <p className="text-xs text-zinc-400 mb-6">
            Welcome to Chauhan Electronics ERP. Since this is your first time launching the application on this machine, configure the shop defaults below.
          </p>

          {wizardError && (
            <div className="mb-4 p-3 bg-red-950/20 border border-red-500/30 text-red-400 rounded text-xs font-mono">
              {wizardError}
            </div>
          )}

          <form onSubmit={handleWizardSubmit} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-mono text-zinc-400 uppercase">Shop Name</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 uppercase">GSTIN (15 Digits)</label>
              <input
                type="text"
                required
                placeholder="29ABCDE1234F1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 uppercase">Shop Address</label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-205 focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase">Owner Name</label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase flex items-center">
                  <Lock size={12} className="mr-1 text-amber-400" />
                  <span>Set 4-Digit Owner PIN</span>
                </label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  placeholder="e.g. 1234"
                  value={ownerPin}
                  onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, ''))}
                  className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400 font-mono text-center tracking-widest text-lg"
                />
              </div>
            </div>

            <button
               type="submit"
               className="w-full bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold px-4 py-2.5 rounded transition-colors font-mono uppercase tracking-wider mt-4"
             >
               INITIALIZE DATABASE & LAUNCH
             </button>
           </form>
         </div>
       </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 p-6 relative overflow-hidden font-sans">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-400/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-sm border border-zinc-850 bg-zinc-900/40 p-8 rounded-xl shadow-2xl relative text-center">
          <div className="flex justify-center mb-6">
            <Lock size={48} className="text-amber-400 animate-pulse" />
          </div>
          <h1 className="text-xl font-bold font-mono tracking-wider uppercase mb-2">Chauhan ERP</h1>
          <p className="text-xs text-zinc-400 mb-6">System locked. Enter PIN to proceed.</p>

          {loginError && (
            <div className="mb-4 p-3 bg-red-950/20 border border-red-500/30 text-red-400 rounded text-xs font-mono">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              autoFocus
              maxLength={4}
              value={loginPin}
              onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-4 py-3 text-zinc-200 focus:outline-none focus:border-amber-400 font-mono text-center tracking-widest text-2xl"
              placeholder="••••"
            />
            <button
               type="submit"
               className="w-full bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold px-4 py-3 rounded transition-colors font-mono uppercase tracking-wider"
             >
               UNLOCK
             </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-850 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo / Brand */}
          <div className="p-6 border-b border-zinc-850 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="text-amber-400" size={20} />
              <span className="font-bold font-mono tracking-wider text-sm text-zinc-200">CHAUHAN ERP</span>
            </div>
            <button onClick={handleLogout} className="text-zinc-500 hover:text-red-400 transition-colors" title="Logout">
              <Lock size={16} />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveView('Sales')}
              className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded text-sm font-medium font-mono uppercase transition-colors ${
                activeView === 'Sales' ? 'bg-amber-400/10 border border-amber-400/20 text-amber-400' : 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-250 border border-transparent'
              }`}
            >
              <ShoppingCart size={16} />
              <span>POS Billing <kbd className="text-[9px] bg-zinc-800 text-zinc-500 px-1 py-0.2 rounded border border-zinc-750 ml-auto font-mono">F2</kbd></span>
            </button>

            <button
              onClick={() => setActiveView('StockIn')}
              className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded text-sm font-medium font-mono uppercase transition-colors ${
                activeView === 'StockIn' ? 'bg-amber-400/10 border border-amber-400/20 text-amber-400' : 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-250 border border-transparent'
              }`}
            >
              <FolderInput size={16} />
              <span>Stock In <kbd className="text-[9px] bg-zinc-800 text-zinc-500 px-1 py-0.2 rounded border border-zinc-750 ml-auto font-mono">F3</kbd></span>
            </button>

            <button
              onClick={() => setActiveView('Catalogue')}
              className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded text-sm font-medium font-mono uppercase transition-colors ${
                activeView === 'Catalogue' ? 'bg-amber-400/10 border border-amber-400/20 text-amber-400' : 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-250 border border-transparent'
              }`}
            >
              <Package size={16} />
              <span>Catalogue <kbd className="text-[9px] bg-zinc-800 text-zinc-500 px-1 py-0.2 rounded border border-zinc-750 ml-auto font-mono">F4</kbd></span>
            </button>

            <button
              onClick={() => setActiveView('Settings')}
              className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded text-sm font-medium font-mono uppercase transition-colors ${
                activeView === 'Settings' ? 'bg-amber-400/10 border border-amber-400/20 text-amber-400' : 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-250 border border-transparent'
              }`}
            >
              <SettingsIcon size={16} />
              <span>Settings <kbd className="text-[9px] bg-zinc-800 text-zinc-500 px-1 py-0.2 rounded border border-zinc-750 ml-auto font-mono">F5</kbd></span>
            </button>

            <button
              onClick={() => setActiveView('Dashboard')}
              className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded text-sm font-medium font-mono uppercase transition-colors ${
                activeView === 'Dashboard' ? 'bg-amber-400/10 border border-amber-400/20 text-amber-400' : 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-250 border border-transparent'
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard <kbd className="text-[9px] bg-zinc-800 text-zinc-500 px-1 py-0.2 rounded border border-zinc-750 ml-auto font-mono">F6</kbd></span>
            </button>
            
            <button
              onClick={() => setActiveView('Customers')}
              className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded text-sm font-medium font-mono uppercase transition-colors ${
                activeView === 'Customers' ? 'bg-amber-400/10 border border-amber-400/20 text-amber-400' : 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-250 border border-transparent'
              }`}
            >
              <Users size={16} />
              <span>Ledger <kbd className="text-[9px] bg-zinc-800 text-zinc-500 px-1 py-0.2 rounded border border-zinc-750 ml-auto font-mono">F7</kbd></span>
            </button>
            
            <button
              onClick={() => setActiveView('Suppliers')}
              className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded text-sm font-medium font-mono uppercase transition-colors ${
                activeView === 'Suppliers' ? 'bg-amber-400/10 border border-amber-400/20 text-amber-400' : 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-250 border border-transparent'
              }`}
            >
              <Truck size={16} />
              <span>Suppliers <kbd className="text-[9px] bg-zinc-800 text-zinc-500 px-1 py-0.2 rounded border border-zinc-750 ml-auto font-mono">F8</kbd></span>
            </button>
            
            <button
              onClick={() => setActiveView('Repairs')}
              className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded text-sm font-medium font-mono uppercase transition-colors ${
                activeView === 'Repairs' ? 'bg-amber-400/10 border border-amber-400/20 text-amber-400' : 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-250 border border-transparent'
              }`}
            >
              <Wrench size={16} />
              <span>Repairs <kbd className="text-[9px] bg-zinc-800 text-zinc-500 px-1 py-0.2 rounded border border-zinc-750 ml-auto font-mono">F9</kbd></span>
            </button>
            
            <button
              onClick={() => setActiveView('Accounting')}
              className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded text-sm font-medium font-mono uppercase transition-colors ${
                activeView === 'Accounting' ? 'bg-amber-400/10 border border-amber-400/20 text-amber-400' : 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-250 border border-transparent'
              }`}
            >
              <Calculator size={16} />
              <span>Accounts <kbd className="text-[9px] bg-zinc-800 text-zinc-500 px-1 py-0.2 rounded border border-zinc-750 ml-auto font-mono">F10</kbd></span>
            </button>
            {currentUser?.role === 'OWNER' && (
              <button
                onClick={() => setActiveView('Reports')}
                className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded text-sm font-medium font-mono uppercase transition-colors ${
                  activeView === 'Reports' ? 'bg-emerald-400/10 border border-emerald-400/20 text-emerald-400' : 'text-emerald-500/50 hover:bg-zinc-850 hover:text-emerald-400 border border-transparent'
                }`}
              >
                <ClipboardList size={16} />
                <span>Reports</span>
              </button>
            )}
            <button
              onClick={() => setActiveView('Warranty')}
              className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded text-sm font-medium font-mono uppercase transition-colors ${
                activeView === 'Warranty' ? 'bg-amber-400/10 border border-amber-400/20 text-amber-400' : 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-250 border border-transparent'
              }`}
            >
              <ShieldCheck size={16} />
              <span>Warranty <kbd className="text-[9px] bg-zinc-800 text-zinc-500 px-1 py-0.2 rounded border border-zinc-750 ml-auto font-mono">F11</kbd></span>
            </button>
            <button
              onClick={() => setActiveView('Returns')}
              className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded text-sm font-medium font-mono uppercase transition-colors ${
                activeView === 'Returns' ? 'bg-amber-400/10 border border-amber-400/20 text-amber-400' : 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-250 border border-transparent'
              }`}
            >
              <CornerUpLeft size={16} />
              <span>Returns <kbd className="text-[9px] bg-zinc-800 text-zinc-500 px-1 py-0.2 rounded border border-zinc-750 ml-auto font-mono">F12</kbd></span>
            </button>
            <button
              onClick={() => setActiveView('RMARegister')}
              className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded text-sm font-medium font-mono uppercase transition-colors ${
                activeView === 'RMARegister' ? 'bg-amber-400/10 border border-amber-400/20 text-amber-400' : 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-250 border border-transparent'
              }`}
            >
              <ClipboardList size={16} />
              <span>RMA Company</span>
            </button>
            <button
              onClick={() => setActiveView('Outbox')}
              className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded text-sm font-medium font-mono uppercase transition-colors ${
                activeView === 'Outbox' ? 'bg-amber-400/10 border border-amber-400/20 text-amber-400' : 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-250 border border-transparent'
              }`}
            >
              <Package size={16} />
              <span>SMS Outbox</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-zinc-850 bg-zinc-950/40 text-[10px] space-y-3 font-mono">
          <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-850/50 pb-2">
            <span>USER: <strong className="text-zinc-200">{currentUser?.name}</strong></span>
            <span className="bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-400/20">
              {currentUser?.role}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-zinc-500">LAN API SERVER</span>
            <div className="flex items-center justify-between">
              <span className="text-zinc-350">{serverOnline ? `http://${lanIp}:47615` : 'Offline'}</span>
              {serverOnline ? (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              )}
            </div>
          </div>

          <div className="space-y-1 border-t border-zinc-850/50 pt-2">
            <span className="text-zinc-500">DATABASE INTEGRITY</span>
            <div className="flex items-center space-x-1.5 text-emerald-400">
              <Wifi size={10} />
              <span>CONNECTED LOCAL SQLITE</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Content View Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeView === 'Dashboard' && <Dashboard onNavigate={setActiveView} />}
          {activeView === 'Sales' && <Sales />}
          {activeView === 'StockIn' && <StockIn />}
          {activeView === 'Catalogue' && <Catalogue />}
          {activeView === 'Settings' && <Settings />}
          {activeView === 'Customers' && <Customers />}
          {activeView === 'Suppliers' && <Suppliers />}
          {activeView === 'Repairs' && <Repairs />}
          {activeView === 'Accounting' && <Accounting />}
          {activeView === 'Warranty' && <Warranty />}
          {activeView === 'Returns' && <Returns />}
          {activeView === 'RMARegister' && <RMARegister />}
          {activeView === 'Outbox' && <Outbox />}
          {activeView === 'Reports' && currentUser?.role === 'OWNER' && <Reports />}
        </div>
      </main>
    </div>
  );
}
