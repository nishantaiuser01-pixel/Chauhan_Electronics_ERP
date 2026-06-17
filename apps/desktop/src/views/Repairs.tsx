import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Search, AlertCircle, CheckCircle, PackagePlus, IndianRupee, Clock, Package } from 'lucide-react';

export default function Repairs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');

  // Modals
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [activeJob, setActiveJob] = useState<any | null>(null);

  // Intake State
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [productName, setProductName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [isWarranty, setIsWarranty] = useState(false);
  const [issueReported, setIssueReported] = useState('');
  const [estCost, setEstCost] = useState<number | ''>('');
  const [advancePaid, setAdvancePaid] = useState<number | ''>('');

  // Workbench State
  const [jobParts, setJobParts] = useState<any[]>([]);
  const [statusInput, setStatusInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  
  // Spare Parts State
  const [partSku, setPartSku] = useState('');
  const [partActiveProd, setPartActiveProd] = useState<any | null>(null);
  const [partSerial, setPartSerial] = useState('');
  const [partQty, setPartQty] = useState<number | ''>(1);
  const [partCost, setPartCost] = useState<number | ''>('');

  // Delivery State
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [finalLabour, setFinalLabour] = useState<number | ''>('');
  const [finalCost, setFinalCost] = useState<number | ''>('');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await window.electronAPI.invoke('get-repair-jobs');
      setJobs(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchParts = async (jobId: number) => {
    try {
      const parts = await window.electronAPI.invoke('get-repair-parts', jobId);
      setJobParts(parts || []);
    } catch (e) {
      console.error(e);
    }
  };

  const openWorkbench = (job: any) => {
    setActiveJob(job);
    setStatusInput(job.status);
    setNotesInput(job.technician_notes || '');
    fetchParts(job.job_id);
    
    // Reset part states
    setPartSku('');
    setPartActiveProd(null);
    setPartSerial('');
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhone || !productName || !issueReported) return;

    try {
      await window.electronAPI.invoke('create-repair-job', {
        customer_phone: customerPhone,
        customer_name: customerName,
        product_name: productName,
        serial_number: serialNumber,
        is_warranty: isWarranty,
        issue_reported: issueReported,
        est_cost: estCost ? Math.round(Number(estCost) * 100) : 0,
        advance_paid: advancePaid ? Math.round(Number(advancePaid) * 100) : 0
      });
      setMessage('Repair Job Intake successful!');
      setShowIntakeModal(false);
      fetchJobs();
      
      // Reset
      setCustomerPhone(''); setCustomerName(''); setProductName('');
      setSerialNumber(''); setIsWarranty(false); setIssueReported('');
      setEstCost(''); setAdvancePaid('');
    } catch (err: any) {
      setMessage(`Failed to intake job: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleUpdateStatus = async () => {
    if (!activeJob) return;
    try {
      await window.electronAPI.invoke('update-repair-status', activeJob.job_id, statusInput, notesInput);
      setMessage('Status updated successfully.');
      fetchJobs();
      // Update local state
      setActiveJob({ ...activeJob, status: statusInput, technician_notes: notesInput });
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSearchPartSku = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partSku.trim()) return;
    try {
      const match = await window.electronAPI.invoke('db-get', 'SELECT * FROM products WHERE sku_code = ?', [partSku.trim()]);
      if (match) {
        setPartActiveProd(match);
      } else {
        alert("SKU not found in catalog.");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJob || !partActiveProd) return;
    if (!partCost || Number(partCost) <= 0) return alert("Enter valid cost");

    try {
      const isSer = partActiveProd.requires_serial === 1;
      let itemPayload: any = {
        product_id: partActiveProd.product_id,
        cost: Math.round(Number(partCost) * 100)
      };

      if (isSer) {
        if (!partSerial.trim()) return alert("Enter Serial Number");
        // Verify serial
        const inst = await window.electronAPI.invoke('db-get', 'SELECT instance_id, status FROM product_instances WHERE serial_number = ?', [partSerial.trim()]);
        if (!inst || inst.status !== 'IN_STOCK') return alert("Serial not in stock.");
        itemPayload.instance_id = inst.instance_id;
      } else {
        if (!partQty || Number(partQty) <= 0) return alert("Enter valid quantity");
        itemPayload.qty = Number(partQty);
      }

      await window.electronAPI.invoke('add-repair-part', activeJob.job_id, isSer ? 'SERIALIZED' : 'LOOSE', itemPayload);
      
      setMessage('Spare part added to job!');
      fetchParts(activeJob.job_id);
      fetchJobs(); // to refresh parts_cost
      
      // Update local active job parts cost
      const addedCost = isSer ? itemPayload.cost : (itemPayload.cost * itemPayload.qty);
      setActiveJob({ ...activeJob, parts_cost: (activeJob.parts_cost || 0) + addedCost });
      
      setPartSku(''); setPartActiveProd(null); setPartSerial(''); setPartCost(''); setPartQty(1);
    } catch (err: any) {
      alert(err.message);
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeliver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJob) return;
    try {
      const fCost = finalCost ? Math.round(Number(finalCost) * 100) : 0;
      const lCost = finalLabour ? Math.round(Number(finalLabour) * 100) : 0;
      await window.electronAPI.invoke('deliver-repair-job', activeJob.job_id, fCost, lCost);
      setMessage('Job delivered successfully.');
      setShowDeliveryModal(false);
      setActiveJob(null);
      fetchJobs();
    } catch (err: any) {
      alert(err.message);
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const formatMoney = (paise: number) => {
    return (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  };

  const filteredJobs = jobs.filter(j => 
    j.job_no.toLowerCase().includes(search.toLowerCase()) || 
    j.customer_phone.includes(search) ||
    (j.customer_name && j.customer_name.toLowerCase().includes(search.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PENDING': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'IN_REPAIR': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'SENT_TO_COMPANY': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'READY': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'DELIVERED': return 'text-zinc-500 bg-zinc-800 border-zinc-700';
      default: return 'text-zinc-300 bg-zinc-800 border-zinc-700';
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center">
            <Wrench className="mr-3" /> Repairs & Services
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Manage intake, repair status, and spare parts inventory.</p>
        </div>
        <button
          onClick={() => setShowIntakeModal(true)}
          className="flex items-center space-x-2 bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold px-4 py-2.5 rounded font-mono text-sm transition-colors"
        >
          <Plus size={16} /> <span>New Job Intake</span>
        </button>
      </div>

      {message && (
        <div className="bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded font-mono text-sm">
          {message}
        </div>
      )}

      {/* Main Board */}
      <div className="flex-1 flex space-x-6 min-h-0">
        
        {/* Left Jobs List */}
        <div className={`flex flex-col bg-zinc-900 border border-zinc-850 rounded flex-shrink-0 transition-all duration-300 ${activeJob ? 'w-1/3' : 'w-full'}`}>
          <div className="p-4 border-b border-zinc-850 flex justify-between items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="text" 
                placeholder="Search Job #, Phone or Name" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded pl-10 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredJobs.length === 0 ? (
              <div className="text-center py-10 text-zinc-600 font-mono text-xs">NO REPAIR JOBS FOUND</div>
            ) : (
              <div className={`grid gap-4 ${activeJob ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                {filteredJobs.map(job => (
                  <div 
                    key={job.job_id} 
                    onClick={() => openWorkbench(job)}
                    className={`bg-zinc-950 border rounded p-4 cursor-pointer hover:border-amber-400/50 transition-colors ${activeJob?.job_id === job.job_id ? 'border-amber-400 shadow-md shadow-amber-400/10' : 'border-zinc-800'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono font-bold text-zinc-200">{job.job_no}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase font-mono tracking-wider ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="text-sm text-zinc-300 font-semibold truncate">{job.product_name}</div>
                    <div className="text-xs text-zinc-500 font-mono mt-1 mb-3">{job.customer_name || 'Walk-in'} • {job.customer_phone}</div>
                    
                    <div className="flex justify-between items-end border-t border-zinc-850 pt-2 mt-2">
                      <div className="text-[10px] text-zinc-600 font-mono flex items-center">
                        <Clock size={10} className="mr-1" /> {job.intake_date?.split(' ')[0]}
                      </div>
                      <div className="text-xs font-mono text-amber-400/80 font-bold">
                        Est: {formatMoney(job.est_cost)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Workbench Panel */}
        {activeJob && (
          <div className="w-2/3 flex flex-col bg-zinc-900 border border-zinc-850 rounded">
            {/* Workbench Header */}
            <div className="p-5 border-b border-zinc-850 bg-zinc-950/20 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold font-mono text-amber-400">{activeJob.job_no}</h2>
                <div className="text-sm text-zinc-300 mt-1"><span className="text-zinc-500">Product:</span> {activeJob.product_name} <span className="text-zinc-500 ml-2">S/N:</span> {activeJob.serial_number || 'N/A'}</div>
                <div className="text-xs text-zinc-400 mt-1"><span className="text-zinc-500">Customer:</span> {activeJob.customer_name || 'Walk-in'} ({activeJob.customer_phone})</div>
                {activeJob.is_warranty === 1 && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-indigo-900/40 border border-indigo-500/30 text-indigo-400 text-[10px] uppercase font-bold tracking-wider rounded">Warranty Claim</span>
                )}
              </div>
              <button onClick={() => setActiveJob(null)} className="text-zinc-500 hover:text-zinc-300">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Issue & Status */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">Reported Issue</h3>
                  <div className="bg-zinc-950 p-3 rounded border border-zinc-850 text-sm text-zinc-300 min-h-[80px]">
                    {activeJob.issue_reported}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Update Status</h3>
                  <div className="flex space-x-2">
                    <select 
                      value={statusInput} 
                      onChange={(e) => setStatusInput(e.target.value)}
                      disabled={activeJob.status === 'DELIVERED'}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-amber-400 disabled:opacity-50"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="IN_REPAIR">IN REPAIR</option>
                      <option value="SENT_TO_COMPANY">SENT TO COMPANY</option>
                      <option value="READY">READY FOR DELIVERY</option>
                      <option value="DELIVERED">DELIVERED</option>
                    </select>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Technician Notes..."
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    disabled={activeJob.status === 'DELIVERED'}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400 disabled:opacity-50"
                  />
                  {activeJob.status !== 'DELIVERED' && (
                    <button 
                      onClick={handleUpdateStatus}
                      className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded text-xs font-mono font-bold transition-colors"
                    >
                      SAVE STATUS & NOTES
                    </button>
                  )}
                </div>
              </div>

              {/* Spare Parts Consumed */}
              <div className="border-t border-zinc-850 pt-6">
                <h3 className="text-xs font-mono text-amber-400 uppercase tracking-widest mb-4 flex items-center">
                  <Package size={14} className="mr-2" /> Consumed Spare Parts
                </h3>

                {activeJob.status !== 'DELIVERED' && (
                  <div className="bg-zinc-950/50 p-4 rounded border border-zinc-800 mb-4">
                    <form onSubmit={partActiveProd ? handleAddPart : handleSearchPartSku} className="space-y-3">
                      {!partActiveProd ? (
                        <div className="flex space-x-2">
                          <input 
                            type="text" 
                            placeholder="Scan Part SKU..."
                            value={partSku}
                            onChange={(e) => setPartSku(e.target.value)}
                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-amber-400"
                          />
                          <button type="submit" className="bg-zinc-800 px-4 py-2 rounded font-mono text-xs font-bold text-zinc-300">LOOKUP</button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-sm font-bold text-zinc-200">
                            <span>{partActiveProd.brand_name} {partActiveProd.model_name}</span>
                            <button type="button" onClick={() => setPartActiveProd(null)} className="text-zinc-500 text-xs">✕ Cancel</button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            {partActiveProd.requires_serial === 1 ? (
                              <div>
                                <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Serial Number</label>
                                <input 
                                  type="text" 
                                  required
                                  value={partSerial}
                                  onChange={(e) => setPartSerial(e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 font-mono"
                                />
                              </div>
                            ) : (
                              <div>
                                <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Quantity</label>
                                <input 
                                  type="number" 
                                  required min="1"
                                  value={partQty}
                                  onChange={(e) => setPartQty(e.target.value === '' ? '' : Number(e.target.value))}
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 font-mono"
                                />
                              </div>
                            )}
                            <div>
                              <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Price per Unit (₹)</label>
                              <input 
                                type="number" 
                                required
                                value={partCost}
                                onChange={(e) => setPartCost(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 font-mono"
                              />
                            </div>
                          </div>
                          <button type="submit" className="w-full bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold px-4 py-2 rounded text-xs font-mono transition-colors">
                            ATTACH & CONSUME PART
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                )}

                <div className="border border-zinc-800 rounded overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-950 text-zinc-500 text-[10px] uppercase font-mono tracking-wider border-b border-zinc-800">
                        <th className="p-2 pl-4 font-normal">Part</th>
                        <th className="p-2 font-normal">Qty</th>
                        <th className="p-2 font-normal text-right pr-4">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-mono divide-y divide-zinc-850/50 bg-zinc-900/30">
                      {jobParts.length === 0 ? (
                        <tr><td colSpan={3} className="p-4 text-center text-zinc-600">No parts consumed</td></tr>
                      ) : (
                        jobParts.map(p => (
                          <tr key={p.id}>
                            <td className="p-2 pl-4 text-zinc-300">{p.brand_name} {p.model_name}</td>
                            <td className="p-2 text-zinc-400">{p.qty}</td>
                            <td className="p-2 pr-4 text-right text-red-400">{formatMoney(p.cost)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Delivery Action */}
              {activeJob.status !== 'DELIVERED' && (
                <div className="border-t border-zinc-850 pt-6 flex justify-end">
                  <button 
                    onClick={() => setShowDeliveryModal(true)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold px-6 py-3 rounded font-mono text-sm tracking-wider flex items-center"
                  >
                    <CheckCircle size={16} className="mr-2" /> DELIVER JOB & BILL
                  </button>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* INTAKE MODAL */}
      {showIntakeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col">
            <h3 className="text-lg font-bold text-amber-400 font-mono uppercase tracking-wider mb-6 flex items-center">
              <PackagePlus className="mr-2" size={18} /> New Repair Intake
            </h3>
            
            <form onSubmit={handleCreateJob} className="space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Customer Phone *</label>
                  <input type="text" required value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-amber-400 font-mono" placeholder="10 digits"/>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Customer Name</label>
                  <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-amber-400"/>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Product Description *</label>
                <input type="text" required value={productName} onChange={e => setProductName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-amber-400" placeholder="e.g. Pioneer Touch Stereo"/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Serial Number (Optional)</label>
                  <input type="text" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-amber-400 font-mono" placeholder="Scan or Type"/>
                </div>
                <div className="flex items-center mt-6">
                  <input type="checkbox" id="wty" checked={isWarranty} onChange={e => setIsWarranty(e.target.checked)} className="mr-2 accent-amber-400"/>
                  <label htmlFor="wty" className="text-sm text-zinc-300 font-mono cursor-pointer">Under Warranty?</label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Reported Issue *</label>
                <textarea required value={issueReported} onChange={e => setIssueReported(e.target.value)} rows={3} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-amber-400" placeholder="Describe the problem..."></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Estimated Cost (₹)</label>
                  <input type="number" value={estCost} onChange={e => setEstCost(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-amber-400 font-mono" placeholder="e.g. 500"/>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Advance Paid (₹)</label>
                  <input type="number" value={advancePaid} onChange={e => setAdvancePaid(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-amber-400 font-mono" placeholder="e.g. 200"/>
                </div>
              </div>

              <div className="pt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowIntakeModal(false)} className="px-4 py-2 text-zinc-400 hover:text-zinc-200 text-sm font-mono uppercase transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold rounded text-sm font-mono uppercase tracking-wide transition-colors">Create Job</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELIVERY MODAL */}
      {showDeliveryModal && activeJob && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg shadow-2xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-emerald-400 font-mono uppercase tracking-wider mb-2 flex items-center">
              <CheckCircle className="mr-2" size={18} /> Deliver Job
            </h3>
            <div className="bg-zinc-950 p-3 rounded border border-zinc-800 mb-4 font-mono text-xs text-zinc-300 space-y-1">
              <div className="flex justify-between"><span>Advance Paid:</span> <span className="text-emerald-400">{formatMoney(activeJob.advance_paid)}</span></div>
              <div className="flex justify-between"><span>Parts Cost:</span> <span className="text-red-400">{formatMoney(activeJob.parts_cost || 0)}</span></div>
            </div>
            
            <form onSubmit={handleDeliver} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Labour Charge (₹)</label>
                <input type="number" required value={finalLabour} onChange={e => setFinalLabour(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 font-mono focus:border-emerald-400"/>
              </div>
              
              <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Final Total Bill Amount (₹)</label>
                <input type="number" required value={finalCost} onChange={e => setFinalCost(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 font-mono focus:border-emerald-400" placeholder="Total including parts & labour"/>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowDeliveryModal(false)} className="px-4 py-2 text-zinc-400 text-sm font-mono uppercase">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold rounded text-sm font-mono uppercase tracking-wide">Confirm Delivery</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
