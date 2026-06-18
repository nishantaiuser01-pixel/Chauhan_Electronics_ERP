import React, { useState, useEffect } from 'react';
import { PieChart, TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle, List, CheckCircle, Calendar, RefreshCw, BarChart2 } from 'lucide-react';

export default function InsightsDashboard() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    setLoading(true);
    setError('');
    try {
      // we need to call /api/reports/insights
      // In electron, we can use the IPC channel `db-query` ? 
      // No, we need to call `get-report-data` or fetch directly.
      // Wait, in `Reports.tsx`, it uses `window.electronAPI.invoke('get-report-data', activeTab, ...)`.
      // Let's just fetch it locally over LAN or add an IPC handler!
      // I'll add an IPC handler for 'get-insights' in `main.ts` or `api.ts`.
      // Wait, in an offline desktop app, the easiest way is to hit the local Express server directly OR via IPC.
      // Let's use `fetch('http://localhost:47615/api/reports/insights', { headers: { Authorization: 'Bearer ...' }})`
      
      const token = localStorage.getItem('desktop_token');
      const port = 47615; // default port
      const res = await fetch(`http://localhost:${port}/api/reports/insights`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch insights');
      }
      
      setData(json.insights);
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toINR = (paise: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((paise || 0) / 100);
  };

  if (loading && !data) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400">
        <RefreshCw size={24} className="animate-spin text-amber-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-red-400">
        <AlertTriangle size={48} className="mb-4" />
        <p className="font-mono text-lg">{error}</p>
        <button onClick={fetchInsights} className="mt-4 text-amber-400 underline">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  // Calculate total margin across brands
  const totalMargin = data.marginByBrand.reduce((acc: number, b: any) => acc + b.margin, 0);
  const totalRevenue = data.marginByBrand.reduce((acc: number, b: any) => acc + b.revenue, 0);
  const marginPct = totalRevenue > 0 ? ((totalMargin / totalRevenue) * 100).toFixed(1) : '0.0';

  return (
    <div className="flex flex-col h-full space-y-6 overflow-y-auto pr-2 pb-10">
      <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 backdrop-blur-xl shadow-2xl relative overflow-hidden shrink-0">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h2 className="text-2xl font-bold font-mono tracking-wide text-zinc-100 uppercase flex items-center">
            <BarChart2 className="mr-3 text-amber-400" size={28} />
            Owner Insights
          </h2>
          <p className="text-sm text-zinc-400 mt-1">High-level business intelligence & margins</p>
        </div>
        <button onClick={fetchInsights} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-amber-400">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="text-zinc-500 font-mono text-xs uppercase mb-2 flex items-center"><DollarSign size={14} className="mr-1" /> Total Realized Revenue</div>
          <div className="text-3xl font-mono text-emerald-400 font-bold">{toINR(totalRevenue)}</div>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="text-zinc-500 font-mono text-xs uppercase mb-2 flex items-center"><TrendingUp size={14} className="mr-1" /> Total Gross Margin</div>
          <div className="text-3xl font-mono text-amber-400 font-bold">{toINR(totalMargin)}</div>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="text-zinc-500 font-mono text-xs uppercase mb-2 flex items-center"><PieChart size={14} className="mr-1" /> Blended Margin %</div>
          <div className="text-3xl font-mono text-blue-400 font-bold">{marginPct}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Margin by Brand */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 flex flex-col h-80">
          <h3 className="text-zinc-400 font-mono text-xs uppercase mb-4 font-bold border-b border-zinc-800 pb-2">Margin by Brand</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {data.marginByBrand.map((b: any, i: number) => {
              const pct = totalMargin > 0 ? (b.margin / totalMargin) * 100 : 0;
              return (
                <div key={i} className="flex flex-col">
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-zinc-200">{b.brand_name || 'Generic'}</span>
                    <span className="text-amber-400">{toINR(b.margin)}</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top Dealers */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 flex flex-col h-80">
          <h3 className="text-zinc-400 font-mono text-xs uppercase mb-4 font-bold border-b border-zinc-800 pb-2">Top B2B Dealers (Revenue)</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {data.topDealers.map((d: any, i: number) => {
              return (
                <div key={i} className="flex justify-between items-center p-3 bg-zinc-950/50 rounded border border-zinc-800/50">
                  <span className="text-sm text-zinc-200 font-mono">{d.name}</span>
                  <span className="text-sm font-mono text-emerald-400 font-bold">{toINR(d.total_revenue)}</span>
                </div>
              )
            })}
            {data.topDealers.length === 0 && <div className="text-xs text-zinc-600 font-mono italic">No B2B sales recorded.</div>}
          </div>
        </div>

        {/* Best Movers */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 flex flex-col h-80">
          <h3 className="text-zinc-400 font-mono text-xs uppercase mb-4 font-bold border-b border-zinc-800 pb-2">Best Movers (Volume)</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {data.bestMovers.map((p: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-2 hover:bg-zinc-800/30 rounded">
                <div className="flex flex-col">
                  <span className="text-sm text-zinc-200">{p.brand_name} {p.model_name}</span>
                  <span className="text-[10px] text-zinc-500 font-mono uppercase">Revenue: {toINR(p.revenue)}</span>
                </div>
                <div className="flex items-center text-emerald-400 font-mono font-bold bg-emerald-400/10 px-2 py-1 rounded">
                  <Package size={14} className="mr-1" /> {p.qty_sold}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Slow Movers */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 flex flex-col h-80">
          <h3 className="text-zinc-400 font-mono text-xs uppercase mb-4 font-bold border-b border-zinc-800 pb-2">Slow Movers (&gt;30 Days, In Stock)</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {data.slowMovers.map((p: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-2 hover:bg-zinc-800/30 rounded">
                <div className="flex flex-col">
                  <span className="text-sm text-zinc-200">{p.brand_name} {p.model_name}</span>
                </div>
                <div className="flex items-center text-red-400 font-mono font-bold bg-red-400/10 px-2 py-1 rounded">
                  <TrendingDown size={14} className="mr-1" /> {p.current_stock}
                </div>
              </div>
            ))}
            {data.slowMovers.length === 0 && <div className="text-xs text-zinc-600 font-mono italic">No slow-moving inventory detected.</div>}
          </div>
        </div>

      </div>
    </div>
  );
}
