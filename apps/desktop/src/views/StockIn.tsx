import React, { useState, useEffect, useRef } from 'react';
import { Barcode as BarcodeIcon, CheckCircle, PackagePlus, AlertCircle, Printer, Plus } from 'lucide-react';
// Mock Barcode component since we cannot install the package offline
const Barcode = ({ value, width, height, fontSize }: any) => (
  <div className="border-4 border-black p-2 flex flex-col items-center justify-center bg-white w-full h-full">
    <div className="flex-1 w-full flex overflow-hidden opacity-50 bg-[repeating-linear-gradient(90deg,#000_0px,#000_2px,transparent_2px,transparent_4px,#000_4px,#000_5px,transparent_5px,transparent_8px)]" />
    <span className="font-mono font-bold mt-1 text-black" style={{ fontSize: fontSize || 12 }}>{value}</span>
  </div>
);
export default function StockIn() {
  const [activeTab, setActiveTab] = useState<'scan' | 'label'>('scan');
  
  // SCAN INTAKE STATES
  const [skuQuery, setSkuQuery] = useState('');
  const [activeProduct, setActiveProduct] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Serial loop states
  const [serials, setSerials] = useState<string[]>([]);
  const [serialInput, setSerialInput] = useState('');
  const [batchNo, setBatchNo] = useState('B1');
  const [purchaseCost, setPurchaseCost] = useState<number | ''>('');
  
  // Batch Metadata
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  
  // Loose item states
  const [looseQtyInput, setLooseQtyInput] = useState<number | ''>('');
  
  // NEW PRODUCT PROMPT STATE
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newHsn, setNewHsn] = useState('');
  const [newGstRate, setNewGstRate] = useState(18);
  const [newRequiresSerial, setNewRequiresSerial] = useState(true);
  const [newWarranty, setNewWarranty] = useState(12);
  const [newMinRestock, setNewMinRestock] = useState(5);
  const [newCounterPrice, setNewCounterPrice] = useState<number | ''>('');
  const [newDealerPrice, setNewDealerPrice] = useState<number | ''>('');
  const [newDistributorPrice, setNewDistributorPrice] = useState<number | ''>('');
  const [newFitmentTags, setNewFitmentTags] = useState<string[]>([]);
  const [newFitmentInput, setNewFitmentInput] = useState('');

  // LABEL GENERATOR STATES
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selectedProdForLabel, setSelectedProdForLabel] = useState<any | null>(null);
  const [labelQty, setLabelQty] = useState(1);

  const skuInputRef = useRef<HTMLInputElement>(null);
  const serialInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (skuInputRef.current) {
      skuInputRef.current.focus();
    }
    fetchProducts();
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await window.electronAPI.invoke('get-suppliers');
      setSuppliersList(res || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    try {
      const db = window.electronAPI;
      const list = await db.invoke('db-query', 'SELECT * FROM products ORDER BY brand_name ASC');
      setAllProducts(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSkuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuQuery.trim()) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const db = window.electronAPI;
      const matched = await db.invoke('db-get', 'SELECT * FROM products WHERE sku_code = ?', [skuQuery.trim()]);
      
      if (matched) {
        setActiveProduct(matched);
        setSerials([]);
        setSerialInput('');
        setPurchaseCost('');
        // Focus serial input in next tick
        setTimeout(() => {
          if (serialInputRef.current) serialInputRef.current.focus();
        }, 100);
      } else {
        // Not found, open new product creation pre-filled
        setNewSku(skuQuery.trim());
        setNewBrand('');
        setNewModel('');
        setNewCategory('');
        setNewHsn('');
        setNewGstRate(18);
        setNewRequiresSerial(true);
        setNewWarranty(12);
        setNewMinRestock(5);
        setNewCounterPrice('');
        setNewDealerPrice('');
        setNewDistributorPrice('');
        setNewFitmentTags([]);
        setShowNewProductModal(true);
      }
    } catch (err: any) {
      setErrorMessage(`Error searching SKU: ${err.message}`);
    }
  };

  // Add Serial during scan loop
  const handleAddSerial = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSerial = serialInput.trim();
    if (!cleanSerial) return;

    setErrorMessage(null);

    // Prevent duplicate in current session list
    if (serials.includes(cleanSerial)) {
      setErrorMessage(`Serial '${cleanSerial}' has already been scanned in this batch.`);
      setSerialInput('');
      return;
    }

    try {
      const db = window.electronAPI;
      // Check database uniqueness
      const existing = await db.invoke('db-get', 'SELECT * FROM product_instances WHERE serial_number = ?', [cleanSerial]);
      
      if (existing) {
        setErrorMessage(`Serial '${cleanSerial}' is already registered in the system (status: ${existing.status}).`);
        setSerialInput('');
        return;
      }

      // Add to session list
      setSerials([cleanSerial, ...serials]);
      setSerialInput('');
    } catch (err: any) {
      setErrorMessage(`Verification failed: ${err.message}`);
    }
  };

  const handleRemoveSerial = (idx: number) => {
    setSerials(serials.filter((_, i) => i !== idx));
  };

  const handleSaveNewProductFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const db = window.electronAPI;
      const cPrice = newCounterPrice ? Math.round(Number(newCounterPrice) * 100) : null;
      const dPrice = newDealerPrice ? Math.round(Number(newDealerPrice) * 100) : null;
      const distPrice = newDistributorPrice ? Math.round(Number(newDistributorPrice) * 100) : null;

      const newId = await db.invoke('create-product', {
        sku_code: newSku,
        brand_name: newBrand,
        model_name: newModel,
        category: newCategory,
        hsn_code: newHsn,
        gst_rate: newGstRate,
        requires_serial: newRequiresSerial,
        warranty_months: newWarranty,
        min_restock_level: newMinRestock,
        counter_price: cPrice,
        dealer_price: dPrice,
        distributor_price: distPrice,
        fitment_tags: newFitmentTags
      });

      // Close modal and set active product
      setShowNewProductModal(false);
      
      const newlyCreated = await db.invoke('db-get', 'SELECT * FROM products WHERE product_id = ?', [newId]);
      setActiveProduct(newlyCreated);
      setSerials([]);
      setSerialInput('');
      setPurchaseCost('');
      fetchProducts();

      setSuccessMessage(`Product '${newBrand} ${newModel}' created successfully. Proceeding with stock intake.`);
      
      setTimeout(() => {
        if (serialInputRef.current) serialInputRef.current.focus();
      }, 100);
    } catch (err: any) {
      alert(`Failed to save product: ${err.message}`);
    }
  };

  const handleAddFitmentTag = () => {
    if (!newFitmentInput.trim()) return;
    if (!newFitmentTags.includes(newFitmentInput.trim())) {
      setNewFitmentTags([...newFitmentTags, newFitmentInput.trim()]);
    }
    setNewFitmentInput('');
  };

  // Submit Serialized intake to DB
  const handleSubmitSerializedIntake = async () => {
    if (serials.length === 0) {
      setErrorMessage('Scan at least one serial number to commit intake.');
      return;
    }
    if (!purchaseCost || Number(purchaseCost) <= 0) {
      setErrorMessage('Please enter a valid purchase cost per unit.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const db = window.electronAPI;
      const totalCostPaise = Math.round(Number(purchaseCost) * 100) * serials.length;
      
      const payload = {
        supplier_id: supplierId === '' ? null : supplierId,
        invoice_ref: invoiceRef || 'INTAKE',
        total_cost_paise: totalCostPaise,
        type: 'SERIALIZED',
        items: serials.map(sn => ({
          product_id: activeProduct.product_id,
          serial_number: sn,
          batch_number: batchNo,
          purchase_cost: Math.round(Number(purchaseCost) * 100)
        }))
      };

      const grnId = await db.invoke('commit-intake-batch', payload);

      setSuccessMessage(`Successfully received ${serials.length} units into stock (GRN #${grnId}).`);
      setActiveProduct(null);
      setSerials([]);
      setSkuQuery('');
      
      setTimeout(() => {
        if (skuInputRef.current) skuInputRef.current.focus();
      }, 100);
    } catch (err: any) {
      setErrorMessage(`Intake transaction failed: ${err.message}`);
    }
  };

  // Submit Loose stock intake to DB
  const handleSubmitLooseIntake = async () => {
    if (!looseQtyInput || Number(looseQtyInput) <= 0) {
      setErrorMessage('Please enter a valid quantity.');
      return;
    }
    if (!purchaseCost || Number(purchaseCost) <= 0) {
      setErrorMessage('Please enter a valid purchase cost per unit.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const db = window.electronAPI;
      const totalCostPaise = Math.round(Number(purchaseCost) * 100) * Number(looseQtyInput);

      const payload = {
        supplier_id: supplierId === '' ? null : supplierId,
        invoice_ref: invoiceRef || 'INTAKE',
        total_cost_paise: totalCostPaise,
        type: 'LOOSE',
        items: [{
          product_id: activeProduct.product_id,
          qty: Number(looseQtyInput)
        }]
      };

      const grnId = await db.invoke('commit-intake-batch', payload);

      setSuccessMessage(`Successfully added ${looseQtyInput} loose units to inventory (GRN #${grnId}).`);
      setActiveProduct(null);
      setLooseQtyInput('');
      setSkuQuery('');
      
      setTimeout(() => {
        if (skuInputRef.current) skuInputRef.current.focus();
      }, 100);
    } catch (err: any) {
      setErrorMessage(`Intake transaction failed: ${err.message}`);
    }
  };

  const handleCancelIntake = () => {
    setActiveProduct(null);
    setSerials([]);
    setSkuQuery('');
    setErrorMessage(null);
    setSuccessMessage(null);
    setTimeout(() => {
      if (skuInputRef.current) skuInputRef.current.focus();
    }, 100);
  };

  const formatPrice = (paise?: number) => {
    if (paise == null) return 'N/A';
    return `₹${(paise / 100).toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('scan')}
            className={`text-lg font-bold font-mono uppercase tracking-wider pb-2 border-b-2 transition-all ${
              activeTab === 'scan' ? 'border-amber-400 text-amber-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Goods-Inward Intake
          </button>
          <button
            onClick={() => setActiveTab('label')}
            className={`text-lg font-bold font-mono uppercase tracking-wider pb-2 border-b-2 transition-all ${
              activeTab === 'label' ? 'border-amber-400 text-amber-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Barcode Label Generator
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 rounded text-sm font-mono flex items-center space-x-2">
          <CheckCircle size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-950/20 border border-red-500/30 text-red-400 rounded text-sm font-mono flex items-center space-x-2">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {activeTab === 'scan' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Scan Input Panel */}
          <div className="lg:col-span-1 border border-zinc-800 bg-zinc-900/10 p-6 rounded-lg space-y-6 self-start">
            <div className="space-y-2">
              <h2 className="text-md font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center space-x-2">
                <BarcodeIcon size={18} />
                <span>Scan Barcode SKU</span>
              </h2>
              <p className="text-xs text-zinc-500">
                Type or scan a manufacturer product SKU/barcode (wedge keyboard). Press Enter to proceed.
              </p>
            </div>

            <form onSubmit={handleSkuSubmit} className="space-y-4">
              <input
                type="text"
                ref={skuInputRef}
                disabled={activeProduct !== null}
                placeholder="Click here & scan barcode..."
                value={skuQuery}
                onChange={(e) => setSkuQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 disabled:bg-zinc-900/30 disabled:border-zinc-850 disabled:text-zinc-500 rounded px-4 py-3 text-sm font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              />
              {!activeProduct && (
                <button
                  type="submit"
                  className="w-full bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold px-4 py-2.5 rounded text-sm transition-colors font-mono"
                >
                  LOOKUP BARCODE
                </button>
              )}
            </form>

            {activeProduct && (
              <div className="border-t border-zinc-850 pt-4 space-y-4">
                <div className="bg-zinc-900/40 p-4 rounded border border-zinc-850">
                  <span className="text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded uppercase font-semibold">
                    Product Matched
                  </span>
                  <h3 className="font-bold text-zinc-100 mt-2 font-sans">
                    {activeProduct.brand_name} {activeProduct.model_name}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-mono text-zinc-400">
                    <div>
                      <span className="text-zinc-500">SKU:</span> {activeProduct.sku_code}
                    </div>
                    <div>
                      <span className="text-zinc-500">GST:</span> {activeProduct.gst_rate}%
                    </div>
                    <div>
                      <span className="text-zinc-500">Warranty:</span> {activeProduct.warranty_months} Mo
                    </div>
                    <div>
                      <span className="text-zinc-500">Mode:</span> {activeProduct.requires_serial ? 'Serialised' : 'Loose'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCancelIntake}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold px-4 py-2 rounded text-xs transition-colors font-mono"
                >
                  CANCEL SESSION
                </button>
              </div>
            )}
          </div>

          {/* Right Serial Capture / Quantity Intake panel */}
          <div className="lg:col-span-2 border border-zinc-800 bg-zinc-900/10 p-6 rounded-lg">
            {!activeProduct ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-sm italic">
                <BarcodeIcon size={48} className="text-zinc-800 mb-4" />
                <p>No active scanning session.</p>
                <p className="text-xs text-zinc-600 mt-1">Scan a barcode on the left to start receiving inventory.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Supplier Linkage */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-950 p-4 rounded border border-zinc-900">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase">Supplier (Optional)</label>
                    <select
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value === '' ? '' : Number(e.target.value))}
                      className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
                    >
                      <option value="">-- No Supplier (Cash) --</option>
                      {suppliersList.map(s => (
                        <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase">Supplier Invoice Ref</label>
                    <input
                      type="text"
                      placeholder="e.g. INV-1002"
                      value={invoiceRef}
                      onChange={(e) => setInvoiceRef(e.target.value)}
                      className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {activeProduct.requires_serial ? (
                  // SERIALIZED LOOP INTAKE
                  <div className="space-y-6">
                    <div className="flex justify-between items-start border-b border-zinc-850 pb-3">
                  <div>
                    <h2 className="text-md font-bold font-mono text-amber-400 uppercase tracking-wider">
                      Capture Serial Numbers
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Scan each unit's unique serial number. Duplicate inputs will be blocked.
                    </p>
                  </div>
                  <span className="text-xs bg-amber-400/10 border border-amber-400/20 text-amber-400 px-2.5 py-1 rounded font-mono font-bold">
                    {serials.length} UNITS SCANNED
                  </span>
                </div>

                {/* Batch Config */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-950 p-4 rounded border border-zinc-900">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase">Batch / Lot Number</label>
                    <input
                      type="text"
                      value={batchNo}
                      onChange={(e) => setBatchNo(e.target.value)}
                      className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase">Purchase Cost per Unit (INR)</label>
                    <input
                      type="number"
                      placeholder="e.g. 18500"
                      value={purchaseCost}
                      onChange={(e) => setPurchaseCost(e.target.value === '' ? '' : Number(e.target.value))}
                      className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Serial Scan Input */}
                <form onSubmit={handleAddSerial} className="flex space-x-2">
                  <input
                    type="text"
                    ref={serialInputRef}
                    placeholder="Scan next unit serial number..."
                    value={serialInput}
                    onChange={(e) => setSerialInput(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-850 rounded px-4 py-2.5 text-sm font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 px-5 py-2.5 rounded font-mono font-bold text-sm"
                  >
                    ADD
                  </button>
                </form>

                {/* Scanned Serials List */}
                <div className="space-y-2">
                  <span className="block text-xs font-mono text-zinc-400 uppercase">Scanned units in this batch:</span>
                  <div className="border border-zinc-850 rounded overflow-hidden">
                    <div className="bg-zinc-950 max-h-56 overflow-y-auto divide-y divide-zinc-900 pr-1">
                      {serials.length > 0 ? (
                        serials.map((sn, idx) => (
                          <div key={sn} className="flex justify-between items-center px-4 py-2.5 font-mono text-xs text-zinc-200 hover:bg-zinc-900/40">
                            <span>#{serials.length - idx}. {sn}</span>
                            <button
                              onClick={() => handleRemoveSerial(idx)}
                              className="text-zinc-500 hover:text-red-400 font-bold px-2 py-0.5 rounded text-xs transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-xs text-zinc-500 italic">
                          No serial numbers scanned yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Commit Intake */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSubmitSerializedIntake}
                    className="flex items-center space-x-2 bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold px-6 py-2.5 rounded font-mono text-sm shadow-lg shadow-amber-400/10 transition-colors"
                  >
                    <PackagePlus size={16} />
                    <span>COMMIT INTAKE BATCH</span>
                  </button>
                </div>
              </div>
            ) : (
              // LOOSE ITEM INTAKE
              <div className="space-y-6">
                <div className="border-b border-zinc-850 pb-3">
                  <h2 className="text-md font-bold font-mono text-amber-400 uppercase tracking-wider">
                    Add Loose Inventory Stock
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    For non-serialized bulk accessories (fuses, wire coils, LED components).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase">Quantity to Add</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 100"
                      value={looseQtyInput}
                      onChange={(e) => setLooseQtyInput(e.target.value === '' ? '' : Number(e.target.value))}
                      className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase">Purchase Cost per Unit (INR)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 120"
                      value={purchaseCost}
                      onChange={(e) => setPurchaseCost(e.target.value === '' ? '' : Number(e.target.value))}
                      className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleSubmitLooseIntake}
                      className="w-full flex items-center justify-center space-x-2 bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold px-4 py-2.5 rounded font-mono text-sm shadow-lg shadow-amber-400/10 transition-colors"
                    >
                      <PackagePlus size={16} />
                      <span>ADD STOCK</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
            </div>
          )}
        </div>
      </div>
    ) : (
      // BARCODE LABEL GENERATOR TAB
        <div className="border border-zinc-800 bg-zinc-900/10 p-6 rounded-lg space-y-6">
          <div>
            <h2 className="text-md font-bold font-mono text-amber-400 uppercase tracking-wider">
              SKU Barcode Label Generator
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select a catalogued product lacking a manufacturer barcode to generate a thermal SKU label preview.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase">Select Catalogue Product</label>
                <select
                  onChange={(e) => {
                    const prod = allProducts.find((p) => p.product_id === Number(e.target.value));
                    setSelectedProdForLabel(prod || null);
                  }}
                  className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="">-- Choose Product --</option>
                  {allProducts.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.brand_name} {p.model_name} ({p.sku_code})
                    </option>
                  ))}
                </select>
              </div>

              {selectedProdForLabel && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase">Label Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={labelQty}
                      onChange={(e) => setLabelQty(Number(e.target.value))}
                      className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => window.open(`/#/print/LABEL/${selectedProdForLabel.product_id}?qty=${labelQty}`, '_blank', 'width=400,height=400')}
                      className="w-full flex items-center justify-center space-x-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-bold px-4 py-2 rounded text-sm transition-colors font-mono"
                    >
                      <Printer size={16} />
                      <span>PRINT LABELS</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {selectedProdForLabel ? (
              <div className="flex flex-col items-center p-6 bg-white text-black rounded border-2 border-zinc-200 max-w-xs mx-auto shadow-md">
                <span className="text-[10px] font-bold tracking-widest font-mono uppercase text-zinc-500">Chauhan Electronics</span>
                <span className="font-bold text-xs mt-1 text-center font-sans">
                  {selectedProdForLabel.brand_name} {selectedProdForLabel.model_name}
                </span>

                {/* Barcode Block */}
                <div className="my-2 flex flex-col items-center">
                  <Barcode value={selectedProdForLabel.sku_code} format="CODE128" width={1.5} height={40} fontSize={12} margin={0} background="#ffffff" lineColor="#000000" />
                </div>

                <div className="flex justify-between w-full text-[10px] font-bold font-mono border-t border-zinc-200 pt-2">
                  <span>Wty: {selectedProdForLabel.warranty_months} Months</span>
                  <span>{formatPrice(selectedProdForLabel.counter_price)}</span>
                </div>
              </div>
            ) : (
              <div className="border border-zinc-800 border-dashed rounded-lg p-12 text-center text-zinc-500 italic text-sm">
                Choose a product to preview the thermal label sticker (50mm x 25mm).
              </div>
            )}
          </div>
        </div>
      )}

      {/* NEW PRODUCT POPMODAL FROM INTAKE */}
      {showNewProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-zinc-900 border-b border-zinc-850 px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold font-mono text-amber-400 uppercase flex items-center space-x-2">
                  <AlertCircle size={18} className="text-amber-500 animate-bounce" />
                  <span>SKU Not Found - Create Product</span>
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                  Barcode {newSku} is unrecognized. Populate the catalog detail below to save and proceed.
                </p>
              </div>
              <button
                onClick={() => setShowNewProductModal(false)}
                className="text-zinc-500 hover:text-zinc-300 font-mono text-sm"
              >
                ✕ CANCEL
              </button>
            </div>

            <form onSubmit={handleSaveNewProductFromModal} className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase">SKU / Barcode (Locked)</label>
                  <input
                    type="text"
                    disabled
                    value={newSku}
                    className="mt-1 w-full bg-zinc-900/50 border border-zinc-850 rounded px-3 py-2 text-zinc-400 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase">Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Car Audio"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="mt-1 w-full bg-zinc-905 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase">Brand Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pioneer"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    className="mt-1 w-full bg-zinc-905 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase">Model Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DMH-Z5290BT"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="mt-1 w-full bg-zinc-905 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase">HSN Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 8527"
                    value={newHsn}
                    onChange={(e) => setNewHsn(e.target.value)}
                    className="mt-1 w-full bg-zinc-905 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase">GST Rate (%)</label>
                  <select
                    value={newGstRate}
                    onChange={(e) => setNewGstRate(Number(e.target.value))}
                    className="mt-1 w-full bg-zinc-905 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                  >
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase">Warranty (Months)</label>
                  <input
                    type="number"
                    value={newWarranty}
                    onChange={(e) => setNewWarranty(Number(e.target.value))}
                    className="mt-1 w-full bg-zinc-905 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase">Min Restock Limit</label>
                  <input
                    type="number"
                    value={newMinRestock}
                    onChange={(e) => setNewMinRestock(Number(e.target.value))}
                    className="mt-1 w-full bg-zinc-905 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              {/* Pricing Tiers */}
              <div className="border border-zinc-800/80 p-4 rounded bg-zinc-900/10 space-y-3">
                <span className="block text-xs font-mono text-amber-400 uppercase tracking-wider">Pricing Tiers (INR Rupees)</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase">Counter Price (Retail)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newCounterPrice}
                      onChange={(e) => setNewCounterPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="mt-1 w-full bg-zinc-905 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase">Dealer Price</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Fallback: Counter"
                      value={newDealerPrice}
                      onChange={(e) => setNewDealerPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="mt-1 w-full bg-zinc-905 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase">Distributor Price</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Fallback: Dealer"
                      value={newDistributorPrice}
                      onChange={(e) => setNewDistributorPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="mt-1 w-full bg-zinc-905 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Serials Mode Config */}
              <div className="flex items-center space-x-3 border-t border-zinc-850 pt-4">
                <input
                  type="checkbox"
                  id="newRequiresSerial"
                  checked={newRequiresSerial}
                  onChange={(e) => setNewRequiresSerial(e.target.checked)}
                  className="w-4 h-4 bg-zinc-900 border-zinc-800 text-amber-400 rounded focus:ring-0"
                />
                <label htmlFor="newRequiresSerial" className="text-xs font-mono text-zinc-300 uppercase cursor-pointer">
                  Requires Unique Serial Numbers
                </label>
              </div>

              {/* Fitment tags */}
              <div className="border-t border-zinc-850 pt-4 space-y-2">
                <label className="block text-xs font-mono text-zinc-400 uppercase">Fitment Tags (Cars / Compatibility)</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="e.g. Creta 2024, Universal Double Din"
                    value={newFitmentInput}
                    onChange={(e) => setNewFitmentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFitmentTag();
                      }
                    }}
                    className="flex-1 bg-zinc-905 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddFitmentTag}
                    className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-4 py-2 rounded font-mono font-bold"
                  >
                    ADD TAG
                  </button>
                </div>
                {newFitmentTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {newFitmentTags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center text-xs bg-amber-400/10 border border-amber-400/30 text-amber-400 px-2.5 py-0.5 rounded font-mono"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="border-t border-zinc-850 pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewProductModal(false)}
                  className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-350 font-bold px-4 py-2 rounded font-mono"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold px-5 py-2 rounded font-mono"
                >
                  SAVE & CONTINUE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
