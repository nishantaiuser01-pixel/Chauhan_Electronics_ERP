import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Shield, Info, AlertTriangle } from 'lucide-react';

export default function Catalogue() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
  // Form State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [skuCode, setSkuCode] = useState('');
  const [brandName, setBrandName] = useState('');
  const [modelName, setModelName] = useState('');
  const [category, setCategory] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [gstRate, setGstRate] = useState(18);
  const [requiresSerial, setRequiresSerial] = useState(true);
  const [warrantyMonths, setWarrantyMonths] = useState(12);
  const [minRestock, setMinRestock] = useState(5);
  const [counterPrice, setCounterPrice] = useState<number | ''>('');
  const [dealerPrice, setDealerPrice] = useState<number | ''>('');
  const [distributorPrice, setDistributorPrice] = useState<number | ''>('');
  const [looseQty, setLooseQty] = useState(0);
  const [fitmentInput, setFitmentInput] = useState('');
  const [fitmentTags, setFitmentTags] = useState<string[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const db = window.electronAPI;
      // Get all products
      const list = await db.invoke('db-query', 'SELECT * FROM products ORDER BY product_id DESC');
      
      // Get stock and fitment tags for each product
      const enriched = await Promise.all(
        list.map(async (prod: any) => {
          // Count serials In Stock
          const inStockRes = await db.invoke(
            'db-query',
            "SELECT COUNT(*) as count FROM product_instances WHERE product_id = ? AND status = 'IN_STOCK'",
            [prod.product_id]
          );
          
          // Get fitment tags
          const tagsRes = await db.invoke(
            'db-query',
            'SELECT vehicle_tag FROM product_fitment WHERE product_id = ?',
            [prod.product_id]
          );

          return {
            ...prod,
            inStockCount: prod.requires_serial ? inStockRes[0]?.count || 0 : prod.loose_qty,
            fitment_tags: tagsRes.map((r: any) => r.vehicle_tag),
          };
        })
      );

      setProducts(enriched);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingId(null);
    setSkuCode('');
    setBrandName('');
    setModelName('');
    setCategory('');
    setHsnCode('');
    setGstRate(18);
    setRequiresSerial(true);
    setWarrantyMonths(12);
    setMinRestock(5);
    setCounterPrice('');
    setDealerPrice('');
    setDistributorPrice('');
    setLooseQty(0);
    setFitmentInput('');
    setFitmentTags([]);
    setShowModal(true);
  };

  const handleOpenEdit = (prod: any) => {
    setIsEditing(true);
    setEditingId(prod.product_id);
    setSkuCode(prod.sku_code || '');
    setBrandName(prod.brand_name || '');
    setModelName(prod.model_name || '');
    setCategory(prod.category || '');
    setHsnCode(prod.hsn_code || '');
    setGstRate(prod.gst_rate ?? 18);
    setRequiresSerial(prod.requires_serial === 1);
    setWarrantyMonths(prod.warranty_months ?? 12);
    setMinRestock(prod.min_restock_level ?? 5);
    setCounterPrice(prod.counter_price ? prod.counter_price / 100 : '');
    setDealerPrice(prod.dealer_price ? prod.dealer_price / 100 : '');
    setDistributorPrice(prod.distributor_price ? prod.distributor_price / 100 : '');
    setLooseQty(prod.loose_qty || 0);
    setFitmentInput('');
    setFitmentTags(prod.fitment_tags || []);
    setShowModal(true);
  };

  const handleAddFitmentTag = () => {
    if (!fitmentInput.trim()) return;
    if (!fitmentTags.includes(fitmentInput.trim())) {
      setFitmentTags([...fitmentTags, fitmentInput.trim()]);
    }
    setFitmentInput('');
  };

  const handleRemoveFitmentTag = (tagToRemove: string) => {
    setFitmentTags(fitmentTags.filter((t) => t !== tagToRemove));
  };

  const handleDeleteProduct = async (id: number) => {
    const confirm = window.confirm('Are you sure you want to delete this product? All fitment records will be deleted, and associated stock instances may raise foreign key issues.');
    if (!confirm) return;

    try {
      const db = window.electronAPI;
      await db.invoke('db-run', 'DELETE FROM products WHERE product_id = ?', [id]);
      
      // Log audit
      await db.invoke('db-run', 
        'INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?)',
        [1, 'DELETE', 'product', id, `Deleted product ID ${id}`]
      );

      fetchProducts();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const db = window.electronAPI;
      const cPrice = counterPrice ? Math.round(Number(counterPrice) * 100) : null;
      const dPrice = dealerPrice ? Math.round(Number(dealerPrice) * 100) : null;
      const distPrice = distributorPrice ? Math.round(Number(distributorPrice) * 100) : null;

      let productId = editingId;

      if (isEditing && editingId) {
        // Update product
        await db.invoke(
          'db-run',
          `UPDATE products 
           SET sku_code = ?, brand_name = ?, model_name = ?, category = ?, hsn_code = ?, 
               gst_rate = ?, requires_serial = ?, warranty_months = ?, min_restock_level = ?, 
               counter_price = ?, dealer_price = ?, distributor_price = ?, loose_qty = ?
           WHERE product_id = ?`,
          [
            skuCode,
            brandName,
            modelName,
            category,
            hsnCode,
            gstRate,
            requiresSerial ? 1 : 0,
            warrantyMonths,
            minRestock,
            cPrice,
            dPrice,
            distPrice,
            requiresSerial ? 0 : looseQty,
            editingId,
          ]
        );

        // Clear fitment tags and insert new ones
        await db.invoke('db-run', 'DELETE FROM product_fitment WHERE product_id = ?', [editingId]);
        
        // Log Audit
        await db.invoke('db-run', 
          'INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?)',
          [1, 'UPDATE', 'product', editingId, `Updated product model: ${brandName} ${modelName}`]
        );
      } else {
        // Create product
        const res = await db.invoke(
          'db-run',
          `INSERT INTO products 
           (sku_code, brand_name, model_name, category, hsn_code, gst_rate, requires_serial, warranty_months, min_restock_level, counter_price, dealer_price, distributor_price, loose_qty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            skuCode,
            brandName,
            modelName,
            category,
            hsnCode,
            gstRate,
            requiresSerial ? 1 : 0,
            warrantyMonths,
            minRestock,
            cPrice,
            dPrice,
            distPrice,
            requiresSerial ? 0 : looseQty,
          ]
        );
        productId = res.lastInsertRowid;

        // Log Audit
        await db.invoke('db-run', 
          'INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?)',
          [1, 'CREATE', 'product', productId, `Created product model: ${brandName} ${modelName}`]
        );
      }

      // Save fitment tags
      if (productId && fitmentTags.length > 0) {
        const fitmentQueries = fitmentTags.map((tag) => ({
          sql: 'INSERT INTO product_fitment (product_id, vehicle_tag) VALUES (?, ?)',
          params: [productId, tag],
        }));
        await db.invoke('db-transaction', fitmentQueries);
      }

      setShowModal(false);
      fetchProducts();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const filtered = products.filter((prod) => {
    const query = search.toLowerCase();
    const matchesSearch =
      prod.sku_code?.toLowerCase().includes(query) ||
      prod.brand_name?.toLowerCase().includes(query) ||
      prod.model_name?.toLowerCase().includes(query) ||
      prod.category?.toLowerCase().includes(query) ||
      prod.fitment_tags?.some((t: string) => t.toLowerCase().includes(query));

    const matchesCategory = filterCategory === '' || prod.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));

  const formatPaise = (paise?: number) => {
    if (paise == null) return 'N/A';
    return `₹${(paise / 100).toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-amber-400 font-mono uppercase">
            Model Catalogue
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Build and manage the shop master catalogue. Create products to configure pricing tiers and fitment schemas.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center space-x-2 bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold px-4 py-2 rounded text-sm transition-colors"
        >
          <Plus size={16} />
          <span>New Product</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-zinc-900/40 p-4 rounded border border-zinc-800">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by SKU, Brand, Model, Fitment (e.g. Creta)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded px-4 py-2 text-sm text-zinc-300 focus:outline-none focus:border-amber-400"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Grid List */}
      <div className="border border-zinc-800 rounded overflow-x-auto bg-zinc-900/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-mono uppercase text-xs">
            <tr>
              <th className="px-4 py-3">SKU / Barcode</th>
              <th className="px-4 py-3">Brand & Model</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Counter</th>
              <th className="px-4 py-3 text-right">Dealer</th>
              <th className="px-4 py-3 text-right">Distributor</th>
              <th className="px-4 py-3 text-center">Available Stock</th>
              <th className="px-4 py-3 text-center">Serials</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-850 font-mono">
            {filtered.length > 0 ? (
              filtered.map((prod) => {
                const isLowStock = prod.inStockCount <= prod.min_restock_level;
                return (
                  <tr key={prod.product_id} className="hover:bg-zinc-900/30">
                    <td className="px-4 py-3 text-zinc-300 select-all font-semibold">{prod.sku_code}</td>
                    <td className="px-4 py-3">
                      <div className="font-sans font-semibold text-zinc-100">
                        {prod.brand_name} <span className="text-amber-400">{prod.model_name}</span>
                      </div>
                      {prod.fitment_tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {prod.fitment_tags.map((tag: string) => (
                            <span
                              key={tag}
                              className="text-[9px] bg-zinc-800 border border-zinc-750 text-zinc-400 px-1 py-0.2 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 font-sans">{prod.category}</td>
                    <td className="px-4 py-3 text-right text-zinc-200">{formatPaise(prod.counter_price)}</td>
                    <td className="px-4 py-3 text-right text-zinc-200">{formatPaise(prod.dealer_price)}</td>
                    <td className="px-4 py-3 text-right text-zinc-200">{formatPaise(prod.distributor_price)}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold text-xs ${
                          isLowStock
                            ? 'bg-red-950/20 border border-red-500/30 text-red-400 animate-pulse'
                            : 'bg-emerald-950/20 border border-emerald-500/30 text-emerald-400'
                        }`}
                      >
                        {prod.inStockCount} units
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {prod.requires_serial ? (
                        <span className="text-[10px] bg-amber-950/20 border border-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded uppercase font-semibold">
                          Serialised
                        </span>
                      ) : (
                        <span className="text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded uppercase font-semibold">
                          Loose
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleOpenEdit(prod)}
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-amber-400 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.product_id)}
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-zinc-500 italic">
                  No products matched search query. Click 'New Product' to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CRUD Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-zinc-900 border-b border-zinc-850 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold font-mono text-amber-400 uppercase">
                {isEditing ? 'Edit Catalogued Product' : 'Catalogue New Product'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-500 hover:text-zinc-300 font-mono text-sm"
              >
                ✕ CLOSE
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase">SKU / Barcode</label>
                  <input
                    type="text"
                    required
                    placeholder="Scan EAN / UPC code"
                    value={skuCode}
                    onChange={(e) => setSkuCode(e.target.value)}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase">Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Car Audio, Accessories"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase">Brand Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pioneer, Blaupunkt"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase">Model Name / Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DMH-Z5290BT"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase">HSN Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 8527"
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase">GST Rate (%)</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(Number(e.target.value))}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
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
                    value={warrantyMonths}
                    onChange={(e) => setWarrantyMonths(Number(e.target.value))}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase">Min Restock Limit</label>
                  <input
                    type="number"
                    value={minRestock}
                    onChange={(e) => setMinRestock(Number(e.target.value))}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
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
                      value={counterPrice}
                      onChange={(e) => setCounterPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase">Dealer Price</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Fallback: Counter Price"
                      value={dealerPrice}
                      onChange={(e) => setDealerPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase">Distributor Price</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Fallback: Dealer Price"
                      value={distributorPrice}
                      onChange={(e) => setDistributorPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Serials Mode Config */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-850 pt-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="requiresSerial"
                    checked={requiresSerial}
                    onChange={(e) => setRequiresSerial(e.target.checked)}
                    className="w-4 h-4 bg-zinc-900 border-zinc-800 text-amber-400 rounded focus:ring-0"
                  />
                  <label htmlFor="requiresSerial" className="text-xs font-mono text-zinc-300 uppercase cursor-pointer">
                    Requires Unique Serial Numbers
                  </label>
                </div>

                {!requiresSerial && (
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase">Loose Qty On Hand</label>
                    <input
                      type="number"
                      value={looseQty}
                      onChange={(e) => setLooseQty(Number(e.target.value))}
                      className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Fitment tags */}
              <div className="border-t border-zinc-850 pt-4 space-y-2">
                <label className="block text-xs font-mono text-zinc-400 uppercase">Fitment Tags (Cars / Compatibility)</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="e.g. Creta 2024, Universal Double Din"
                    value={fitmentInput}
                    onChange={(e) => setFitmentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFitmentTag();
                      }
                    }}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddFitmentTag}
                    className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-4 py-2 rounded font-mono font-bold"
                  >
                    ADD TAG
                  </button>
                </div>
                {fitmentTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {fitmentTags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center text-xs bg-amber-400/10 border border-amber-400/30 text-amber-400 px-2.5 py-0.5 rounded font-mono"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveFitmentTag(tag)}
                          className="ml-2 hover:text-red-400 font-bold"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500 italic">No compatibility tags added yet.</p>
                )}
              </div>

              {/* Actions */}
              <div className="border-t border-zinc-850 pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold px-4 py-2 rounded font-mono"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold px-5 py-2 rounded font-mono"
                >
                  {isEditing ? 'SAVE CHANGES' : 'CREATE PRODUCT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
