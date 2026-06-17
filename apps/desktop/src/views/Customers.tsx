import React, { useState, useEffect } from 'react';
import { Users, Search, AlertCircle, FileText, Send, DollarSign, Calendar, IndianRupee, Printer, ArrowLeft, ArrowRight, UserPlus, Clock } from 'lucide-react';
import type { Customer, CustomerLedger } from '@chauhan-erp/core';
import type { AgingBuckets } from '@chauhan-erp/core/ledger';

interface CustomerWithAging extends Customer {
  aging: AgingBuckets;
}

export default function Customers() {
  const [customers, setCustomers] = useState<CustomerWithAging[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithAging | null>(null);
  const [ledger, setLedger] = useState<CustomerLedger[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'LEDGER'>('DETAILS');

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await window.electronAPI.invoke('get-customers-aging');
      setCustomers(res || []);
    } catch (e) {
      console.error('Failed to fetch customers', e);
    } finally {
      setLoading(false);
    }
  };

  const selectCustomer = async (cust: CustomerWithAging) => {
    setSelectedCustomer(cust);
    setActiveTab('DETAILS');
    try {
      const led = await window.electronAPI.invoke('get-customer-ledger', cust.customer_id);
      setLedger(led || []);
    } catch (e) {
      console.error('Failed to fetch ledger', e);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search) ||
    (c.shop_name && c.shop_name.toLowerCase().includes(search.toLowerCase()))
  );

  const formatMoney = (paise: number) => {
    return (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    
    const amt = parseFloat(paymentAmount) * 100;
    if (isNaN(amt) || amt <= 0) {
      setMessage('Invalid payment amount');
      return;
    }

    try {
      await window.electronAPI.invoke('record-udhaar-payment', selectedCustomer.customer_id, amt, paymentNote);
      
      // Enqueue payment SMS
      if (selectedCustomer.phone !== '0000000000') {
        window.electronAPI.invoke('enqueue-sms', selectedCustomer.phone, 'sms_tpl_payment', {
          amount: paymentAmount,
          invoice_no: 'Udhaar Clearance'
        }).catch(console.error);
      }

      setMessage('Payment recorded successfully.');
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentNote('');
      fetchCustomers();
      selectCustomer(selectedCustomer); // refresh ledger
    } catch (err: any) {
      setMessage(`Payment failed: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleQueueSMS = async () => {
    if (!selectedCustomer) return;
    try {
      await window.electronAPI.invoke('send-udhaar-reminder', selectedCustomer.customer_id);
      setMessage('SMS reminder queued successfully.');
    } catch (err: any) {
      setMessage(`Failed to queue SMS: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const printStatement = () => {
    window.print();
  };

  // Aggregate stats
  const totalMarketOutstanding = customers.reduce((acc, c) => acc + Math.max(0, c.current_balance), 0);
  const totalOverdue = customers.reduce((acc, c) => acc + (c.aging.total_overdue > 0 ? c.aging.total_overdue : 0), 0);

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center">
            <Users className="mr-3" /> Customers & Udhaar Ledger
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Manage customer profiles, credit limits, and collections.</p>
        </div>
        <div className="flex space-x-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded p-3 flex flex-col items-end">
            <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Total Outstanding</span>
            <span className="text-emerald-400 font-mono font-bold">{formatMoney(totalMarketOutstanding)}</span>
          </div>
          <div className="bg-zinc-900 border border-red-900/30 rounded p-3 flex flex-col items-end">
            <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Total Overdue</span>
            <span className="text-red-400 font-mono font-bold">{formatMoney(totalOverdue)}</span>
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
                placeholder="Search by Name, Shop, or Phone" 
                value={search}
                onChange={handleSearch}
                className="w-full bg-zinc-950 border border-zinc-800 rounded pl-10 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-zinc-600 font-mono text-xs animate-pulse">LOADING...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 font-mono text-xs">NO CUSTOMERS FOUND</div>
            ) : (
              <div className="divide-y divide-zinc-850/50">
                {filteredCustomers.map(c => {
                  const isSelected = selectedCustomer?.customer_id === c.customer_id;
                  const isOverdue = c.aging.total_overdue > 0;
                  return (
                    <button 
                      key={c.customer_id}
                      onClick={() => selectCustomer(c)}
                      className={`w-full text-left p-4 hover:bg-zinc-800/50 transition-colors flex items-center justify-between ${isSelected ? 'bg-amber-400/10 border-l-2 border-amber-400' : 'border-l-2 border-transparent'}`}
                    >
                      <div>
                        <div className="font-bold text-zinc-200">{c.name}</div>
                        <div className="text-xs text-zinc-500 font-mono mt-1">{c.phone} &bull; {c.tier}</div>
                        {c.shop_name && <div className="text-[10px] text-zinc-600 uppercase mt-0.5">{c.shop_name}</div>}
                      </div>
                      <div className="text-right">
                        <div className={`font-mono text-sm font-bold ${isOverdue ? 'text-red-400' : (c.current_balance > 0 ? 'text-amber-400' : 'text-zinc-400')}`}>
                          {formatMoney(c.current_balance)}
                        </div>
                        {isOverdue && (
                          <div className="flex items-center text-[10px] text-red-400 mt-1 uppercase font-bold tracking-wider">
                            <AlertCircle size={10} className="mr-1" /> Overdue
                          </div>
                        )}
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
          {!selectedCustomer ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
              <Users size={48} className="mb-4 opacity-20" />
              <div className="font-mono text-sm uppercase tracking-widest">Select a customer to view ledger</div>
            </div>
          ) : (
            <>
              {/* Customer Profile Header */}
              <div className="p-6 border-b border-zinc-850 bg-zinc-950/20">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-100">{selectedCustomer.name}</h2>
                    <p className="text-sm text-zinc-400 font-mono mt-1">{selectedCustomer.phone} {selectedCustomer.gstin && `| GSTIN: ${selectedCustomer.gstin}`}</p>
                    <div className="mt-3 flex space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {selectedCustomer.tier}
                      </span>
                      {selectedCustomer.credit_due_date && (
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center">
                          <Calendar size={10} className="mr-1" /> DUE: {selectedCustomer.credit_due_date}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2 text-right">
                    <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
                      <div className="text-[10px] text-zinc-500 uppercase font-mono mb-1">Current Balance</div>
                      <div className={`text-xl font-mono font-bold ${selectedCustomer.aging.total_overdue > 0 ? 'text-red-400' : (selectedCustomer.current_balance > 0 ? 'text-amber-400' : 'text-emerald-400')}`}>
                        {formatMoney(selectedCustomer.current_balance)}
                      </div>
                      <div className="text-[10px] text-zinc-600 uppercase font-mono mt-1">Limit: {formatMoney(selectedCustomer.credit_limit)}</div>
                    </div>
                  </div>
                </div>

                {/* Aging Summary Row */}
                {selectedCustomer.current_balance > 0 && (
                  <div className="mt-6 grid grid-cols-4 gap-4">
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded p-2 text-center">
                      <div className="text-[10px] text-zinc-500 font-mono uppercase">0-30 Days</div>
                      <div className="font-mono text-zinc-300 text-sm mt-1">{formatMoney(selectedCustomer.aging['0-30'])}</div>
                    </div>
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded p-2 text-center">
                      <div className="text-[10px] text-zinc-500 font-mono uppercase">31-60 Days</div>
                      <div className="font-mono text-amber-400/80 text-sm mt-1">{formatMoney(selectedCustomer.aging['31-60'])}</div>
                    </div>
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded p-2 text-center">
                      <div className="text-[10px] text-zinc-500 font-mono uppercase">61-90 Days</div>
                      <div className="font-mono text-orange-500 text-sm mt-1">{formatMoney(selectedCustomer.aging['61-90'])}</div>
                    </div>
                    <div className="bg-zinc-950/50 border border-red-900/30 rounded p-2 text-center">
                      <div className="text-[10px] text-red-500 font-mono uppercase">90+ Days</div>
                      <div className="font-mono text-red-500 text-sm mt-1">{formatMoney(selectedCustomer.aging['90+'])}</div>
                    </div>
                  </div>
                )}
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
                    STATEMENT
                  </button>
                </div>
                
                <div className="flex space-x-2">
                  <button 
                    onClick={handleQueueSMS}
                    disabled={selectedCustomer.aging.total_overdue <= 0}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 rounded font-mono text-xs uppercase transition-colors"
                  >
                    <Send size={12} /> <span>Queue SMS</span>
                  </button>
                  <button 
                    onClick={() => setShowPaymentModal(true)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold rounded font-mono text-xs uppercase tracking-wider transition-colors"
                  >
                    <IndianRupee size={12} /> <span>Receive Payment</span>
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'DETAILS' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-zinc-500 uppercase tracking-widest font-mono text-xs mb-3">Customer Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-zinc-950 p-3 rounded border border-zinc-850">
                          <div className="text-[10px] text-zinc-600 uppercase font-mono">Shop Name</div>
                          <div className="text-sm text-zinc-300 mt-1">{selectedCustomer.shop_name || 'N/A'}</div>
                        </div>
                        <div className="bg-zinc-950 p-3 rounded border border-zinc-850">
                          <div className="text-[10px] text-zinc-600 uppercase font-mono">Created On</div>
                          <div className="text-sm text-zinc-300 mt-1 font-mono">{selectedCustomer.created_at || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'LEDGER' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-zinc-500 uppercase tracking-widest font-mono text-xs">Ledger History</h3>
                      <button onClick={printStatement} className="flex items-center space-x-1 text-xs text-amber-400 hover:text-amber-300 font-mono">
                        <Printer size={12} /> <span>Print</span>
                      </button>
                    </div>
                    
                    <div className="border border-zinc-800 rounded overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-950 text-zinc-500 text-[10px] uppercase font-mono tracking-wider border-b border-zinc-800">
                            <th className="p-3 font-normal">Date</th>
                            <th className="p-3 font-normal">Type</th>
                            <th className="p-3 font-normal">Ref</th>
                            <th className="p-3 font-normal">Note</th>
                            <th className="p-3 font-normal text-right">Debit (-)</th>
                            <th className="p-3 font-normal text-right">Credit (+)</th>
                            <th className="p-3 font-normal text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs font-mono divide-y divide-zinc-850/50">
                          {ledger.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-6 text-center text-zinc-600">No ledger records found</td>
                            </tr>
                          ) : (
                            ledger.map(row => {
                              const isCredit = row.type === 'PAYMENT' || row.type === 'RETURN';
                              return (
                                <tr key={row.id} className="hover:bg-zinc-800/30">
                                  <td className="p-3 text-zinc-400">{row.created_at?.split(' ')[0]}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                      row.type === 'SALE' ? 'bg-amber-900/30 text-amber-400' :
                                      row.type === 'PAYMENT' ? 'bg-emerald-900/30 text-emerald-400' :
                                      'bg-zinc-800 text-zinc-300'
                                    }`}>
                                      {row.type}
                                    </span>
                                  </td>
                                  <td className="p-3 text-zinc-400">{row.ref_id || '-'}</td>
                                  <td className="p-3 text-zinc-500">{row.note || '-'}</td>
                                  <td className="p-3 text-right text-red-400">{!isCredit ? formatMoney(row.amount) : '-'}</td>
                                  <td className="p-3 text-right text-emerald-400">{isCredit ? formatMoney(row.amount) : '-'}</td>
                                  <td className="p-3 text-right font-bold text-zinc-200">{formatMoney(row.balance_after)}</td>
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
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-2xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-emerald-400 font-mono uppercase tracking-wider mb-2">Receive Payment</h3>
            <p className="text-xs text-zinc-400 mb-6">Recording a payment for <span className="font-bold text-zinc-200">{selectedCustomer.name}</span>. Current Balance: <span className="text-red-400">{formatMoney(selectedCustomer.current_balance)}</span></p>
            
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-500 uppercase mb-1">Amount (₹)</label>
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
                    placeholder="e.g. 5000"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-mono text-zinc-500 uppercase mb-1">Note (Optional)</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Cash paid to Ravi"
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
    </div>
  );
}
