import React, { useState, useEffect } from 'react';
import { PackageSearch, ArrowRight, RefreshCw, AlertTriangle, TrendingUp, Filter, CheckCircle } from 'lucide-react';

export default function SmartReorder() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [targetDays, setTargetDays] = useState(15);

  useEffect(() => {
    fetchReorderSuggestions();
  }, [targetDays]);

  const fetchReorderSuggestions = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('desktop_token');
      const port = 47615;
      const res = await fetch(`http://localhost:${port}/api/reports/smart-reorder?days=${targetDays}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch reorder suggestions');
      
      setData(json.suggestions);
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-red-400">
        <AlertTriangle size={48} className="mb-4" />
        <p className="font-mono text-lg">{error}</p>
        <button onClick={fetchReorderSuggestions} className="mt-4 text-amber-400 underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6 overflow-y-auto pr-2 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 backdrop-blur-xl shadow-2xl relative overflow-hidden shrink-0">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h2 className="text-2xl font-bold font-mono tracking-wide text-zinc-100 uppercase flex items-center">
            <PackageSearch className="mr-3 text-amber-400" size={28} />
            Smart Reorder
          </h2>
          <p className="text-sm text-zinc-400 mt-1">Velocity-based purchase suggestions to maintain target stock.</p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          <div className="flex flex-col">
            <label className="text-[10px] text-zinc-500 uppercase font-mono mb-1">Target Buffer (Days)</label>
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded">
              <select
                value={targetDays}
                onChange={e => setTargetDays(Number(e.target.value))}
                className="bg-transparent text-sm text-amber-400 font-mono px-3 py-2 outline-none"
              >
                <option value="7">7 Days</option>
                <option value="15">15 Days</option>
                <option value="30">30 Days</option>
                <option value="45">45 Days</option>
                <option value="60">60 Days</option>
              </select>
            </div>
          </div>
          <button onClick={fetchReorderSuggestions} className="mt-5 p-2 hover:bg-zinc-800 rounded-lg transition-colors text-amber-400 border border-transparent hover:border-zinc-700">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden shadow-xl flex-1 flex flex-col">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between">
          <h3 className="text-zinc-200 font-mono font-bold uppercase text-sm">Suggested Purchasing List</h3>
          <span className="text-xs font-mono bg-zinc-800 px-2 py-1 rounded text-zinc-400 border border-zinc-700">{data.length} items to order</span>
        </div>
        
        {loading && data.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw size={24} className="animate-spin text-amber-400" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-zinc-500">
            <CheckCircle size={48} className="text-emerald-400/50 mb-4" />
            <p className="font-mono text-sm">Inventory levels are healthy for {targetDays} days.</p>
            <p className="text-xs text-zinc-600 mt-2">No reorders suggested.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-zinc-950/80 sticky top-0 z-10 text-xs font-mono text-zinc-500 uppercase">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Product / SKU</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-center">Sales (Last 30d)</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-center">Daily Velocity</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-center">Current Stock</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-center bg-amber-400/5 text-amber-400/80 border-b-2 border-amber-400/30">Target Stock</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right bg-amber-400/10 text-amber-400 border-b-2 border-amber-400">Suggested Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {data.map((item, i) => (
                  <tr key={i} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-6 py-3">
                      <div className="font-medium text-zinc-200">{item.brand_name} {item.model_name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{item.sku_code}</div>
                    </td>
                    <td className="px-6 py-3 text-center text-zinc-400 font-mono">
                      {item.sold_last_30}
                    </td>
                    <td className="px-6 py-3 text-center text-zinc-400 font-mono flex items-center justify-center">
                      <TrendingUp size={12} className="mr-1 text-emerald-500/50" />
                      {item.velocity}/day
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`font-mono px-2 py-0.5 rounded ${item.current_stock <= item.min_restock_level ? 'bg-red-500/20 text-red-400' : 'text-zinc-300'}`}>
                        {item.current_stock}
                      </span>
                      {item.current_stock <= item.min_restock_level && <div className="text-[9px] text-red-500/80 uppercase mt-1">Below Min ({item.min_restock_level})</div>}
                    </td>
                    <td className="px-6 py-3 text-center text-zinc-300 font-mono bg-amber-400/5">
                      {item.target_stock}
                    </td>
                    <td className="px-6 py-3 text-right bg-amber-400/5">
                      <span className="font-mono text-lg font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded">
                        +{item.suggested_order}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
