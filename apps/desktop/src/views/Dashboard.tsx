import React, { useEffect, useState } from 'react';
import { Shield, Smartphone, HardDrive, Package, Wrench, ArrowRight, Printer } from 'lucide-react';
import { triggerPrint } from '../utils/printUtils';
import QRCode from 'qrcode';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState({
    totalProducts: 0,
    inStockSerials: 0,
    activeRepairs: 0,
    supplierPayable: 0,
  });
  const [lanInfo, setLanInfo] = useState({ ip: '127.0.0.1', port: 47615 });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [reprintId, setReprintId] = useState('');
  const [reprintKind, setReprintKind] = useState<'SALE'|'CREDIT_NOTE'>('SALE');
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    fetchSession();
    fetchStats();
    fetchLanInfo();
    fetchRecentLogs();
  }, []);

  const fetchSession = async () => {
    try {
      const sess = await window.electronAPI.invoke('get-session');
      setSession(sess);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStats = async () => {
    try {
      const db = window.electronAPI;
      const totalProds = await db.invoke('db-query', 'SELECT COUNT(*) as count FROM products');
      const inStock = await db.invoke('db-query', "SELECT COUNT(*) as count FROM product_instances WHERE status = 'IN_STOCK'");
      const activeRepairs = await db.invoke('db-query', "SELECT COUNT(*) as count FROM repair_jobs WHERE status != 'DELIVERED'");
      const totalPayable = await db.invoke('db-query', 'SELECT SUM(current_payable) as total FROM suppliers');

      setStats({
        totalProducts: totalProds[0]?.count || 0,
        inStockSerials: inStock[0]?.count || 0,
        activeRepairs: activeRepairs[0]?.count || 0,
        supplierPayable: totalPayable[0]?.total || 0,
      });
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchLanInfo = async () => {
    try {
      const info = await window.electronAPI.invoke('get-lan-info');
      setLanInfo(info);

      // Generate pairing QR code containing the base URL
      const baseUrl = `http://${info.ip}:${info.port}`;
      const qrData = await QRCode.toDataURL(baseUrl, {
        color: {
          dark: '#fbbf24', // amber-400
          light: '#09090b', // zinc-950
        },
        margin: 1,
        width: 160,
      });
      setQrCodeDataUrl(qrData);
    } catch (err) {
      console.error('Failed to get LAN info / QR code', err);
    }
  };

  const fetchRecentLogs = async () => {
    try {
      // Fetch audit logs or mock/actual log entries
      const logs = await window.electronAPI.invoke(
        'db-query',
        'SELECT a.*, u.name as user_name FROM audit_log a LEFT JOIN users u ON a.user_id = u.user_id ORDER BY id DESC LIMIT 5'
      );
      setRecentLogs(logs);
    } catch (e) {
      console.error(e);
    }
  };

  const formatPaise = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(paise / 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border border-zinc-800 bg-zinc-900/40 p-6 rounded-lg shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/5 rounded-full blur-3xl pointer-events-none"></div>
        <h1 className="text-3xl font-bold tracking-tight text-amber-400 font-mono">
          CHAUHAN ELECTRONICS ERP <span className="text-xs text-zinc-500 font-sans border border-zinc-700 px-2 py-0.5 rounded ml-2 uppercase">v1.0 Offline</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
          Distributable terminal for SP Road audio accessories, LED screens, and customer service. Synchronizing live POS transactions with Android scanner clients on the local network.
        </p>
      </div>

      {/* Stats Cards */}
      <div className={`grid grid-cols-1 ${session?.role === 'OWNER' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
        <div className="border border-zinc-800 bg-zinc-900/20 p-5 rounded-lg hover:border-amber-400/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-zinc-500 uppercase font-mono font-medium">Catalogued Models</p>
              <h3 className="text-3xl font-semibold mt-2 font-mono text-zinc-100">{stats.totalProducts}</h3>
            </div>
            <span className="p-2 bg-zinc-900 border border-zinc-800 rounded-md text-amber-400">
              <Package size={20} />
            </span>
          </div>
          <button
            onClick={() => onNavigate('Catalogue')}
            className="flex items-center text-xs text-amber-400 hover:text-amber-300 mt-4 transition-colors font-medium"
          >
            View Catalogue <ArrowRight size={14} className="ml-1" />
          </button>
        </div>

        <div className="border border-zinc-800 bg-zinc-900/20 p-5 rounded-lg hover:border-amber-400/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-zinc-500 uppercase font-mono font-medium">Physical Stock Units</p>
              <h3 className="text-3xl font-semibold mt-2 font-mono text-zinc-100">{stats.inStockSerials}</h3>
            </div>
            <span className="p-2 bg-zinc-900 border border-zinc-800 rounded-md text-amber-400">
              <HardDrive size={20} />
            </span>
          </div>
          <button
            onClick={() => onNavigate('StockIn')}
            className="flex items-center text-xs text-amber-400 hover:text-amber-300 mt-4 transition-colors font-medium"
          >
            Go to Stock In <ArrowRight size={14} className="ml-1" />
          </button>
        </div>

        <div className="border border-zinc-800 bg-zinc-900/20 p-5 rounded-lg hover:border-amber-400/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-zinc-500 uppercase font-mono font-medium">Active Repair Jobs</p>
              <h3 className="text-3xl font-semibold mt-2 font-mono text-zinc-100">{stats.activeRepairs}</h3>
            </div>
            <span className="p-2 bg-zinc-900 border border-zinc-800 rounded-md text-amber-400">
              <Wrench size={20} />
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-4 font-mono font-medium">Service desk open</p>
        </div>

        {session?.role === 'OWNER' && (
          <div className="border border-zinc-800 bg-zinc-900/20 p-5 rounded-lg hover:border-amber-400/30 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-zinc-500 uppercase font-mono font-medium">Supplier Payables</p>
                <h3 className="text-3xl font-semibold mt-2 font-mono text-emerald-400">{formatPaise(stats.supplierPayable)}</h3>
              </div>
              <span className="p-2 bg-zinc-900 border border-zinc-800 rounded-md text-emerald-400">
                <Shield size={20} />
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-4 font-mono font-medium">Purchasing ledger</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pairing Panel */}
        <div className="md:col-span-2 border border-zinc-800 bg-zinc-900/10 p-6 rounded-lg flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-1 space-y-4">
            <div className="flex items-center space-x-2 text-amber-400">
              <Smartphone size={20} />
              <h2 className="text-lg font-bold font-mono uppercase tracking-wider">Connect Mobile Scanners</h2>
            </div>
            <p className="text-sm text-zinc-400">
              Salespeople scan serial codes and log repairs directly from the shop floor.
            </p>
            <div className="space-y-2 border-t border-zinc-800/80 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Local LAN Address:</span>
                <span className="text-zinc-200 font-mono font-semibold select-all bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  http://{lanInfo.ip}:{lanInfo.port}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Express Server status:</span>
                <span className="flex items-center text-emerald-400 font-mono text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                  RUNNING ON PORT {lanInfo.port}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="Pairing QR Code" className="w-36 h-36 border border-zinc-800" />
            ) : (
              <div className="w-36 h-36 bg-zinc-950 animate-pulse rounded border border-zinc-800"></div>
            )}
            <span className="text-[10px] text-zinc-500 font-mono mt-2 uppercase">Scan to pair salesperson terminal</span>
          </div>
        </div>

        <div className="border border-zinc-800 bg-zinc-900/10 p-6 rounded-lg space-y-4">
          <h2 className="text-lg font-bold font-mono uppercase tracking-wider text-amber-400">Reprint & Export</h2>
          <div className="space-y-3">
            <select 
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-100"
              value={reprintKind}
              onChange={e => setReprintKind(e.target.value as any)}
            >
              <option value="SALE">Sale Invoice ID</option>
              <option value="CREDIT_NOTE">Credit Note ID</option>
            </select>
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Enter ID..."
                value={reprintId}
                onChange={e => setReprintId(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-100"
              />
              <button
                onClick={() => {
                  if (reprintId) triggerPrint(reprintKind, parseInt(reprintId), true);
                }}
                title="Print Document"
                className="bg-amber-400 hover:bg-amber-500 text-black px-3 py-2 rounded font-bold text-xs"
              >
                <Printer size={14} />
              </button>
              {reprintKind === 'SALE' && (
                <>
                  <button
                    onClick={async () => {
                      if (reprintId) {
                        const res = await window.electronAPI.invoke('export-einvoice-json', parseInt(reprintId));
                        if (res && res.success) alert(`Exported to: ${res.filePath}`);
                        else if (res && !res.success) alert(`Export failed: ${res.error}`);
                      }
                    }}
                    title="Export E-Invoice JSON"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded font-bold text-xs font-mono"
                  >
                    JSON
                  </button>
                  <button
                    onClick={async () => {
                      if (reprintId) {
                        if (confirm(`Are you sure you want to VOID Sale #${reprintId}? This cannot be undone.`)) {
                          try {
                            const res = await window.electronAPI.invoke('db-void-sale', parseInt(reprintId));
                            if (res.success) alert(`Sale #${reprintId} voided successfully.`);
                            else alert(`Void failed: ${res.error}`);
                          } catch (err: any) {
                            alert(`Error: ${err.message}`);
                          }
                        }
                      }
                    }}
                    title="Void Sale"
                    className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded font-bold text-xs"
                  >
                    VOID
                  </button>
                </>
              )}
            </div>
            <p className="text-[10px] text-zinc-500 uppercase">Find ID from Audit Log</p>
          </div>
        </div>

        {/* Audit Log / Recent Action */}
        <div className="border border-zinc-800 bg-zinc-900/10 p-6 rounded-lg space-y-4">
          <h2 className="text-lg font-bold font-mono uppercase tracking-wider text-amber-400">Recent Audit Log</h2>
          <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
            {recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <div key={log.id} className="text-xs border-b border-zinc-850 pb-2">
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>{log.user_name || 'System'}</span>
                    <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-zinc-300 mt-1 font-mono">
                    <span className="text-amber-400/90 font-medium">[{log.action}]</span> {log.detail}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-xs text-zinc-500 italic py-4 text-center">No recent actions logged.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
