import React, { useState } from 'react';

export default function Warranty() {
  const [serial, setSerial] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serial) return;
    setLoading(true);
    try {
      const res = await (window as any).ipcRenderer.invoke('db-warranty-check', serial);
      setResult(res);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-yellow-500 mb-6 font-mono">&gt;_ WARRANTY CHECKER</h2>
      <form onSubmit={checkWarranty} className="flex gap-4 mb-8">
        <input 
          autoFocus
          className="bg-zinc-900 border border-zinc-700 p-3 rounded flex-1 text-xl font-mono text-white" 
          placeholder="Scan or type serial number..." 
          value={serial} 
          onChange={e => setSerial(e.target.value)} 
        />
        <button disabled={loading} className="bg-yellow-600 hover:bg-yellow-500 text-black px-6 py-3 rounded font-bold">
          {loading ? '...' : 'CHECK'}
        </button>
      </form>

      {result && (
        <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-lg font-mono">
          {!result.found ? (
            <div className="text-red-500 text-3xl font-bold text-center py-10">NOT IN OUR REGISTRY</div>
          ) : (
            <div>
              <div className="grid grid-cols-2 gap-y-4 text-lg">
                <div className="text-zinc-400">Brand / Model:</div>
                <div className="text-white font-bold">{result.instance.brand_name} {result.instance.model_name}</div>
                
                <div className="text-zinc-400">Category:</div>
                <div className="text-white">{result.instance.category}</div>

                <div className="text-zinc-400">Status:</div>
                <div className="text-white">{result.instance.status}</div>
                
                <div className="text-zinc-400">Sold By Us:</div>
                <div className={result.sold_by_us ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                  {result.sold_by_us ? 'YES' : 'NO'}
                </div>

                {result.sold_by_us && result.sale && (
                  <>
                    <div className="text-zinc-400">Sold On:</div>
                    <div className="text-white">{new Date(result.sale.sale_date).toLocaleDateString()}</div>
                    
                    <div className="text-zinc-400">Invoice No:</div>
                    <div className="text-white">{result.sale.invoice_no}</div>

                    <div className="text-zinc-400">Sold To:</div>
                    <div className="text-white">{result.sale.customer_name} ({result.sale.customer_phone})</div>
                  </>
                )}

                <div className="text-zinc-400">Warranty Until:</div>
                <div className="text-white">{result.instance.warranty_expires_at ? new Date(result.instance.warranty_expires_at).toLocaleDateString() : 'N/A'}</div>

                <div className="text-zinc-400">Warranty Valid:</div>
                <div className={result.warranty_valid ? 'text-green-500 font-bold text-xl' : 'text-red-500 font-bold text-xl'}>
                  {result.warranty_valid ? 'YES' : 'NO / EXPIRED'}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-zinc-800">
                <button 
                  onClick={() => window.location.hash = `#/returns?serial=${result.instance.serial_number}`}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-yellow-500 py-4 rounded font-bold text-xl transition-colors"
                >
                  PROCESS AS RETURN &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
