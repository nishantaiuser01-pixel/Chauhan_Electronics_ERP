import React, { useState, useEffect } from 'react';
import { Truck, Search, IndianRupee, Plus, FileText, PackagePlus } from 'lucide-react';
import type { Supplier } from '@chauhan-erp/core';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'LEDGER'>('DETAILS');

  // New Supplier Modal
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newGstin, setNewGstin] = useState('');

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await window.electronAPI.invoke('get-suppliers');
      setSuppliers(res || []);
    } catch (e) {
      console.error('Failed to fetch suppliers', e);
    } finally {
      setLoading(false);
    }
  };

  const selectSupplier = async (sup: Supplier) => {
    setSelectedSupplier(sup);
    setActiveTab('DETAILS');
    try {
      const led = await window.electronAPI.invoke('get-supplier-ledger', sup.supplier_id);
      setLedger(led || []);
    } catch (e) {
      console.error('Failed to fetch ledger', e);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    (s.phone && s.phone.includes(search))
  );

  const formatMoney = (paise: number) => {
    return (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await window.electronAPI.invoke('create-supplier', newName, newPhone, newGstin);
      setMessage('Supplier created successfully.');
      setShowNewSupplier(false);
      setNewName(''); setNewPhone(''); setNewGstin('');
      fetchSuppliers();
    } catch (err: any) {
      setMessage(`Failed to create supplier: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    
    const amt = parseFloat(paymentAmount) * 100;
    if (isNaN(amt) || amt <= 0) {
      setMessage('Invalid payment amount');
      return;
    }

    try {
      await window.electronAPI.invoke('record-supplier-payment', selectedSupplier.supplier_id, amt, paymentNote);
      setMessage('Payment to supplier recorded successfully.');
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentNote('');
      fetchSuppliers();
      // Refresh ledger
      const updatedSup = { ...selectedSupplier, current_payable: selectedSupplier.current_payable - amt };
      selectSupplier(updatedSup);
    } catch (err: any) {
      setMessage(`Payment failed: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const totalMarketPayable = suppliers.reduce((acc, s) => acc + Math.max(0, s.current_payable), 0);

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center">
            <Truck className="mr-3" /> Suppliers & Payables
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Manage vendor accounts and track outgoing payments.</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowNewSupplier(true)}
            className="flex items-center space-x-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded font-mono text-sm transition-colors"
          >
            <Plus size={16} /> <span>New Supplier</span>
          </button>
          <div className="bg-zinc-900 border border-zinc-800 rounded p-3 flex flex-col items-end">
            <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Total Payables</span>
            <span className="text-red-400 font-mono font-bold">{formatMoney(totalMarketPayable)}</span>
          </div>
        </div>
      </div>

      {message && (
        <div className="bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded font-mono text-sm">
          {message}
        </div>
      )}

      <div className="flex-1 flex space-x-6 min-h-0">
        {/* Left List */}
        <div className="w-1/3 flex flex-col bg-zinc-900 border border-zinc-850 rounded flex-shrink-0">
          <div className="p-4 border-b border-zinc-850">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="text" 
                placeholder="Search by Name or Phone" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded pl-10 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-zinc-600 font-mono text-xs animate-pulse">LOADING...</div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 font-mono text-xs">NO SUPPLIERS FOUND</div>
            ) : (
              <div className="divide-y divide-zinc-850/50">
                {filteredSuppliers.map(s => {
                  const isSelected = selectedSupplier?.supplier_id === s.supplier_id;
                  return (
                    <button 
                      key={s.supplier_id}
                      onClick={() => selectSupplier(s)}
                      className={`w-full text-left p-4 hover:bg-zinc-800/50 transition-colors flex items-center justify-between ${isSelected ? 'bg-amber-400/10 border-l-2 border-amber-400' : 'border-l-2 border-transparent'}`}
                    >
                      <div>
                        <div className="font-bold text-zinc-200">{s.name}</div>
                        <div className="text-xs text-zinc-500 font-mono mt-1">{s.phone || 'No Phone'}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono text-sm font-bold ${s.current_payable > 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                          {formatMoney(s.current_payable)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Details Panel */}
        <div className="w-2/3 flex flex-col bg-zinc-900 border border-zinc-850 rounded">
          {!selectedSupplier ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
              <Truck size={48} className="mb-4 opacity-20" />
              <div className="font-mono text-sm uppercase tracking-widest">Select a supplier to view payables</div>
            </div>
          ) : (
            <>
              {/* Profile Header */}
              <div className="p-6 border-b border-zinc-850 bg-zinc-950/20">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-100">{selectedSupplier.name}</h2>
                    <p className="text-sm text-zinc-400 font-mono mt-1">{selectedSupplier.phone || 'No Phone'} {selectedSupplier.gstin && `| GSTIN: ${selectedSupplier.gstin}`}</p>
                  </div>
                  
                  <div className="flex flex-col space-y-2 text-right">
                    <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
                      <div className="text-[10px] text-zinc-500 uppercase font-mono mb-1">Current Payable</div>
                      <div className={`text-xl font-mono font-bold ${selectedSupplier.current_payable > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {formatMoney(selectedSupplier.current_payable)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="px-6 py-3 border-b border-zinc-850 bg-zinc-900 flex justify-between items-center">
                <div className="flex space-x-4 font-mono text-sm">
                  <button 
                    onClick={() => setActiveTab('DETAILS')}
                    className={`pb-1 border-b-2 ${activeTab === 'DETAILS' ? 'border-amber-400 text-amber-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                  >
                    PROFILE
                  </button>
                  <button 
                    onClick={() => setActiveTab('LEDGER')}
                    className={`pb-1 border-b-2 ${activeTab === 'LEDGER' ? 'border-amber-400 text-amber-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                  >
                    PAYABLES LEDGER
                  </button>
                </div>
                
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setShowPaymentModal(true)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold rounded font-mono text-xs uppercase tracking-wider transition-colors"
                  >
                    <IndianRupee size={12} /> <span>Record Payment</span>
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'DETAILS' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-zinc-500 uppercase tracking-widest font-mono text-xs mb-3">Vendor Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-zinc-950 p-3 rounded border border-zinc-850">
                          <div className="text-[10px] text-zinc-600 uppercase font-mono">Created On</div>
                          <div className="text-sm text-zinc-300 mt-1 font-mono">{selectedSupplier.created_at || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'LEDGER' && (
                  <div>
                    <h3 className="text-zinc-500 uppercase tracking-widest font-mono text-xs mb-4">Transactions History</h3>
                    <div className="border border-zinc-800 rounded overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-950 text-zinc-500 text-[10px] uppercase font-mono tracking-wider border-b border-zinc-800">
                            <th className="p-3 font-normal">Date</th>
                            <th className="p-3 font-normal">Type</th>
                            <th className="p-3 font-normal">Ref</th>
                            <th className="p-3 font-normal">Note</th>
                            <th className="p-3 font-normal text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs font-mono divide-y divide-zinc-850/50">
                          {ledger.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-6 text-center text-zinc-600">No GRN or payments found</td>
                            </tr>
                          ) : (
                            ledger.map((row, idx) => {
                              const isPayment = row.type === 'PAYMENT';
                              return (
                                <tr key={idx} className="hover:bg-zinc-800/30">
                                  <td className="p-3 text-zinc-400">{row.created_at?.split(' ')[0]}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                      !isPayment ? 'bg-red-900/30 text-red-400' : 'bg-emerald-900/30 text-emerald-400'
                                    }`}>
                                      {row.type}
                                    </span>
                                  </td>
                                  <td className="p-3 text-zinc-400">{row.ref || '-'}</td>
                                  <td className="p-3 text-zinc-500 truncate max-w-[150px]" title={row.note}>{row.note?.split('|').pop()?.trim() || '-'}</td>
                                  <td className={`p-3 text-right font-bold ${!isPayment ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {!isPayment ? '+' : '-'}{formatMoney(row.amount)}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment Receipt Modal */}
      {showPaymentModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-2xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-emerald-400 font-mono uppercase tracking-wider mb-2">Record Outward Payment</h3>
            <p className="text-xs text-zinc-400 mb-6">Recording a payment to <span className="font-bold text-zinc-200">{selectedSupplier.name}</span>. Total Payable: <span className="text-red-400">{formatMoney(selectedSupplier.current_payable)}</span></p>
            
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-500 uppercase mb-1">Amount Paid (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-600" size={14} />
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded pl-9 pr-3 py-2 text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 15000"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-mono text-zinc-500 uppercase mb-1">Note / UTR (Optional)</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. NEFT transfer"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-200 text-sm font-mono uppercase transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold rounded text-sm font-mono uppercase tracking-wide transition-colors"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Supplier Modal */}
      {showNewSupplier && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-2xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-amber-400 font-mono uppercase tracking-wider mb-2 flex items-center">
              <PackagePlus className="mr-2" size={18} /> Add Supplier
            </h3>
            
            <form onSubmit={handleCreateSupplier} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-mono text-zinc-500 uppercase mb-1">Supplier/Company Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 font-mono focus:outline-none focus:border-amber-400"
                  placeholder="e.g. Pioneer Distributors"
                />
              </div>
              
              <div>
                <label className="block text-xs font-mono text-zinc-500 uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-400"
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-500 uppercase mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={newGstin}
                  onChange={(e) => setNewGstin(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 font-mono focus:outline-none focus:border-amber-400"
                  placeholder="29ABCDE1234F1Z5"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewSupplier(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-200 text-sm font-mono uppercase transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold rounded text-sm font-mono uppercase tracking-wide transition-colors"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
