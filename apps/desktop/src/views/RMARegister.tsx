import React, { useState, useEffect } from 'react';

export default function RMARegister() {
  const [rmas, setRmas] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolveStatus, setResolveStatus] = useState('REPLACED');
  const [resolveNote, setResolveNote] = useState('');
  
  const [dispatchingId, setDispatchingId] = useState<number | null>(null);
  const [dispatchSupplierId, setDispatchSupplierId] = useState<number | ''>('');
  const [dispatchTrackingId, setDispatchTrackingId] = useState('');

  useEffect(() => {
    fetchRMAs();
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const data = await (window as any).ipcRenderer.invoke('db-query', 'SELECT * FROM suppliers');
      setSuppliers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRMAs = async () => {
    setLoading(true);
    try {
      const data = await (window as any).ipcRenderer.invoke('db-rma-list');
      setRmas(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleResolve = async (rma_id: number) => {
    try {
      await (window as any).ipcRenderer.invoke('db-rma-resolve', rma_id, resolveStatus, resolveNote);
      setResolvingId(null);
      setResolveNote('');
      fetchRMAs();
    } catch (err: any) {
      console.error(err);
      alert('Error resolving RMA: ' + err.message);
    }
  };

  const handleDispatch = async (rma_id: number) => {
    try {
      await (window as any).ipcRenderer.invoke('db-rma-dispatch', rma_id, dispatchSupplierId || null, dispatchTrackingId);
      setDispatchingId(null);
      fetchRMAs();
    } catch (err: any) {
      console.error(err);
      alert('Error dispatching RMA: ' + err.message);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-yellow-500 font-mono">&gt;_ RMA COMPANY REGISTER</h2>
        <button onClick={fetchRMAs} className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded text-sm text-zinc-300">
          REFRESH
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-left text-zinc-300">
          <thead className="bg-black/50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">RMA #</th>
              <th className="px-4 py-3">Sent On</th>
              <th className="px-4 py-3">Product & Serial</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rmas.map(rma => (
              <React.Fragment key={rma.rma_id}>
                <tr className="hover:bg-zinc-800/50">
                  <td className="px-4 py-3">{rma.rma_id}</td>
                  <td className="px-4 py-3">{new Date(rma.sent_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-white">{rma.brand_name} {rma.model_name}</div>
                    <div className="text-sm font-mono text-zinc-500">{rma.serial_number}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">{rma.reason}</div>
                    {(rma.supplier_name || rma.tracking_id) && (
                      <div className="text-xs text-amber-500/80 mt-1">
                        {rma.supplier_name && <span>To: {rma.supplier_name}</span>}
                        {rma.tracking_id && <span className="ml-2">Track: {rma.tracking_id}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      rma.status === 'SENT' ? 'bg-yellow-500/20 text-yellow-500' :
                      rma.status === 'RECEIVED_BACK' ? 'bg-green-500/20 text-green-500' :
                      'bg-blue-500/20 text-blue-500'
                    }`}>
                      {rma.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    {rma.status === 'SENT' && (
                      <>
                        <button 
                          onClick={() => {
                            setDispatchingId(dispatchingId === rma.rma_id ? null : rma.rma_id);
                            setResolvingId(null);
                            setDispatchSupplierId(rma.supplier_id || '');
                            setDispatchTrackingId(rma.tracking_id || '');
                          }}
                          className="text-blue-500 hover:text-blue-400 font-bold text-sm"
                        >
                          {dispatchingId === rma.rma_id ? 'CANCEL' : 'DISPATCH'}
                        </button>
                        <button 
                          onClick={() => {
                            setResolvingId(resolvingId === rma.rma_id ? null : rma.rma_id);
                            setDispatchingId(null);
                          }}
                          className="text-yellow-500 hover:text-yellow-400 font-bold text-sm"
                        >
                          {resolvingId === rma.rma_id ? 'CANCEL' : 'RESOLVE'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
                
                {dispatchingId === rma.rma_id && (
                  <tr className="bg-blue-900/10">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="flex items-end gap-4 p-4 border border-blue-900/50 rounded bg-zinc-950">
                        <div className="flex-1">
                          <label className="block text-zinc-400 text-xs mb-1">Select Supplier / OEM</label>
                          <select className="w-full bg-black border border-zinc-700 p-2 rounded text-white" value={dispatchSupplierId} onChange={e => setDispatchSupplierId(e.target.value ? Number(e.target.value) : '')}>
                            <option value="">-- Unassigned --</option>
                            {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>)}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-zinc-400 text-xs mb-1">Courier Tracking ID</label>
                          <input 
                            className="w-full bg-black border border-zinc-700 p-2 rounded text-white"
                            placeholder="e.g. DTDC-123456"
                            value={dispatchTrackingId}
                            onChange={e => setDispatchTrackingId(e.target.value)}
                          />
                        </div>
                        <button 
                          onClick={() => handleDispatch(rma.rma_id)}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-bold"
                        >
                          UPDATE DISPATCH
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {resolvingId === rma.rma_id && (
                  <tr className="bg-black/30">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="flex items-end gap-4 p-4 border border-zinc-700 rounded bg-zinc-900">
                        <div className="flex-1">
                          <label className="block text-zinc-400 text-xs mb-1">Company Resolution</label>
                          <select className="w-full bg-black border border-zinc-700 p-2 rounded text-white" value={resolveStatus} onChange={e => setResolveStatus(e.target.value)}>
                            <option value="REPLACED">Replaced (Got a new different unit back)</option>
                            <option value="CREDITED">Credited (Company refunded us)</option>
                            <option value="RECEIVED_BACK">Received Back (Fixed, same serial, put IN_STOCK)</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-zinc-400 text-xs mb-1">Notes</label>
                          <input 
                            className="w-full bg-black border border-zinc-700 p-2 rounded text-white"
                            placeholder="Credit note #, or new serial..."
                            value={resolveNote}
                            onChange={e => setResolveNote(e.target.value)}
                          />
                        </div>
                        <button 
                          onClick={() => handleResolve(rma.rma_id)}
                          className="bg-yellow-600 hover:bg-yellow-500 text-black px-6 py-2 rounded font-bold"
                        >
                          MARK RESOLVED
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {rmas.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  No RMA records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
