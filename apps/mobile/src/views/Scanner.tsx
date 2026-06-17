import { useState, useEffect } from 'react';
import { Unlink, ScanLine, ShoppingCart, Send, X, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';

export default function Scanner() {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [cart, setCart] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [beaming, setBeaming] = useState(false);

  const ipConfig = localStorage.getItem('desktop_ip') || '';

  // Ensure camera scanner is stopped when leaving component
  useEffect(() => {
    return () => {
      stopScan();
    };
  }, []);

  const handleDisconnect = () => {
    stopScan();
    localStorage.removeItem('desktop_ip');
    navigate('/config');
  };

  const startScan = async () => {
    setErrorMsg('');
    try {
      // Check permissions
      const status = await BarcodeScanner.checkPermission({ force: true });
      if (!status.granted) {
        setErrorMsg('Camera permission denied.');
        return;
      }

      await BarcodeScanner.hideBackground();
      setIsScanning(true);
      document.body.style.backgroundColor = 'transparent';

      const result = await BarcodeScanner.startScan();

      if (result.hasContent) {
        handleBarcodeScanned(result.content);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Camera Error');
    } finally {
      stopScan();
    }
  };

  const stopScan = async () => {
    setIsScanning(false);
    document.body.style.backgroundColor = '#09090b'; // zinc-950
    try {
      await BarcodeScanner.showBackground();
      await BarcodeScanner.stopScan();
    } catch (e) {
      console.log(e);
    }
  };

  const handleBarcodeScanned = async (barcode: string) => {
    try {
      // We assume barcode is SKU code for now
      // Query the desktop API
      const res = await fetch(`http://${ipConfig}/api/products/${barcode}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error(`Barcode ${barcode} not found in Catalogue`);
        throw new Error('API Error');
      }

      const data = await res.json();
      if (data.success) {
        const product = data.product;
        // Construct cart item format expected by Desktop
        const cartItem = {
          id: `loose-${product.product_id}`,
          product: product,
          instance: null,
          quantity: 1,
          price: product.counter_price,
          discount: 0
        };

        setCart(prev => {
          const existing = prev.find(i => i.id === cartItem.id);
          if (existing) {
            return prev.map(i => i.id === cartItem.id ? { ...i, quantity: i.quantity + 1 } : i);
          }
          return [...prev, cartItem];
        });
      }
    } catch (e: any) {
      setErrorMsg(e.message);
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // DEV OVERRIDE
  useEffect(() => {
    (window as any).simulateScan = handleBarcodeScanned;
  }, [ipConfig]);

  const handleBeamCart = async () => {
    if (cart.length === 0) return;
    setBeaming(true);
    setErrorMsg('');
    
    try {
      const res = await fetch(`http://${ipConfig}/api/cart/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart })
      });
      
      const data = await res.json();
      if (data.success) {
        // Clear cart after successful handoff
        setCart([]);
      } else {
        throw new Error(data.error || 'Failed to beam cart');
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setBeaming(false);
    }
  };

  if (isScanning) {
    return (
      <div className="h-screen w-screen flex flex-col relative bg-transparent">
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10 bg-black/50">
          <span className="text-white font-mono font-bold tracking-widest">SCANNING...</span>
          <button onClick={stopScan} className="bg-white/20 p-2 rounded-full text-white">
            <X size={24} />
          </button>
        </div>
        {/* The camera view shows here because background is transparent */}
        <div className="flex-1 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 border-2 border-amber-400 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold font-mono text-amber-400 uppercase tracking-widest">
            Scanner Node
          </h1>
          <div className="flex items-center mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
            <span className="text-[10px] text-zinc-500 font-mono tracking-wider">
              {ipConfig}
            </span>
          </div>
        </div>
        
        <button 
          onClick={handleDisconnect}
          className="bg-zinc-950 border border-zinc-800 p-2 rounded text-zinc-500 hover:text-red-400 transition-colors"
        >
          <Unlink size={16} />
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-950/50 border-b border-red-500/30 p-3 flex items-center space-x-2 text-red-400">
          <AlertTriangle size={16} />
          <span className="text-xs font-mono">{errorMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        
        <button 
          onClick={startScan}
          className="w-full bg-amber-400 text-zinc-950 rounded-xl p-8 flex flex-col items-center justify-center space-y-4 shadow-[0_0_30px_rgba(251,191,36,0.15)] active:scale-95 transition-transform shrink-0"
        >
          <ScanLine size={48} strokeWidth={1.5} />
          <span className="font-bold font-mono text-xl tracking-widest">TAP TO SCAN</span>
        </button>

        {/* Local Cart Preview */}
        <div className="mt-8 flex-1 flex flex-col min-h-0 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
            <h3 className="text-sm font-bold font-mono text-zinc-300 uppercase flex items-center">
              <ShoppingCart size={16} className="mr-2" /> Godown Cart
            </h3>
            <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded font-mono font-bold">
              {cart.reduce((sum, i) => sum + i.quantity, 0)} ITEMS
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs font-mono text-zinc-600 p-6 text-center">
                Cart is empty. Scan boxes to add them here.
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="bg-zinc-950 border border-zinc-800 p-3 rounded flex justify-between items-center">
                  <div>
                    <div className="text-xs font-bold text-zinc-200 uppercase">{item.product.brand_name} {item.product.model_name}</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-1">₹{(item.price/100).toFixed(2)}</div>
                  </div>
                  <div className="bg-zinc-800 text-amber-400 font-bold font-mono px-3 py-1 rounded text-sm">
                    x{item.quantity}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
      
      {/* Bottom Beam Button */}
      <div className="p-6 bg-zinc-900 border-t border-zinc-800 shrink-0">
        <button 
          onClick={handleBeamCart}
          disabled={cart.length === 0 || beaming}
          className={`w-full py-4 rounded-lg font-bold font-mono uppercase tracking-widest transition-all flex justify-center items-center ${
            cart.length === 0 ? 'bg-zinc-800 text-zinc-600' : 
            beaming ? 'bg-emerald-500/50 text-zinc-950 animate-pulse' :
            'bg-emerald-500 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
          }`}
        >
          {beaming ? 'BEAMING...' : (
            <><Send className="mr-2" size={20} /> BEAM TO DESK</>
          )}
        </button>
      </div>
    </div>
  );
}
