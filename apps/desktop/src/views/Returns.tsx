import React, { useState, useEffect } from 'react';
import { triggerPrint } from '../utils/printUtils';

export default function Returns() {
  const [serial, setSerial] = useState('');
  const [validation, setValidation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Resolution state
  const [reason, setReason] = useState('DEFECTIVE');
  const [resolution, setResolution] = useState('CREDIT_NOTE');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [conditionSealed, setConditionSealed] = useState(false);
  const [replacementSerial, setReplacementSerial] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    // If coming from Warranty checker with hash params
    const match = window.location.hash.match(/serial=([^&]+)/);
    if (match) {
      setSerial(match[1]);
      validateReturn(match[1]);
    }
  }, []);

  const validateReturn = async (s: string) => {
    if (!s) return;
    setLoading(true);
    setValidation(null);
    setErrorMsg('');
    try {
      const res = await (window as any).ipcRenderer.invoke('db-return-validate', s);
      setValidation(res);
      if (res.outcome === 'ALLOW' && res.saleItem) {
        setRefundAmount(res.saleItem.unit_price);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
    setLoading(false);
  };

  const handleProcess = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const payload = {
        serial: validation.instance.serial_number,
        reason,
        resolution,
        refund_amount: refundAmount,
        replacement_serial: replacementSerial,
        condition_sealed: conditionSealed
      };

      const res = await (window as any).ipcRenderer.invoke('db-return-accept', payload);
      if (res.success) {
        setSuccessMsg(`Return processed successfully! New Status: ${res.newStatus}`);
        if (res.creditNoteNo && res.cnId) {
          setSuccessMsg(prev => prev + ` | Issued Credit Note: ${res.creditNoteNo}`);
          triggerPrint('CREDIT_NOTE', res.cnId);
        }
        setValidation(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-yellow-500 mb-6 font-mono">&gt;_ RETURNS & RMA PROCESSING</h2>

      {successMsg ? (
        <div className="bg-green-900 text-green-200 p-6 rounded mb-6 text-xl">
          {successMsg}
          <div className="mt-4">
            <button className="bg-green-700 px-4 py-2 rounded" onClick={() => { setSuccessMsg(''); setSerial(''); }}>Process Another</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-4 mb-8">
            <input 
              className="bg-zinc-900 border border-zinc-700 p-3 rounded flex-1 text-xl font-mono text-white" 
              placeholder="Scan serial number..." 
              value={serial} 
              onChange={e => setSerial(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && validateReturn(serial)}
            />
            <button onClick={() => validateReturn(serial)} disabled={loading} className="bg-yellow-600 hover:bg-yellow-500 text-black px-6 py-3 rounded font-bold">
              {loading ? '...' : 'VALIDATE'}
            </button>
          </div>

          {errorMsg && (
            <div className="bg-red-900 text-red-200 p-4 rounded mb-6">
              {errorMsg}
            </div>
          )}

          {validation && (
            <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-lg font-mono">
              {validation.outcome !== 'ALLOW' ? (
                <div className="text-red-500 text-2xl font-bold text-center py-6">
                  {validation.outcome}: {validation.message}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-y-4 text-lg p-4 bg-black rounded">
                    <div className="text-zinc-400">Sold On:</div>
                    <div className="text-white">{new Date(validation.saleItem.sale_date).toLocaleDateString()}</div>
                    
                    <div className="text-zinc-400">Invoice:</div>
                    <div className="text-white">{validation.saleItem.invoice_no}</div>

                    <div className="text-zinc-400">Price Paid:</div>
                    <div className="text-white">₹{(validation.saleItem.unit_price / 100).toFixed(2)}</div>

                    <div className="text-zinc-400">Customer:</div>
                    <div className="text-white">{validation.saleItem.customer_name} ({validation.saleItem.customer_phone})</div>
                  </div>

                  <div className="border-t border-zinc-800 pt-6 space-y-4">
                    <h3 className="text-xl font-bold text-yellow-500">RESOLUTION</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-zinc-400 mb-2">Return Reason</label>
                        <select className="w-full bg-black border border-zinc-700 p-3 rounded text-white" value={reason} onChange={e => setReason(e.target.value)}>
                          <option value="DEFECTIVE">Defective / DOA</option>
                          <option value="CUSTOMER_CHANGE">Customer Changed Mind</option>
                          <option value="WRONG_ITEM">Wrong Item Sold</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-zinc-400 mb-2">Resolution Action</label>
                        <select className="w-full bg-black border border-zinc-700 p-3 rounded text-white" value={resolution} onChange={e => setResolution(e.target.value)}>
                          <option value="CREDIT_NOTE">Issue Credit Note</option>
                          <option value="REPLACEMENT">Swap with Replacement</option>
                          <option value="SEND_TO_COMPANY">Send to Company (No refund yet)</option>
                        </select>
                      </div>
                    </div>

                    {resolution === 'CREDIT_NOTE' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-zinc-400 mb-2">Refund Amount (₹)</label>
                          <input 
                            type="number"
                            className="w-full bg-black border border-zinc-700 p-3 rounded text-white" 
                            value={refundAmount / 100}
                            onChange={e => setRefundAmount(parseFloat(e.target.value) * 100)}
                          />
                          <div className="text-xs text-zinc-500 mt-1">Requires OWNER PIN if changed</div>
                        </div>
                        <div className="flex items-center mt-6">
                          <label className="flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="w-5 h-5 mr-3 accent-yellow-500" 
                              checked={conditionSealed}
                              onChange={e => setConditionSealed(e.target.checked)}
                            />
                            <span className="text-zinc-300">Item is SEALED/Resaleable (Will return to IN_STOCK)</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {resolution === 'REPLACEMENT' && (
                      <div>
                        <label className="block text-zinc-400 mb-2">Scan New Replacement Serial</label>
                        <input 
                          className="w-full bg-black border border-zinc-700 p-3 rounded text-white" 
                          placeholder="Must be IN_STOCK and same product"
                          value={replacementSerial}
                          onChange={e => setReplacementSerial(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="pt-6">
                      <button 
                        onClick={handleProcess}
                        disabled={loading}
                        className="w-full bg-yellow-600 hover:bg-yellow-500 text-black py-4 rounded font-bold text-xl transition-colors"
                      >
                        {loading ? 'PROCESSING...' : 'CONFIRM RESOLUTION'}
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
