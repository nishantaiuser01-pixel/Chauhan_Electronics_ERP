import { useState, useEffect } from 'react';
import { ScanLine, X, AlertTriangle, WifiOff, CheckCircle, ChevronRight, Lock, PackageSearch } from 'lucide-react';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { useApi } from '../hooks/useApi';

export default function Scanner({ connected }: { connected: boolean }) {
  const { call } = useApi();
  const [isScanning, setIsScanning] = useState(false);
  const [cart, setCart] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [checkoutStep, setCheckoutStep] = useState<'scan' | 'price' | 'pay' | 'success'>('scan');
  
  // Phase 1: Feature 3 - Recommendations
  const [recommendations, setRecommendations] = useState<any[]>([]);
  
  // Checkout state
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(1);
  const selectedCustomer = customers.find(c => c.customer_id === selectedCustomerId) || { tier: 'COUNTER' };
  
  const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);
  const [finalPriceInput, setFinalPriceInput] = useState('');
  
  // Fetch data
  useEffect(() => { 
    if (connected) {
      call('/api/upi-accounts').then(res => {
        if (res.success && res.data) setUpiAccounts(res.data);
      }).catch(e => console.log('Failed to load UPI accounts', e));
      
      call('/api/customers').then(res => {
        if (res.success && res.data) setCustomers(res.data);
      }).catch(e => console.log('Failed to load customers', e));
    }
    return () => { stopScan(); }; 
  }, [connected]);

  // Recalculate cart prices when customer tier changes
  useEffect(() => {
    setCart(prev => prev.map(item => {
      const p = item.product;
      const tierPrice = selectedCustomer.tier === 'DISTRIBUTOR' ? p.distributor_price :
                        selectedCustomer.tier === 'DEALER' ? p.dealer_price : p.counter_price;
      return { ...item, price: tierPrice, discount: 0, override_token: null }; // Reset discount/override on tier change
    }));
  }, [selectedCustomerId]);

  useEffect(() => {
    if (connected && cart.length > 0) {
      fetchRecommendations();
    } else {
      setRecommendations([]);
    }
  }, [cart, connected]);

  const fetchRecommendations = async () => {
    try {
      const productIds = Array.from(new Set(cart.map(c => c.product_id)));
      const res = await call('/api/sales/recommendations', {
        method: 'POST',
        body: JSON.stringify({ productIds })
      });
      if (res.success) {
        setRecommendations(res.recommendations);
      }
    } catch (e) {
      console.log("Failed to fetch recommendations", e);
    }
  };
  
  // Override state
  const [needsOverride, setNeedsOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [validating, setValidating] = useState(false);
  
  // Payment state
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'UDHAAR'>('CASH');
  const [beaming, setBeaming] = useState(false);
  const [upiAccounts, setUpiAccounts] = useState<any[]>([]);
  const [selectedUpiIndex, setSelectedUpiIndex] = useState<number>(0);
  
  const [udhaarOverrideToken, setUdhaarOverrideToken] = useState<string | null>(null);
  const [needsUdhaarOverride, setNeedsUdhaarOverride] = useState(false);
  const [udhaarOverrideReason, setUdhaarOverrideReason] = useState('');
  const [udhaarAdminPin, setUdhaarAdminPin] = useState('');

  const [lastSaleId, setLastSaleId] = useState<number | null>(null);
  const [lastInvoiceNo, setLastInvoiceNo] = useState<string>('');



  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4000);
  };

  const startScan = async () => {
    setErrorMsg('');
    try {
      const status = await BarcodeScanner.checkPermission({ force: true });
      if (!status.granted) return showError('Camera permission denied.');
      await BarcodeScanner.hideBackground();
      setIsScanning(true);
      document.body.style.backgroundColor = 'transparent';
      const result = await BarcodeScanner.startScan();
      if (result.hasContent) handleBarcodeScanned(result.content);
    } catch (e: any) {
      showError(e.message || 'Camera Error');
    } finally {
      stopScan();
    }
  };

  const stopScan = async () => {
    setIsScanning(false);
    document.body.style.backgroundColor = '#09090b';
    try {
      await BarcodeScanner.showBackground();
      await BarcodeScanner.stopScan();
    } catch (e) {}
  };

  const handleBarcodeScanned = async (barcode: string) => {
    try {
      // First try serial lookup
      let data = await call(`/api/products/serial/${barcode}`).catch(() => null);
      if (!data) {
        // Fallback to SKU lookup
        data = await call(`/api/products/${barcode}`);
      }

      if (data && data.success) {
        const { product, instance, stock } = data;
        if (product.requires_serial && !instance) {
          throw new Error('This product requires a serial number scan.');
        }
        if (stock < 1) throw new Error('Item is out of stock.');

        const tierPrice = selectedCustomer.tier === 'DISTRIBUTOR' ? product.distributor_price :
                          selectedCustomer.tier === 'DEALER' ? product.dealer_price : product.counter_price;

        const item = {
          cart_id: instance ? instance.instance_id : `loose-${product.product_id}-${Date.now()}`,
          product_id: product.product_id,
          instance_id: instance ? instance.instance_id : null,
          product,
          quantity: 1,
          price: tierPrice,
          discount: 0,
          override_token: null,
          status: 'pending' // pending -> priced
        };

        setCart(prev => [...prev, item]);
        setActiveItemIdx(cart.length); // point to new item
        setFinalPriceInput((tierPrice / 100).toString());
        setCheckoutStep('price');
      }
    } catch (e: any) {
      showError(e.message);
    }
  };

  const handlePriceSubmit = async () => {
    if (activeItemIdx === null) return;
    const item = cart[activeItemIdx];
    const fp = Math.round(parseFloat(finalPriceInput) * 100);
    if (isNaN(fp) || fp < 0) return showError('Invalid price');

    setValidating(true);
    try {
      // Ask hub to validate the floor / max discount
      const val = await call('/api/sales/validate-price', {
        method: 'POST',
        body: JSON.stringify({ product_id: item.product_id, instance_id: item.instance_id, final_price: fp })
      });

      if (!val.allowed) {
        setNeedsOverride(true);
        setOverrideReason(val.reason);
        return;
      }

      // Approved!
      commitPrice(fp, null);
    } catch (e: any) {
      showError(e.message);
    } finally {
      setValidating(false);
    }
  };

  const handleAdminOverride = async () => {
    if (activeItemIdx === null) return;
    const item = cart[activeItemIdx];
    const fp = Math.round(parseFloat(finalPriceInput) * 100);
    setValidating(true);
    try {
      const val = await call('/api/sales/admin-override', {
        method: 'POST',
        body: JSON.stringify({ admin_pin: adminPin, product_id: item.product_id, instance_id: item.instance_id, final_price: fp, note: 'Mobile terminal override' })
      });
      commitPrice(fp, val.override_token);
      setNeedsOverride(false);
      setAdminPin('');
    } catch (e: any) {
      showError(e.message);
    } finally {
      setValidating(false);
    }
  };

  const commitPrice = (fp: number, token: string | null) => {
    setCart(prev => {
      const next = [...prev];
      const item = next[activeItemIdx!];
      item.discount = item.price - fp;
      item.override_token = token;
      item.status = 'priced';
      return next;
    });
    setCheckoutStep('scan');
    setActiveItemIdx(null);
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !connected) return;
    setBeaming(true);
    setErrorMsg('');
    try {
      const payload = {
        customer_id: selectedCustomerId,
        tier_applied: selectedCustomer.tier,
        payment_mode: paymentMode,
        udhaar_override_token: udhaarOverrideToken,
        cart: cart.map(c => ({
          product_id: c.product_id,
          instance_id: c.instance_id,
          quantity: c.quantity,
          price: c.price,
          discount: c.discount,
          override_token: c.override_token
        }))
      };

      const res = await call('/api/sales/checkout', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success) {
        setCart([]);
        setUdhaarOverrideToken(null);
        setNeedsUdhaarOverride(false);
        setLastSaleId(res.saleId);
        setLastInvoiceNo(res.invoiceNo || `Sale #${res.saleId}`);
        setCheckoutStep('success');
      }
    } catch (e: any) {
      if (e.data?.needs_override) {
        setNeedsUdhaarOverride(true);
        setUdhaarOverrideReason(e.message);
      } else {
        showError(e.message);
      }
    } finally {
      setBeaming(false);
    }
  };

  const handleUdhaarOverride = async () => {
    setBeaming(true);
    try {
      const val = await call('/api/sales/admin-override', {
        method: 'POST',
        body: JSON.stringify({ admin_pin: udhaarAdminPin, override_type: 'UDHAAR', customer_id: selectedCustomerId, note: 'Mobile Udhaar override' })
      });
      setUdhaarOverrideToken(val.override_token);
      setNeedsUdhaarOverride(false);
      setUdhaarAdminPin('');
      // automatically re-try checkout
      setTimeout(handleCheckout, 100);
    } catch (e: any) {
      showError(e.message);
    } finally {
      setBeaming(false);
    }
  };

  // DEV OVERRIDE
  useEffect(() => { (window as any).simulateScan = handleBarcodeScanned; }, [connected]);

  // View: Scanning Overlay
  if (isScanning) {
    return (
      <div className="h-screen w-screen flex flex-col relative bg-transparent">
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10 bg-black/50">
          <span className="text-white font-mono font-bold tracking-widest">SCANNING...</span>
          <button onClick={stopScan} className="bg-white/20 p-2 rounded-full text-white"><X size={24} /></button>
        </div>
        <div className="flex-1 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 border-2 border-amber-400 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
        </div>
      </div>
    );
  }

  // View: Success
  if (checkoutStep === 'success') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-zinc-950">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
          <CheckCircle size={40} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold font-mono tracking-widest text-emerald-500 uppercase mb-2">Sale Complete</h2>
        <p className="text-sm text-zinc-400 font-mono mb-8">{lastInvoiceNo}</p>
        
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={() => call(`/api/sales/${lastSaleId}/print`, { method: 'POST' }).then(() => showError('Print requested!')).catch(e => showError(e.message))}
            className="w-full py-3 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold font-mono rounded-xl hover:bg-zinc-800 transition-colors"
          >
            PRINT RECEIPT
          </button>
          
          <button 
            onClick={() => window.open(`https://wa.me/?text=Here is your bill from Chauhan Electronics: ${lastInvoiceNo}`)}
            className="w-full py-3 bg-[#25D366]/20 border border-[#25D366]/50 text-[#25D366] font-bold font-mono rounded-xl hover:bg-[#25D366]/30 transition-colors"
          >
            SHARE ON WHATSAPP
          </button>

          <button 
            onClick={() => { setCheckoutStep('scan'); setLastSaleId(null); setLastInvoiceNo(''); }}
            className="w-full py-3 bg-emerald-500 text-zinc-950 font-bold font-mono rounded-xl mt-4 hover:bg-emerald-400 transition-colors"
          >
            START NEW SALE
          </button>
        </div>
      </div>
    );
  }

  // View: Pricing Step
  if (checkoutStep === 'price' && activeItemIdx !== null) {
    const item = cart[activeItemIdx];
    return (
      <div className="flex flex-col h-full p-4 bg-zinc-950">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setCart(c => c.filter((_, i) => i !== activeItemIdx)); setCheckoutStep('scan'); }} className="p-2 bg-zinc-900 rounded-lg text-zinc-400">
            <X size={20} />
          </button>
          <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-zinc-100">Set Price</h2>
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
          <p className="text-xs text-amber-400 font-mono font-bold mb-1">SCANNED ITEM</p>
          <p className="text-lg font-bold text-zinc-100">{item.product.brand_name} {item.product.model_name}</p>
          <p className="text-xs text-zinc-500 font-mono mt-1">MRP: ₹{(item.price/100).toFixed(2)}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
          <label className="text-xs font-mono text-zinc-400 block mb-2">FINAL SELLING PRICE (₹)</label>
          <input
            type="number"
            autoFocus
            value={finalPriceInput}
            onChange={e => { setFinalPriceInput(e.target.value); setNeedsOverride(false); }}
            className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 text-2xl font-mono font-bold rounded-lg px-4 py-3 focus:outline-none focus:border-amber-400 text-center"
          />
        </div>

        {needsOverride && (
          <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4 mb-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <Lock size={16} />
              <span className="text-xs font-bold font-mono uppercase">Admin Override Required</span>
            </div>
            <p className="text-xs text-red-300 font-mono mb-4">{overrideReason}</p>
            <input
              type="password"
              placeholder="Admin PIN"
              value={adminPin}
              onChange={e => setAdminPin(e.target.value)}
              className="w-full bg-zinc-950 border border-red-500/50 text-red-100 font-mono font-bold rounded-lg px-4 py-3 text-center mb-3 focus:outline-none"
            />
            <button
              onClick={handleAdminOverride}
              disabled={validating || !adminPin}
              className="w-full py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold font-mono rounded-lg transition-colors"
            >
              {validating ? 'AUTHORIZING...' : 'AUTHORIZE OVERRIDE'}
            </button>
          </div>
        )}

        {!needsOverride && (
          <button
            onClick={handlePriceSubmit}
            disabled={validating || !finalPriceInput}
            className="mt-auto py-4 bg-emerald-500 text-zinc-950 font-bold font-mono text-lg rounded-xl flex justify-center items-center gap-2 active:scale-95 transition-all"
          >
            {validating ? 'VALIDATING...' : 'CONFIRM PRICE'} <ChevronRight size={20} />
          </button>
        )}
      </div>
    );
  }

  // View: Main Scanner / Cart
  const cartTotal = cart.reduce((sum, item) => sum + (item.price - item.discount), 0);

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {errorMsg && (
        <div className="bg-red-950/50 border-b border-red-500/30 p-3 flex items-center space-x-2 text-red-400 shrink-0">
          <AlertTriangle size={16} />
          <span className="text-xs font-mono">{errorMsg}</span>
        </div>
      )}

      <div className="flex-1 flex flex-col p-4 overflow-hidden gap-4">
        {/* Big Scan Button */}
        <button
          onClick={startScan}
          disabled={!connected}
          className={`w-full rounded-2xl py-8 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-transform shrink-0 ${
            connected
              ? 'bg-zinc-900 border-2 border-amber-400/50 text-amber-400 hover:bg-amber-400/10'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed border-none'
          }`}
        >
          {connected ? <ScanLine size={40} strokeWidth={1.5} /> : <WifiOff size={40} strokeWidth={1.5} />}
          <span className="font-bold font-mono tracking-widest uppercase">
            {connected ? 'TAP TO SCAN' : 'OFFLINE'}
          </span>
        </button>

        {/* Customer Selector */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 shrink-0">
          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Selling To</label>
          <div className="flex items-center justify-between">
            <select 
              className="bg-zinc-950 text-amber-400 font-bold font-mono text-sm px-2 py-1.5 rounded border border-zinc-800 focus:outline-none focus:border-amber-400 flex-1"
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(Number(e.target.value))}
            >
              {customers.map(c => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.name} {c.tier !== 'COUNTER' ? `(${c.tier})` : ''}
                </option>
              ))}
              {customers.length === 0 && <option value={1}>Counter Customer</option>}
            </select>
            {selectedCustomer.tier !== 'COUNTER' && (
              <span className={`ml-3 text-[10px] font-mono font-bold px-2 py-1 rounded ${selectedCustomer.current_balance > selectedCustomer.credit_limit || selectedCustomer.overdue ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-400'}`}>
                ₹{((selectedCustomer.current_balance || 0)/100).toFixed(0)} DUE
              </span>
            )}
          </div>
        </div>

        {/* Cart Preview */}
        <div className="flex-1 flex flex-col min-h-0 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-3 border-b border-zinc-800 bg-zinc-950/50 flex justify-between items-center shrink-0">
            <span className="text-xs font-bold font-mono text-zinc-400 uppercase">Cart ({cart.length})</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">₹{(cartTotal/100).toFixed(2)}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs font-mono text-zinc-600 p-6 text-center">
                Scan products to add them to the cart
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl flex justify-between items-center relative overflow-hidden">
                  {item.override_token && (
                    <div className="absolute top-0 right-0 bg-red-500/20 text-red-400 text-[8px] font-bold px-2 py-0.5 rounded-bl-lg">OVERRIDE</div>
                  )}
                  <div>
                    <div className="text-sm font-bold text-zinc-200">{item.product.brand_name} {item.product.model_name}</div>
                    <div className="text-xs text-zinc-500 font-mono flex items-center gap-2 mt-0.5">
                      <span className="line-through">₹{(item.price/100).toFixed(0)}</span>
                      <span className="text-emerald-400 font-bold">₹{((item.price - item.discount)/100).toFixed(0)}</span>
                    </div>
                  </div>
                  <button onClick={() => setCart(c => c.filter((_, i) => i !== idx))} className="p-2 text-zinc-600 hover:text-red-400">
                    <X size={18} />
                  </button>
                </div>
              ))
            )}
            
            {/* Recommendations Section */}
            {recommendations.length > 0 && cart.length > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <PackageSearch size={14} className="text-amber-400" />
                  <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider">Frequently Bought Together</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="shrink-0 w-40 bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-3 snap-start">
                      <div className="text-xs font-bold text-zinc-300 truncate">{rec.brand_name} {rec.model_name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-1 mb-2">₹{(rec.price/100).toFixed(0)}</div>
                      <div className="text-[9px] text-emerald-500/80 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded inline-block">
                        Bought {rec.frequency}x times
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer Checkout */}
      {cart.length > 0 && (
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 shrink-0 flex flex-col items-center">
          {needsUdhaarOverride ? (
            <div className="w-full bg-red-950/30 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-500 mb-2">
                <Lock size={16} />
                <span className="text-xs font-bold font-mono tracking-widest">CREDIT BLOCKED</span>
              </div>
              <p className="text-[10px] text-red-400 font-mono mb-4">{udhaarOverrideReason}</p>
              <input
                type="password"
                placeholder="Admin PIN"
                value={udhaarAdminPin}
                onChange={e => setUdhaarAdminPin(e.target.value)}
                className="w-full bg-zinc-950 border border-red-500/50 text-red-100 font-mono font-bold rounded-lg px-4 py-3 text-center mb-3 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setNeedsUdhaarOverride(false)}
                  className="flex-1 py-3 bg-zinc-800 text-zinc-400 font-bold font-mono rounded-lg"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleUdhaarOverride}
                  disabled={beaming || !udhaarAdminPin}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold font-mono rounded-lg transition-colors"
                >
                  AUTHORIZE
                </button>
              </div>
            </div>
          ) : (
            <>
              {paymentMode === 'UPI' && upiAccounts.length > 0 && (
                <div className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col items-center mb-3">
                  <select
                    className="w-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-mono rounded px-2 py-2 mb-4 focus:outline-none focus:border-amber-400"
                    value={selectedUpiIndex}
                    onChange={e => setSelectedUpiIndex(Number(e.target.value))}
                  >
                    {upiAccounts.map((acc, idx) => (
                      <option key={idx} value={idx}>{acc.name || acc.merchant_name} ({acc.upi_id})</option>
                    ))}
                  </select>
                  
                  <div className="bg-white p-3 rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.1)] mb-2">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`upi://pay?pa=${upiAccounts[selectedUpiIndex]?.upi_id}&pn=Chauhan%20Electronics&am=${(cartTotal/100).toFixed(2)}&cu=INR${upiAccounts[selectedUpiIndex]?.merchant_code ? `&mc=${upiAccounts[selectedUpiIndex].merchant_code}` : ''}`)}`}
                      alt="UPI QR Code"
                      width={160}
                      height={160}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono text-center">
                    Scan to pay exactly ₹{(cartTotal/100).toFixed(2)}
                  </p>
                </div>
              )}

              <div className="flex gap-2 w-full mb-3">
                {(['CASH', 'UPI', 'UDHAAR'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setPaymentMode(mode)}
                    className={`flex-1 py-2 text-xs font-bold font-mono rounded-lg border transition-colors ${
                      paymentMode === mode 
                        ? 'bg-amber-400 text-zinc-950 border-amber-400' 
                        : 'bg-zinc-950 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <button 
                onClick={handleCheckout}
                disabled={beaming || !connected}
                className={`w-full py-4 rounded-xl font-bold font-mono text-lg transition-all flex justify-center items-center ${
                  beaming ? 'bg-emerald-500/50 text-zinc-950 animate-pulse' : 'bg-emerald-500 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95'
                }`}
              >
                {beaming ? 'PROCESSING...' : `PAY ₹${(cartTotal/100).toFixed(0)}`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
