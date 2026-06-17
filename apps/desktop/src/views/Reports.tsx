import React, { useState, useEffect } from 'react';
import { FileText, Download, BarChart2, TrendingDown, DollarSign, Package, AlertTriangle, List, CheckCircle, PieChart, Calendar, RefreshCw } from 'lucide-react';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('Margin');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const tabs = ['Margin', 'Sales', 'LowStock', 'DeadStock', 'Valuation', 'GSTR1', 'Udhaar'];

  useEffect(() => {
    fetchReportData();
  }, [activeTab, startDate, endDate]);

  const fetchReportData = async () => {
    setLoading(true);
    setReportData(null);
    try {
      const data = await window.electronAPI.invoke('get-report-data', activeTab, { startDate, endDate });
      if (activeTab === 'Udhaar') {
        setReportData({ customers: data.customers, total: data.total_receivable, buckets: data.buckets });
      } else {
        setReportData(data);
      }
    } catch (e: any) {
      console.error(e);
      alert('Failed to fetch report: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const toINR = (paise: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((paise || 0) / 100);
  };

  const exportCSV = async () => {
    if (!reportData) return;
    let csv = '';
    
    if (Array.isArray(reportData)) {
      if (reportData.length === 0) return alert('No data to export');
      const keys = Object.keys(reportData[0]);
      csv += keys.join(',') + '\n';
      reportData.forEach(r => {
        csv += keys.map(k => '"' + (r[k] !== null ? r[k] : '') + '"').join(',') + '\n';
      });
    } else {
      if (activeTab === 'GSTR1') {
        csv += 'Invoice No,Date,Customer,GSTIN,Taxable,CGST,SGST,IGST,Total,GST Rates\n';
        reportData.invoices.forEach((i: any) => {
          csv += `"${i.invoice_no}","${i.created_at}","${i.customer_name || 'Counter'}","${i.gstin || ''}",${(i.taxable/100).toFixed(2)},${(i.cgst/100).toFixed(2)},${(i.sgst/100).toFixed(2)},${(i.igst/100).toFixed(2)},${(i.grand_total/100).toFixed(2)},"${i.gst_rates}"\n`;
        });
        csv += `\nTOTALS,,,,${(reportData.summary.total_taxable/100).toFixed(2)},${(reportData.summary.total_cgst/100).toFixed(2)},${(reportData.summary.total_sgst/100).toFixed(2)},${(reportData.summary.total_igst/100).toFixed(2)}\n`;
      } else if (activeTab === 'Udhaar') {
        csv += 'Customer Name,Phone,Current Balance,Credit Limit,Due Date\n';
        reportData.customers.forEach((c: any) => {
          csv += `"${c.name}","${c.phone}",${(c.current_balance/100).toFixed(2)},${(c.credit_limit/100).toFixed(2)},"${c.credit_due_date || ''}"\n`;
        });
      } else if (activeTab === 'Valuation') {
        csv += `Serialized Value,Loose Value,Total Value\n${(reportData.serialized_value/100).toFixed(2)},${(reportData.loose_value/100).toFixed(2)},${(reportData.total/100).toFixed(2)}\n`;
      }
    }
    
    try {
      await window.electronAPI.invoke('export-raw-csv', `report_${activeTab.toLowerCase()}`, csv);
      alert('Exported successfully!');
    } catch (e: any) { alert('Export failed: ' + e.message); }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h2 className="text-2xl font-bold font-mono tracking-wide text-zinc-100 uppercase flex items-center">
            <PieChart className="mr-3 text-emerald-400" size={28} />
            Analytics & Reports
          </h2>
          <p className="text-sm text-zinc-400 mt-1">Deep-dive financial and operational metrics</p>
        </div>
        
        <div className="flex items-center space-x-4 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
          <div className="flex items-center space-x-2 px-2">
            <Calendar size={14} className="text-zinc-500" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-sm text-zinc-300 focus:outline-none focus:text-emerald-400" />
          </div>
          <div className="text-zinc-700">to</div>
          <div className="flex items-center space-x-2 px-2">
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-sm text-zinc-300 focus:outline-none focus:text-emerald-400" />
          </div>
          <button onClick={fetchReportData} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-emerald-400">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-2 custom-scrollbar">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-6 py-3 rounded-xl text-sm font-mono uppercase tracking-wider transition-all duration-300 whitespace-nowrap ${
              activeTab === t 
                ? 'bg-emerald-400 text-zinc-950 shadow-[0_0_20px_rgba(52,211,153,0.3)] font-bold scale-105' 
                : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800/50'
            }`}
          >
            {t.replace(/([A-Z])/g, ' $1').trim()}
          </button>
        ))}
        
        <div className="flex-1"></div>
        <button onClick={exportCSV} className="px-5 py-3 flex items-center space-x-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 rounded-xl transition-all uppercase text-sm font-mono font-bold tracking-wider">
          <Download size={16} />
          <span>Export CSV</span>
        </button>
        <button onClick={() => window.print()} className="px-5 py-3 flex items-center space-x-2 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 rounded-xl transition-all uppercase text-sm font-mono font-bold tracking-wider">
          <FileText size={16} />
          <span>Print PDF</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-zinc-900/30 border border-zinc-850 rounded-2xl p-6 custom-scrollbar relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <RefreshCw size={32} className="animate-spin mb-4 text-emerald-400" />
            <span className="font-mono text-sm tracking-widest uppercase">Crunching Numbers...</span>
          </div>
        ) : (
          <div className="h-full">
            {activeTab === 'Margin' && Array.isArray(reportData) && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col justify-center">
                    <span className="text-zinc-500 text-xs font-mono uppercase">Total Revenue</span>
                    <span className="text-2xl text-zinc-100 font-bold">{toINR(reportData.reduce((s, r) => s + r.revenue, 0))}</span>
                  </div>
                  <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col justify-center">
                    <span className="text-zinc-500 text-xs font-mono uppercase">Total COGS</span>
                    <span className="text-2xl text-red-400 font-bold">{toINR(reportData.reduce((s, r) => s + r.cogs, 0))}</span>
                  </div>
                  <div className="bg-zinc-900 p-4 rounded-xl border border-emerald-500/20 flex flex-col justify-center">
                    <span className="text-emerald-500/70 text-xs font-mono uppercase">Net Margin</span>
                    <span className="text-3xl text-emerald-400 font-bold">{toINR(reportData.reduce((s, r) => s + r.profit, 0))}</span>
                  </div>
                </div>
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-zinc-500 font-mono uppercase bg-zinc-900/50">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Date</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Brand</th>
                      <th className="px-4 py-3">Tier</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                      <th className="px-4 py-3 text-right">COGS</th>
                      <th className="px-4 py-3 text-right rounded-tr-lg">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((r, i) => (
                      <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                        <td className="px-4 py-3 font-mono text-zinc-300">{r.date}</td>
                        <td className="px-4 py-3 text-zinc-300">{r.category}</td>
                        <td className="px-4 py-3 text-zinc-300">{r.brand_name}</td>
                        <td className="px-4 py-3 text-zinc-400 text-xs">{r.tier_applied}</td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-200">{toINR(r.revenue)}</td>
                        <td className="px-4 py-3 text-right font-mono text-red-400/70">{toINR(r.cogs)}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">{toINR(r.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 text-xs text-zinc-500 font-mono italic">
                  * Accessory margins accurate from June 2026 onwards (post unit-cost backfill fix).
                </div>
              </div>
            )}

            {activeTab === 'Sales' && Array.isArray(reportData) && (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-500 font-mono uppercase bg-zinc-900/50">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Date</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Brand</th>
                    <th className="px-4 py-3">Tier</th>
                    <th className="px-4 py-3 text-right">Invoices</th>
                    <th className="px-4 py-3 text-right">Items Sold</th>
                    <th className="px-4 py-3 text-right rounded-tr-lg">Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((r, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                      <td className="px-4 py-3 font-mono text-zinc-300">{r.date}</td>
                      <td className="px-4 py-3 text-zinc-300">{r.category}</td>
                      <td className="px-4 py-3 text-zinc-300">{r.brand_name}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{r.tier_applied}</td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-400">{r.invoices_count}</td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-300">{r.items_sold}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">{toINR(r.total_revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'LowStock' && Array.isArray(reportData) && (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-500 font-mono uppercase bg-zinc-900/50">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Supplier</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3 text-right">Min Restock</th>
                    <th className="px-4 py-3 text-right rounded-tr-lg">Current Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((r, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                      <td className="px-4 py-3 text-indigo-400 font-medium">{r.supplier_name || 'No Supplier'}</td>
                      <td className="px-4 py-3 font-mono text-zinc-300">{r.sku_code}</td>
                      <td className="px-4 py-3 text-zinc-200">{r.model_name}</td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-400">{r.min_restock_level}</td>
                      <td className="px-4 py-3 text-right font-mono text-red-400 font-bold flex items-center justify-end">
                        <AlertTriangle size={14} className="mr-2" />
                        {r.in_stock_qty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'DeadStock' && Array.isArray(reportData) && (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-500 font-mono uppercase bg-zinc-900/50">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">SKU</th>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3 text-right">In Stock Qty</th>
                    <th className="px-4 py-3 text-right rounded-tr-lg">Last Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((r, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                      <td className="px-4 py-3 font-mono text-zinc-300">{r.sku_code}</td>
                      <td className="px-4 py-3 text-zinc-200">{r.model_name}</td>
                      <td className="px-4 py-3 text-right font-mono text-amber-400 font-bold">{r.in_stock_qty}</td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-400">{r.last_sale_date ? new Date(r.last_sale_date).toLocaleDateString() : 'Never'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'Valuation' && reportData && !Array.isArray(reportData) && (
              <div className="flex flex-col items-center justify-center h-full space-y-8 mt-12">
                <div className="w-32 h-32 relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl animate-pulse"></div>
                  <Package size={64} className="text-indigo-400 relative z-10" />
                </div>
                <div className="grid grid-cols-2 gap-8 w-full max-w-2xl">
                  <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 text-center">
                    <span className="text-zinc-500 font-mono uppercase text-xs block mb-2">Serialized Value</span>
                    <span className="text-3xl text-zinc-100 font-bold font-mono">{toINR(reportData.serialized_value)}</span>
                  </div>
                  <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 text-center">
                    <span className="text-zinc-500 font-mono uppercase text-xs block mb-2">Loose Item Value</span>
                    <span className="text-3xl text-zinc-100 font-bold font-mono">{toINR(reportData.loose_value)}</span>
                  </div>
                </div>
                <div className="bg-indigo-500/10 border border-indigo-500/30 p-6 rounded-2xl w-full max-w-2xl text-center">
                  <span className="text-indigo-400/80 font-mono uppercase text-xs block mb-2 tracking-widest">Total Inventory Asset Valuation</span>
                  <span className="text-5xl text-indigo-400 font-bold font-mono drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">{toINR(reportData.total)}</span>
                </div>
              </div>
            )}

            {activeTab === 'GSTR1' && reportData && !Array.isArray(reportData) && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 text-center">
                    <span className="text-zinc-500 text-[10px] font-mono uppercase">Taxable Value</span>
                    <span className="text-xl text-zinc-100 font-bold font-mono block mt-1">{toINR(reportData.summary.total_taxable)}</span>
                  </div>
                  <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 text-center">
                    <span className="text-zinc-500 text-[10px] font-mono uppercase">Total CGST</span>
                    <span className="text-xl text-amber-400 font-bold font-mono block mt-1">{toINR(reportData.summary.total_cgst)}</span>
                  </div>
                  <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 text-center">
                    <span className="text-zinc-500 text-[10px] font-mono uppercase">Total SGST</span>
                    <span className="text-xl text-amber-400 font-bold font-mono block mt-1">{toINR(reportData.summary.total_sgst)}</span>
                  </div>
                  <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 text-center">
                    <span className="text-zinc-500 text-[10px] font-mono uppercase">Total IGST</span>
                    <span className="text-xl text-indigo-400 font-bold font-mono block mt-1">{toINR(reportData.summary.total_igst)}</span>
                  </div>
                </div>
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-zinc-500 font-mono uppercase bg-zinc-900/50">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Inv #</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Customer / GSTIN</th>
                      <th className="px-4 py-3 text-right">Taxable</th>
                      <th className="px-4 py-3 text-right">CGST</th>
                      <th className="px-4 py-3 text-right">SGST</th>
                      <th className="px-4 py-3 text-right">IGST</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right rounded-tr-lg">Rates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.invoices.map((r: any, i: number) => {
                      const taxable = r.subtotal - r.discount;
                      return (
                        <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                          <td className="px-4 py-3 font-mono text-zinc-300">{r.invoice_no}</td>
                          <td className="px-4 py-3 font-mono text-zinc-400 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <span className="block text-zinc-200">{r.customer_name || 'Counter'}</span>
                            {r.gstin && <span className="block text-[10px] font-mono text-indigo-400">{r.gstin} (B2B)</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-300">{toINR(taxable)}</td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-400">{toINR(r.cgst)}</td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-400">{toINR(r.sgst)}</td>
                          <td className="px-4 py-3 text-right font-mono text-indigo-400/80">{toINR(r.igst)}</td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">{toINR(r.grand_total)}</td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-500 text-xs">{r.gst_rates}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'Udhaar' && reportData && !Array.isArray(reportData) && (
              <div className="space-y-6">
                <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl w-full text-center">
                  <span className="text-red-400/80 font-mono uppercase text-xs block mb-2 tracking-widest">Total Outstanding Receivables</span>
                  <span className="text-4xl text-red-400 font-bold font-mono drop-shadow-[0_0_15px_rgba(248,113,113,0.5)]">{toINR(reportData.total)}</span>
                </div>
                {reportData.buckets && (
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 text-center">
                      <span className="text-zinc-500 text-[10px] font-mono uppercase">0-30 Days</span>
                      <span className="text-xl text-zinc-300 font-bold font-mono block mt-1">{toINR(reportData.buckets['0-30'])}</span>
                    </div>
                    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 text-center">
                      <span className="text-zinc-500 text-[10px] font-mono uppercase">31-60 Days</span>
                      <span className="text-xl text-amber-400/80 font-bold font-mono block mt-1">{toINR(reportData.buckets['31-60'])}</span>
                    </div>
                    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 text-center">
                      <span className="text-zinc-500 text-[10px] font-mono uppercase">61-90 Days</span>
                      <span className="text-xl text-amber-400 font-bold font-mono block mt-1">{toINR(reportData.buckets['61-90'])}</span>
                    </div>
                    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 text-center">
                      <span className="text-zinc-500 text-[10px] font-mono uppercase">90+ Days</span>
                      <span className="text-xl text-red-400 font-bold font-mono block mt-1">{toINR(reportData.buckets['90+'])}</span>
                    </div>
                  </div>
                )}
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-zinc-500 font-mono uppercase bg-zinc-900/50">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Customer</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3 text-right">Credit Limit</th>
                      <th className="px-4 py-3 text-right">Outstanding Balance</th>
                      <th className="px-4 py-3 text-right rounded-tr-lg">Due Date / Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.customers.map((c: any, i: number) => {
                      let status = "ACTIVE";
                      let color = "text-emerald-400";
                      if (c.credit_due_date && new Date(c.credit_due_date) < new Date()) {
                        status = "OVERDUE";
                        color = "text-red-400";
                      }
                      return (
                        <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                          <td className="px-4 py-3 text-zinc-200 font-medium">{c.name}</td>
                          <td className="px-4 py-3 font-mono text-zinc-400">{c.phone}</td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-500">{toINR(c.credit_limit)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-zinc-100">{toINR(c.current_balance)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="block font-mono text-zinc-300">{c.credit_due_date ? new Date(c.credit_due_date).toLocaleDateString() : 'N/A'}</span>
                            <span className={`block text-[10px] font-mono ${color}`}>{status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
}
