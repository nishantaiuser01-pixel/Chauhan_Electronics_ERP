import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, CheckCircle, Printer, X } from 'lucide-react';
import { triggerPrint } from '../utils/printUtils';

export default function Quotations() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  
  // Builder state
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    fetchQuotations();
    fetchCustomers();
  }, []);

  const fetchQuotations = async () => {
    try {
      const res = await window.electronAPI.invoke('db-query', 'SELECT * FROM quotations ORDER BY quotation_id DESC LIMIT 50');
      setQuotations(res);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await window.electronAPI.invoke('db-query', "SELECT * FROM customers WHERE tier != 'COUNTER'");
      setCustomers(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await window.electronAPI.invoke('db-query', 
        `SELECT * FROM products WHERE brand_name LIKE ? OR model_name LIKE ? OR sku_code LIKE ? LIMIT 10`,
        [`%${q}%`, `%${q}%`, `%${q}%`]
      );
      setSearchResults(res);
    } catch (e) {
      console.error(e);
    }
  };

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.product_id);
      if (existing) {
        return prev.map(i => i.product_id === product.product_id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      // default price based on selected customer tier or counter
      const customer = customers.find(c => c.customer_id === selectedCustomerId);
      let price = product.counter_price;
      if (customer) {
        if (customer.tier === 'DEALER') price = product.dealer_price;
        if (customer.tier === 'DISTRIBUTOR') price = product.distributor_price;
      }
      return [...prev, {
        product_id: product.product_id,
        brand_name: product.brand_name,
        model_name: product.model_name,
        quantity: 1,
        price: price,
        tax_rate: product.gst_rate
      }];
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateCartQty = (idx: number, qty: number) => {
    setCart(prev => prev.map((item, i) => i === idx ? { ...item, quantity: Math.max(1, qty) } : item));
  };
  const updateCartPrice = (idx: number, priceStr: string) => {
    const val = parseInt(priceStr, 10);
    if (isNaN(val)) return;
    setCart(prev => prev.map((item, i) => i === idx ? { ...item, price: val * 100 } : item));
  };

  const saveQuotation = async () => {
    if (cart.length === 0) return alert('Cart is empty');
    if (selectedCustomerId === '') return alert('Select a customer');
    
    const customer = customers.find(c => c.customer_id === selectedCustomerId);
    
    // Compute taxes and structure payload
    const itemsPayload = cart.map(item => {
      const gross = item.price; // assuming inclusive for this simple UI
      const taxRate = item.tax_rate;
      const taxable = Math.round((gross * 100) / (100 + taxRate));
      const taxAmt = gross - taxable;
      return {
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        discount: 0,
        tax_rate: taxRate,
        taxable_value: taxable * item.quantity,
        tax_amt: taxAmt * item.quantity
      };
    });

    try {
      const token = localStorage.getItem('desktop_token');
      const res = await fetch('http://localhost:47615/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customer_id: customer.customer_id,
          customer_name: customer.name,
          customer_phone: customer.phone,
          items: itemsPayload
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      alert('Quotation saved successfully!');
      setIsBuilding(false);
      setCart([]);
      fetchQuotations();
    } catch (e: any) {
      alert('Failed: ' + e.message);
    }
  };

  const toINR = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((paise || 0) / 100);

  if (isBuilding) {
    return (
      <div className="flex flex-col h-full bg-zinc-950 p-6 space-y-6">
        <div className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <div className="flex items-center text-amber-400">
            <FileText size={24} className="mr-3" />
            <h2 className="text-xl font-bold font-mono tracking-widest uppercase">New Quotation</h2>
          </div>
          <button onClick={() => setIsBuilding(false)} className="text-zinc-500 hover:text-zinc-300"><X size={24} /></button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          <div className="lg:col-span-2 flex flex-col space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <label className="text-xs text-zinc-500 font-mono uppercase block mb-2">Select B2B Customer</label>
              <select 
                value={selectedCustomerId} 
                onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-100 font-mono"
              >
                <option value="">-- Select Customer --</option>
                {customers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.name} ({c.tier})</option>)}
              </select>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex-1 flex flex-col min-h-0 relative">
              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-3 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded pl-10 pr-4 py-2 text-zinc-100 font-mono"
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-10 max-h-60 overflow-y-auto">
                    {searchResults.map(p => (
                      <div key={p.product_id} onClick={() => addToCart(p)} className="p-3 border-b border-zinc-800 hover:bg-zinc-800 cursor-pointer flex justify-between">
                        <span className="text-sm text-zinc-200">{p.brand_name} {p.model_name}</span>
                        <span className="text-xs text-amber-400 font-mono">{toINR(p.counter_price)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto border border-zinc-800 rounded p-2 bg-zinc-950/50">
                {cart.length === 0 ? (
                  <div className="text-center text-zinc-600 mt-10 font-mono text-sm">Cart is empty</div>
                ) : (
                  cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 border-b border-zinc-800/50 bg-zinc-900 rounded mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-bold text-zinc-200">{item.brand_name} {item.model_name}</div>
                        <div className="text-xs text-zinc-500 font-mono">GST: {item.tax_rate}%</div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <span className="text-xs text-zinc-500 mr-2 font-mono">Qty:</span>
                          <input type="number" value={item.quantity} onChange={e => updateCartQty(idx, Number(e.target.value))} className="w-16 bg-zinc-950 border border-zinc-700 rounded p-1 text-center font-mono text-sm text-zinc-100" />
                        </div>
                        <div className="flex items-center">
                          <span className="text-xs text-zinc-500 mr-2 font-mono">₹</span>
                          <input type="number" value={(item.price/100).toFixed(0)} onChange={e => updateCartPrice(idx, e.target.value)} className="w-24 bg-zinc-950 border border-zinc-700 rounded p-1 text-center font-mono text-sm text-zinc-100" />
                        </div>
                        <button onClick={() => setCart(c => c.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-400"><X size={18} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-zinc-100 font-mono uppercase border-b border-zinc-800 pb-2 mb-4">Summary</h3>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Items</span>
                  <span>{cart.reduce((a, c) => a + c.quantity, 0)}</span>
                </div>
                <div className="flex justify-between text-zinc-100 font-bold text-lg pt-4 border-t border-zinc-800">
                  <span>Total</span>
                  <span className="text-emerald-400">{toINR(cart.reduce((a, c) => a + (c.price * c.quantity), 0))}</span>
                </div>
              </div>
            </div>
            <button onClick={saveQuotation} className="w-full py-4 bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold font-mono text-lg rounded-xl flex justify-center items-center gap-2 mt-6">
              <CheckCircle size={20} /> GENERATE QUOTATION
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 backdrop-blur-xl shadow-2xl relative overflow-hidden shrink-0">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h2 className="text-2xl font-bold font-mono tracking-wide text-zinc-100 uppercase flex items-center">
            <FileText className="mr-3 text-amber-400" size={28} />
            Quotations
          </h2>
          <p className="text-sm text-zinc-400 mt-1">Generate and print non-destructive proforma invoices</p>
        </div>
        <button onClick={() => setIsBuilding(true)} className="flex items-center bg-amber-400 hover:bg-amber-500 text-black px-4 py-2 rounded-lg font-bold font-mono text-sm transition-colors shadow-lg shadow-amber-400/20">
          <Plus size={16} className="mr-2" /> NEW QUOTATION
        </button>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/50">
          <h3 className="text-zinc-200 font-mono text-sm font-bold uppercase">Recent Quotations</h3>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="text-xs font-mono text-zinc-500 uppercase">
              <tr>
                <th className="px-4 py-3 border-b border-zinc-800">Date</th>
                <th className="px-4 py-3 border-b border-zinc-800">Quotation No</th>
                <th className="px-4 py-3 border-b border-zinc-800">Customer</th>
                <th className="px-4 py-3 border-b border-zinc-800 text-right">Amount</th>
                <th className="px-4 py-3 border-b border-zinc-800 text-center">Status</th>
                <th className="px-4 py-3 border-b border-zinc-800 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {quotations.map(q => (
                <tr key={q.quotation_id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3 text-zinc-400 font-mono">{new Date(q.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-zinc-200 font-bold font-mono">{q.quotation_no}</td>
                  <td className="px-4 py-3 text-zinc-300">{q.customer_name}</td>
                  <td className="px-4 py-3 text-right text-amber-400 font-bold font-mono">{toINR(q.grand_total)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-[10px] font-bold font-mono rounded ${
                      q.status === 'CONVERTED' ? 'bg-emerald-500/20 text-emerald-400' :
                      q.status === 'EXPIRED' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>{q.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => triggerPrint('QUOTATION', q.quotation_id)} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors">
                      <Printer size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {quotations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-600 italic font-mono text-xs">No quotations generated yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
