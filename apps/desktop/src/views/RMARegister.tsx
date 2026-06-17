import React, { useState, useEffect } from 'react';

export default function RMARegister() {
  const [rmas, setRmas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolveStatus, setResolveStatus] = useState('REPLACED');
  const [resolveNote, setResolveNote] = useState('');

  useEffect(() => {
    fetchRMAs();
  }, []);

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
                  <td className="px-4 py-3">{rma.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      rma.status === 'SENT' ? 'bg-yellow-500/20 text-yellow-500' :
                      rma.status === 'RECEIVED_BACK' ? 'bg-green-500/20 text-green-500' :
                      'bg-blue-500/20 text-blue-500'
                    }`}>
                      {rma.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {rma.status === 'SENT' && (
                      <button 
                        onClick={() => setResolvingId(resolvingId === rma.rma_id ? null : rma.rma_id)}
                        className="text-yellow-500 hover:text-yellow-400 font-bold text-sm"
                      >
                        {resolvingId === rma.rma_id ? 'CANCEL' : 'RESOLVE'}
                      </button>
                    )}
                  </td>
                </tr>
                
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
