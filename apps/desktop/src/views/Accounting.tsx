import React, { useState, useEffect } from 'react';
import { Calculator, Plus, Banknote, Calendar, PieChart, TrendingUp, TrendingDown, RefreshCcw, HandCoins, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

export default function Accounting() {
  const [activeTab, setActiveTab] = useState<'DAYBOOK' | 'PNL'>('DAYBOOK');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Day-Book State
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expCategory, setExpCategory] = useState('SHOP_EXPENSE');
  const [expAmount, setExpAmount] = useState<number | ''>('');
  const [expNote, setExpNote] = useState('');

  // PnL State
  const [eodDate, setEodDate] = useState(new Date().toISOString().split('T')[0]);
  const [reconData, setReconData] = useState<any>(null);

  useEffect(() => {
    if (activeTab === 'DAYBOOK') {
      fetchExpenses();
    } else {
      fetchRecon();
    }
  }, [activeTab, eodDate]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await window.electronAPI.invoke('get-expenses', 50);
      setExpenses(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecon = async () => {
    try {
      setLoading(true);
      const res = await window.electronAPI.invoke('get-eod-reconciliation', eodDate);
      setReconData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || Number(expAmount) <= 0) return;

    try {
      const amtPaise = Math.round(Number(expAmount) * 100);
      await window.electronAPI.invoke('record-expense', expCategory, amtPaise, expNote);
      setMessage('Expense recorded successfully.');
      setExpAmount('');
      setExpNote('');
      fetchExpenses();
    } catch (err: any) {
      setMessage(`Failed to record expense: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const formatMoney = (paise: number) => {
    return (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center">
            <Calculator className="mr-3" /> Accounting & Expenses
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Manage day-book operations and monitor financial performance.</p>
        </div>
        
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('DAYBOOK')}
            className={`text-lg font-bold font-mono uppercase tracking-wider pb-1 border-b-2 transition-all ${
              activeTab === 'DAYBOOK' ? 'border-amber-400 text-amber-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Day-Book
          </button>
          <button
            onClick={() => setActiveTab('PNL')}
            className={`text-lg font-bold font-mono uppercase tracking-wider pb-1 border-b-2 transition-all ${
              activeTab === 'PNL' ? 'border-amber-400 text-amber-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            P&L / EOD
          </button>
        </div>
      </div>

      {message && (
        <div className="bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded font-mono text-sm">
          {message}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'DAYBOOK' ? (
          <div className="flex space-x-6 h-full">
            {/* Expense Form */}
            <div className="w-1/3 bg-zinc-900 border border-zinc-850 rounded p-6 h-fit">
              <h3 className="text-md font-bold font-mono text-amber-400 uppercase mb-4 flex items-center">
                <Banknote size={16} className="mr-2" /> Record Expense
              </h3>
              
              <form onSubmit={handleRecordExpense} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-500 uppercase mb-1">Category</label>
                  <select 
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-400"
                  >
                    <option value="SHOP_EXPENSE">Shop Maintenance / Cleaning</option>
                    <option value="UTILITY_BILL">Utility Bills (Electricity/Water)</option>
                    <option value="SALARY">Staff Salary / Wages</option>
                    <option value="TEA_SNACKS">Tea & Refreshments</option>
                    <option value="TRANSPORT">Freight & Transport</option>
                    <option value="OTHER">Other / Miscellaneous</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-mono text-zinc-500 uppercase mb-1">Amount (₹)</label>
                  <input 
                    type="number" 
                    required min="1" step="0.01"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-400 font-mono"
                    placeholder="e.g. 150"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-500 uppercase mb-1">Note / Detail</label>
                  <input 
                    type="text" 
                    required
                    value={expNote}
                    onChange={(e) => setExpNote(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-400"
                    placeholder="e.g. Evening tea for staff"
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold px-4 py-2.5 rounded text-sm font-mono tracking-wider transition-colors mt-2 flex justify-center items-center"
                >
                  <Plus size={16} className="mr-2" /> LOG EXPENSE
                </button>
              </form>
            </div>

            {/* Expense History */}
            <div className="w-2/3 bg-zinc-900 border border-zinc-850 rounded p-6 flex flex-col">
              <h3 className="text-md font-bold font-mono text-zinc-300 uppercase mb-4">Recent Expenses Feed</h3>
              
              <div className="flex-1 overflow-y-auto border border-zinc-800 rounded">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-950 text-zinc-500 text-[10px] uppercase font-mono tracking-wider border-b border-zinc-800">
                      <th className="p-3 font-normal">Date & Time</th>
                      <th className="p-3 font-normal">Category</th>
                      <th className="p-3 font-normal">Details</th>
                      <th className="p-3 font-normal text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-mono divide-y divide-zinc-850/50">
                    {loading && expenses.length === 0 ? (
                      <tr><td colSpan={4} className="p-6 text-center text-zinc-600 animate-pulse">LOADING...</td></tr>
                    ) : expenses.length === 0 ? (
                      <tr><td colSpan={4} className="p-6 text-center text-zinc-600">No recent expenses found.</td></tr>
                    ) : (
                      expenses.map(e => (
                        <tr key={e.id} className="hover:bg-zinc-800/30">
                          <td className="p-3 text-zinc-400">{e.created_at}</td>
                          <td className="p-3"><span className="bg-zinc-800 px-2 py-0.5 rounded text-[10px]">{e.category}</span></td>
                          <td className="p-3 text-zinc-300">{e.note}</td>
                          <td className="p-3 text-right font-bold text-red-400">-{formatMoney(e.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full space-y-6">
            {/* PNL Controls */}
            <div className="bg-zinc-900 border border-zinc-850 rounded p-4 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Calendar className="text-amber-400" size={20} />
                <h3 className="text-md font-bold font-mono text-zinc-200 uppercase tracking-wider">End-Of-Day Reconciliation</h3>
              </div>
              <div className="flex items-center space-x-3">
                <label className="text-xs font-mono text-zinc-500 uppercase">Select Date</label>
                <input 
                  type="date" 
                  value={eodDate}
                  onChange={(e) => setEodDate(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm font-mono text-amber-400 focus:outline-none"
                />
                <button onClick={fetchRecon} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-1.5 rounded transition-colors"><RefreshCcw size={16} /></button>
              </div>
            </div>

            {loading || !reconData ? (
              <div className="flex-1 flex justify-center items-center text-zinc-600 font-mono text-sm animate-pulse">Computing financials...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                {/* Cash Drawer Reconcile */}
                <div className="bg-zinc-900 border border-zinc-850 rounded p-6 flex flex-col space-y-6">
                  <h3 className="text-sm font-bold font-mono text-zinc-400 uppercase tracking-widest flex items-center border-b border-zinc-800 pb-2">
                    <HandCoins className="mr-2" size={16} /> Cash Drawer Movement
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-mono text-emerald-500 uppercase mb-2 flex items-center"><ArrowDownToLine size={12} className="mr-1"/> Cash Inflow</div>
                      <div className="bg-zinc-950 border border-zinc-800 rounded p-3 space-y-2">
                        <div className="flex justify-between text-xs font-mono text-zinc-400">
                          <span>Counter Sales (Cash/UPI)</span>
                          <span className="text-zinc-200">{formatMoney(reconData.totalRevenue)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono text-zinc-400">
                          <span>Udhaar Recovered</span>
                          <span className="text-zinc-200">{formatMoney(reconData.udhaarReceived)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-mono font-bold text-emerald-400 pt-2 border-t border-zinc-800">
                          <span>Total In</span>
                          <span>{formatMoney(reconData.totalInflow)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-mono text-red-500 uppercase mb-2 flex items-center"><ArrowUpFromLine size={12} className="mr-1"/> Cash Outflow</div>
                      <div className="bg-zinc-950 border border-zinc-800 rounded p-3 space-y-2">
                        <div className="flex justify-between text-xs font-mono text-zinc-400">
                          <span>Operational Expenses</span>
                          <span className="text-zinc-200">{formatMoney(reconData.opsExpenses)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono text-zinc-400">
                          <span>Supplier / Vendor Payments</span>
                          <span className="text-zinc-200">{formatMoney(reconData.supplierPayments)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-mono font-bold text-red-400 pt-2 border-t border-zinc-800">
                          <span>Total Out</span>
                          <span>{formatMoney(reconData.totalOutflow)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto bg-zinc-950 border border-zinc-800 rounded p-4 flex justify-between items-center">
                    <span className="text-xs font-mono text-zinc-500 uppercase">Net Drawer Change</span>
                    <span className={`text-xl font-mono font-bold ${reconData.totalInflow - reconData.totalOutflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatMoney(reconData.totalInflow - reconData.totalOutflow)}
                    </span>
                  </div>
                </div>

                {/* Profit & Loss Estimate */}
                <div className="bg-zinc-900 border border-zinc-850 rounded p-6 flex flex-col space-y-6">
                  <h3 className="text-sm font-bold font-mono text-amber-400 uppercase tracking-widest flex items-center border-b border-zinc-800 pb-2">
                    <PieChart className="mr-2" size={16} /> Daily P&L Margin
                  </h3>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-zinc-950 border border-zinc-800 rounded p-4">
                      <span className="text-xs font-mono text-zinc-400 uppercase">Gross Sales Revenue</span>
                      <span className="text-md font-mono font-bold text-zinc-100">{formatMoney(reconData.totalRevenue)}</span>
                    </div>

                    <div className="flex justify-between items-center bg-zinc-950 border border-zinc-800 rounded p-4">
                      <span className="text-xs font-mono text-zinc-400 uppercase">Cost of Goods Sold (COGS)</span>
                      <span className="text-md font-mono font-bold text-red-400">-{formatMoney(reconData.serializedCOGS)}</span>
                    </div>
                    <p className="text-[9px] text-zinc-600 font-mono -mt-2 ml-1">* COGS calculated from serialised instance purchase costs only.</p>

                    <div className="flex justify-between items-center bg-zinc-950 border border-zinc-800 rounded p-4">
                      <span className="text-xs font-mono text-zinc-400 uppercase">Operating Expenses</span>
                      <span className="text-md font-mono font-bold text-red-400">-{formatMoney(reconData.opsExpenses)}</span>
                    </div>
                  </div>

                  <div className={`mt-auto border-2 rounded p-5 flex flex-col items-center justify-center ${reconData.netMargin >= 0 ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-red-950/20 border-red-500/30'}`}>
                    <span className="text-xs font-mono text-zinc-500 uppercase mb-1">Estimated Net Operating Profit</span>
                    <div className={`text-3xl font-mono font-bold flex items-center ${reconData.netMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {reconData.netMargin >= 0 ? <TrendingUp className="mr-3" size={28}/> : <TrendingDown className="mr-3" size={28}/>}
                      {formatMoney(reconData.netMargin)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
