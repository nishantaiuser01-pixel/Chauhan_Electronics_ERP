import React, { useState, useEffect, useRef } from 'react';
import { Barcode, Search, UserPlus, ShoppingCart, Percent, ShieldCheck, CreditCard, Receipt, Trash2, Edit3, X, Printer, CheckCircle, AlertTriangle } from 'lucide-react';
import { triggerPrint } from '../utils/printUtils';

interface CartItem {
  id: string; // unique cart item id (e.g. sku + '-' + (serial || 'loose') + '-' + random)
  product: any;
  instance: any | null; // specific serial instance or null
  quantity: number;
  price: number; // paise
  discount: number; // paise per unit
}

export default function Sales() {
  // Navigation & defaults
  const [shopSettings, setShopSettings] = useState<any>({
    shop_name: 'Chauhan Electronics',
    address: '12, SP Road, Bengaluru, Karnataka - 560002',
    gstin: '29ABCDE1234F1Z5',
    state_code: '29',
    invoice_prefix: 'CE/26/',
    next_invoice_no: '1001'
  });

  // State Management
  const [customerPhone, setCustomerPhone] = useState('');
  const [activeCustomer, setActiveCustomer] = useState<any | null>(null);
  const [customerNotFound, setCustomerNotFound] = useState(false);

  // New Customer Modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustShop, setNewCustShop] = useState('');
  const [newCustTier, setNewCustTier] = useState<'COUNTER' | 'DEALER' | 'DISTRIBUTOR'>('COUNTER');
  const [newCustGstin, setNewCustGstin] = useState('');
  const [newCustLimit, setNewCustLimit] = useState<number | ''>('');

  // Cart & Scanner
  const [scanQuery, setScanQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Serial Selection
  const [scannedProduct, setScannedProduct] = useState<any | null>(null);
  const [availableSerials, setAvailableSerials] = useState<any[]>([]);
  const [showSerialModal, setShowSerialModal] = useState(false);

  // Billing Math
  const [globalDiscount, setGlobalDiscount] = useState<number | ''>('');
  const [tradeInDiscount, setTradeInDiscount] = useState<number | ''>('');
  const [tradeInDesc, setTradeInDesc] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'UDHAAR'>('CASH');
  const [amountPaidInput, setAmountPaidInput] = useState<string>(''); // in INR

  // Cash Tender details
  const [cashTendered, setCashTendered] = useState<number | ''>(''); // in INR

  // Edit Line Item Modal
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [editPrice, setEditPrice] = useState<number | ''>(''); // in INR
  const [editDiscount, setEditDiscount] = useState<number | ''>(''); // in INR
  const [editQty, setEditQty] = useState<number>(1);

  // Invoice Receipt Modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any | null>(null);

  // Refs
  const scanInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }

    // Listen for mobile scanner cart handoff
    const removeListener = window.electronAPI.on('mobile-cart-received', (payload: any[]) => {
      setCart((prev) => {
        const newCart = [...prev];
        payload.forEach((item) => {
          if (!item.instance) {
            // Loose item
            const existingIdx = newCart.findIndex(i => i.id === item.id);
            if (existingIdx > -1) {
              newCart[existingIdx] = { ...newCart[existingIdx], quantity: newCart[existingIdx].quantity + item.quantity };
            } else {
              newCart.push(item);
            }
          } else {
            // Serialized item
            const exists = newCart.some(i => i.id === item.id);
            if (!exists) {
              newCart.push(item);
            }
          }
        });
        return newCart;
      });
      setSuccessMessage('Cart beamed successfully from Mobile Scanner!');
      setTimeout(() => setSuccessMessage(null), 3000);
    });

    return () => removeListener();
  }, []);

  const [session, setSession] = useState<any>(null);
  const [canEditPrice, setCanEditPrice] = useState(false);
  const [canOverrideCredit, setCanOverrideCredit] = useState(false);

  const fetchSettings = async () => {
    try {
      const db = window.electronAPI;
      const settingsList = await db.invoke('db-query', 'SELECT * FROM settings');
      const conf: any = {};
      settingsList.forEach((s: any) => {
        conf[s.key] = s.value;
      });
      if (conf.shop_name) {
        setShopSettings(conf);
      }

      const sess = await db.invoke('get-session');
      setSession(sess);

      if (sess?.role === 'OWNER') {
        setCanEditPrice(true);
        setCanOverrideCredit(true);
      } else if (sess?.role === 'CASHIER') {
        setCanEditPrice(conf['perm_CASHIER_EDIT_PRICE'] === 'true');
        setCanOverrideCredit(conf['perm_CASHIER_OVERRIDE_CREDIT'] === 'true');
      } else {
        setCanEditPrice(false);
        setCanOverrideCredit(false);
      }

    } catch (e) {
      console.error('Failed to load shop settings', e);
    }
  };

  // 1. Customer Lookup
  const handleCustomerLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customerPhone.trim()) return;

    setErrorMessage(null);
    setCustomerNotFound(false);

    try {
      const db = window.electronAPI;
      const customer = await db.invoke('db-get', 'SELECT * FROM customers WHERE phone = ?', [customerPhone.trim()]);
      if (customer) {
        setActiveCustomer(customer);
        // Apply pricing tier change to existing cart items
        updateCartPricing(customer.tier);
        setSuccessMessage(`Customer '${customer.name}' loaded successfully.`);
      } else {
        setActiveCustomer(null);
        setCustomerNotFound(true);
        setNewCustPhone(customerPhone.trim());
      }
    } catch (err: any) {
      setErrorMessage(`Customer search failed: ${err.message}`);
    }
  };

  const handleClearCustomer = () => {
    setActiveCustomer(null);
    setCustomerPhone('');
    setCustomerNotFound(false);
    updateCartPricing('COUNTER');
  };

  // Recalculate cart item pricing based on tier change
  const updateCartPricing = (tier: 'COUNTER' | 'DEALER' | 'DISTRIBUTOR') => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        const price = resolvePrice(item.product, tier);
        return {
          ...item,
          price,
        };
      })
    );
  };

  const resolvePrice = (product: any, tier: string): number => {
    const counterPrice = product.counter_price ?? 0;
    const dealerPrice = product.dealer_price ?? counterPrice;
    const distributorPrice = product.distributor_price ?? dealerPrice;

    if (tier === 'DISTRIBUTOR') {
      return distributorPrice;
    } else if (tier === 'DEALER') {
      return dealerPrice;
    } else {
      return counterPrice;
    }
  };

  // 2. Add Customer Modal Submit
  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;

    try {
      const db = window.electronAPI;
      const limitPaise = newCustLimit ? Math.round(Number(newCustLimit) * 100) : 0;
      
      const res = await db.invoke(
        'db-run',
        `INSERT INTO customers (name, phone, shop_name, tier, gstin, credit_limit, current_balance) 
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [
          newCustName.trim(),
          newCustPhone.trim(),
          newCustShop.trim() || null,
          newCustTier,
          newCustGstin.trim() || null,
          limitPaise
        ]
      );
      
      const newId = res.lastInsertRowid;
      const customer = await db.invoke('db-get', 'SELECT * FROM customers WHERE customer_id = ?', [newId]);
      
      setActiveCustomer(customer);
      setCustomerPhone(customer.phone);
      setCustomerNotFound(false);
      setShowCustomerModal(false);
      updateCartPricing(customer.tier);
      setSuccessMessage(`New customer '${customer.name}' registered and active.`);

      // Reset fields
      setNewCustName('');
      setNewCustShop('');
      setNewCustTier('COUNTER');
      setNewCustGstin('');
      setNewCustLimit('');
    } catch (err: any) {
      alert(`Failed to save customer: ${err.message}`);
    }
  };

  // 3. Scan & Cart Entry
  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = scanQuery.trim();
    if (!query) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const db = window.electronAPI;
      
      // Step A: Check if query matches a product sku_code
      const product = await db.invoke('db-get', 'SELECT * FROM products WHERE sku_code = ?', [query]);
      if (product) {
        if (product.requires_serial === 1) {
          // It requires serial: lookup in-stock serials
          const serials = await db.invoke(
            'db-query',
            "SELECT * FROM product_instances WHERE product_id = ? AND status = 'IN_STOCK'",
            [product.product_id]
          );
          if (serials.length === 0) {
            setErrorMessage(`No units in stock for product '${product.brand_name} ${product.model_name}'.`);
            setScanQuery('');
            return;
          }
          setScannedProduct(product);
          setAvailableSerials(serials);
          setShowSerialModal(true);
        } else {
          // Loose item, add to cart immediately
          addLooseToCart(product);
        }
        setScanQuery('');
        return;
      }

      // Step B: If not SKU, check if query matches a unique serial_number directly
      const instance = await db.invoke(
        'db-get',
        `SELECT pi.*, p.brand_name, p.model_name, p.requires_serial, p.gst_rate, 
                p.counter_price, p.dealer_price, p.distributor_price, p.sku_code
         FROM product_instances pi
         JOIN products p ON pi.product_id = p.product_id
         WHERE pi.serial_number = ?`,
        [query]
      );

      if (instance) {
        if (instance.status !== 'IN_STOCK') {
          setErrorMessage(`Serial '${query}' is registered but currently has status: ${instance.status}.`);
          setScanQuery('');
          return;
        }
        
        // Add specific serial instance to cart
        addSerializedToCart(instance, instance);
        setScanQuery('');
        return;
      }

      // If nothing matches
      setErrorMessage(`Code '${query}' matches no active SKU or in-stock Serial.`);
      setScanQuery('');
    } catch (err: any) {
      setErrorMessage(`Scan lookup error: ${err.message}`);
    }
  };

  // Add loose item to cart helper
  const addLooseToCart = (product: any) => {
    const tier = activeCustomer ? activeCustomer.tier : 'COUNTER';
    const price = resolvePrice(product, tier);
    const cartId = `loose-${product.product_id}`;

    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex((i) => i.id === cartId);
      if (existingIdx > -1) {
        const existing = prevCart[existingIdx];
        if (existing.quantity + 1 > product.loose_qty) {
          setErrorMessage(`Cannot exceed available loose stock of ${product.loose_qty} units.`);
          return prevCart;
        }
        const updated = [...prevCart];
        updated[existingIdx] = { ...existing, quantity: existing.quantity + 1 };
        return updated;
      } else {
        if (product.loose_qty < 1) {
          setErrorMessage(`No loose quantity in stock for ${product.brand_name} ${product.model_name}.`);
          return prevCart;
        }
        return [...prevCart, {
          id: cartId,
          product,
          instance: null,
          quantity: 1,
          price,
          discount: 0,
        }];
      }
    });
  };

  // Add serialized unit to cart helper
  const addSerializedToCart = (product: any, instance: any) => {
    const tier = activeCustomer ? activeCustomer.tier : 'COUNTER';
    const price = resolvePrice(product, tier);
    const cartId = `serial-${instance.instance_id}`;

    setCart((prevCart) => {
      // Check if already in cart
      const exists = prevCart.some((i) => i.id === cartId);
      if (exists) {
        setErrorMessage(`Serial '${instance.serial_number}' is already added to cart.`);
        return prevCart;
      }
      return [...prevCart, {
        id: cartId,
        product,
        instance,
        quantity: 1,
        price,
        discount: 0,
      }];
    });
  };

  // Handle serial pick from list
  const handleSelectSerial = (instance: any) => {
    addSerializedToCart(scannedProduct, instance);
    setShowSerialModal(false);
    setScannedProduct(null);
    setAvailableSerials([]);
    if (scanInputRef.current) scanInputRef.current.focus();
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  // 4. Cart calculations
  const calculateCartSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price - item.discount) * item.quantity, 0);
  };

  // Computes CGST/SGST/IGST tax splits
  const calculateTaxSplits = () => {
    const subtotal = calculateCartSubtotal();
    const discountVal = globalDiscount ? Math.round(Number(globalDiscount) * 100) : 0;
    const tradeInVal = tradeInDiscount ? Math.round(Number(tradeInDiscount) * 100) : 0;
    const taxableSubtotal = Math.max(0, subtotal - discountVal);

    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    // Split based on state comparison
    const shopState = shopSettings.state_code || '29';
    let customerState = shopState;
    if (activeCustomer?.gstin && activeCustomer.gstin.trim().length >= 2) {
      const code = activeCustomer.gstin.trim().substring(0, 2);
      if (/^\d+$/.test(code)) {
        customerState = code;
      }
    }

    const isIntraState = customerState === shopState;

    cart.forEach((item) => {
      // Taxable share for this line item (proportionate share of global discount applied)
      const lineTotal = (item.price - item.discount) * item.quantity;
      const proportion = subtotal > 0 ? lineTotal / subtotal : 0;
      const lineTaxable = Math.round(lineTotal - (discountVal * proportion));
      const rate = item.product.gst_rate ?? 18;

      // Reverse calculate: LineTotal includes GST. TaxableValue = LineTotal / (1 + GST_Rate / 100)
      // TaxPaid = LineTotal - TaxableValue
      const taxableValue = Math.round(lineTaxable / (1 + rate / 100));
      const taxAmount = lineTaxable - taxableValue;

      if (isIntraState) {
        const half = Math.round(taxAmount / 2);
        cgstTotal += half;
        sgstTotal += (taxAmount - half);
      } else {
        igstTotal += taxAmount;
      }
    });

    return {
      cgst: cgstTotal,
      sgst: sgstTotal,
      igst: igstTotal,
      taxableAmount: Math.max(0, taxableSubtotal - (cgstTotal + sgstTotal + igstTotal)),
      grandTotal: Math.max(0, taxableSubtotal - tradeInVal)
    };
  };

  const { cgst, sgst, igst, grandTotal } = calculateTaxSplits();

  // 5. Line Item Edit Form
  const handleOpenEditItem = (item: CartItem) => {
    setEditingItem(item);
    setEditPrice(item.price / 100);
    setEditDiscount(item.discount / 100);
    setEditQty(item.quantity);
  };

  const handleSaveEditItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const pricePaise = editPrice ? Math.round(Number(editPrice) * 100) : 0;
    const discountPaise = editDiscount ? Math.round(Number(editDiscount) * 100) : 0;

    // Check inventory levels if quantity of loose item increases
    if (!editingItem.instance && editQty > editingItem.product.loose_qty) {
      alert(`Cannot exceed available loose stock of ${editingItem.product.loose_qty} units.`);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            price: pricePaise,
            discount: discountPaise,
            quantity: editingItem.instance ? 1 : editQty, // serialized quantity locked at 1
          };
        }
        return item;
      })
    );

    setEditingItem(null);
  };

  // 6. Udhaar Limit Check
  const getUdhaarLimits = () => {
    if (!activeCustomer) return { blocked: false, reason: '' };
    
    const limit = activeCustomer.credit_limit ?? 0;
    const current = activeCustomer.current_balance ?? 0;
    const nextBalance = current + grandTotal;

    // Check overdue
    const isOverdue = activeCustomer.credit_due_date && new Date(activeCustomer.credit_due_date) < new Date() && current > 0;

    if (isOverdue) {
      return {
        blocked: !canOverrideCredit,
        reason: `Overdue account! Last due date was ${activeCustomer.credit_due_date}. Please clear pending balance of ₹${(current/100).toLocaleString('en-IN')}. ${canOverrideCredit ? '(Override active)' : ''}`
      };
    }

    if (activeCustomer.phone !== '0000000000' && nextBalance > limit) {
      return {
        blocked: !canOverrideCredit,
        reason: `Exceeds credit limit! Current debt is ₹${(current/100).toLocaleString('en-IN')} / Credit limit is ₹${(limit/100).toLocaleString('en-IN')}. ${canOverrideCredit ? '(Override active)' : ''}`
      };
    }

    return { blocked: false, reason: '' };
  };

  const { blocked: creditBlocked, reason: creditReason } = getUdhaarLimits();

  // 7. Transactional Checkout Commit
  const handleCheckoutSubmit = async () => {
    if (cart.length === 0) {
      setErrorMessage('Cart is empty.');
      return;
    }

    if (paymentMode === 'UDHAAR') {
      if (creditBlocked) {
        setErrorMessage(creditReason);
        return;
      }
      if (!activeCustomer || activeCustomer.phone === '0000000000') {
        setErrorMessage('Cannot sell on credit (Udhaar) to generic Counter Customer.');
        return;
      }
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const db = window.electronAPI;
      
      // Calculate split detail
      const discountVal = globalDiscount ? Math.round(Number(globalDiscount) * 100) : 0;
      const tradeInVal = tradeInDiscount ? Math.round(Number(tradeInDiscount) * 100) : 0;
      const subtotal = calculateCartSubtotal();
      
      // Amount paid
      let paidPaise = grandTotal;
      if (paymentMode === 'UDHAAR') {
        paidPaise = amountPaidInput ? Math.round(Number(amountPaidInput) * 100) : 0;
      }

      // Generate invoice ID
      const prefix = shopSettings.invoice_prefix || 'CE/26/';
      const sequence = shopSettings.next_invoice_no || '1001';
      const invoiceNo = `${prefix}${sequence}`;

      // Assemble Transaction Queries
      const queries: { sql: string; params: any[] }[] = [];

      // 1. Insert Sales Header
      queries.push({
        sql: `INSERT INTO sales (
                invoice_no, customer_id, tier_applied, subtotal, discount, 
                cgst, sgst, igst, grand_total, amount_paid, payment_mode, trade_in_discount, trade_in_desc, sold_by
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          invoiceNo,
          activeCustomer ? activeCustomer.customer_id : 1, // default to Counter Customer id 1
          activeCustomer ? activeCustomer.tier : 'COUNTER',
          subtotal,
          discountVal,
          cgst,
          sgst,
          igst,
          grandTotal,
          paidPaise,
          paymentMode,
          tradeInVal,
          tradeInDesc || null,
          session?.user_id || 1 // sold_by from session
        ]
      });

      // 1b. Insert into trade_ins
      if (tradeInVal > 0 && tradeInDesc) {
        queries.push({
          sql: `INSERT INTO trade_ins (sale_id, customer_id, item_desc, estimated_value, status) 
                VALUES ((SELECT sale_id FROM sales WHERE invoice_no = ?), ?, ?, ?, 'RECEIVED')`,
          params: [
            invoiceNo,
            activeCustomer ? activeCustomer.customer_id : 1,
            tradeInDesc,
            tradeInVal
          ]
        });
      }

      // 2. Insert items and decrement inventory
      cart.forEach((item) => {
        if (item.instance) {
          // Serialized
          queries.push({
            sql: `INSERT INTO sale_items (
                    sale_id, product_id, instance_id, quantity, unit_price, line_discount, line_total
                  ) VALUES (
                    (SELECT sale_id FROM sales WHERE invoice_no = ?),
                    ?, ?, 1, ?, ?, ?
                  )`,
            params: [
              invoiceNo,
              item.product.product_id,
              item.instance.instance_id,
              item.price,
              item.discount,
              (item.price - item.discount)
            ]
          });

          // Set serial as SOLD and calculate warranty expiry
          const warrantyMonths = item.product.warranty_months ?? 12;
          queries.push({
            sql: `UPDATE product_instances 
                  SET status = 'SOLD', 
                      sold_at = datetime('now'), 
                      warranty_expires_at = datetime('now', '+' || ? || ' months')
                  WHERE instance_id = ?`,
            params: [warrantyMonths, item.instance.instance_id]
          });
        } else {
          // Loose items
          queries.push({
            sql: `INSERT INTO sale_items (
                    sale_id, product_id, instance_id, quantity, unit_price, line_discount, line_total
                  ) VALUES (
                    (SELECT sale_id FROM sales WHERE invoice_no = ?),
                    ?, NULL, ?, ?, ?, ?
                  )`,
            params: [
              invoiceNo,
              item.product.product_id,
              item.quantity,
              item.price,
              item.discount,
              (item.price - item.discount) * item.quantity
            ]
          });

          // Decrement loose inventory quantity
          queries.push({
            sql: `UPDATE products 
                  SET loose_qty = loose_qty - ? 
                  WHERE product_id = ?`,
            params: [item.quantity, item.product.product_id]
          });
        }
      });

      // 3. Udhaar Ledger Updates
      if (paymentMode === 'UDHAAR') {
        const debtPaise = grandTotal - paidPaise;
        queries.push({
          sql: `UPDATE customers 
                SET current_balance = current_balance + ? 
                WHERE customer_id = ?`,
          params: [debtPaise, activeCustomer.customer_id]
        });

        queries.push({
          sql: `INSERT INTO customer_ledger (customer_id, type, ref_id, amount, balance_after, note)
                VALUES (
                  ?, 'SALE', 
                  (SELECT sale_id FROM sales WHERE invoice_no = ?), 
                  ?, 
                  (SELECT current_balance FROM customers WHERE customer_id = ?), 
                  ?
                )`,
          params: [
            activeCustomer.customer_id,
            invoiceNo,
            debtPaise,
            activeCustomer.customer_id,
            `Debited from invoice ${invoiceNo}`
          ]
        });
      }

      // 4. Update Invoice Sequence in Settings
      queries.push({
        sql: `UPDATE settings 
              SET value = CAST((CAST(value AS INTEGER) + 1) AS TEXT) 
              WHERE key = 'next_invoice_no'`,
        params: []
      });

      // Execute transaction batch
      await db.invoke('db-transaction', queries);

      // Audit Log
      await db.invoke('db-run', 
        `INSERT INTO audit_log (user_id, action, entity, entity_id, detail) 
         VALUES (?, ?, ?, (SELECT sale_id FROM sales WHERE invoice_no = ?), ?)`,
        [1, 'CHECKOUT', 'sale', invoiceNo, `POS Checkout Completed. Invoice: ${invoiceNo}`]
      );

      // Retrieve full created invoice details for receipt display
      const saleRow = await db.invoke('db-get', 'SELECT * FROM sales WHERE invoice_no = ?', [invoiceNo]);
      const saleItemsRows = await db.invoke(
        'db-query', 
        `SELECT si.*, p.brand_name, p.model_name, p.hsn_code, p.gst_rate, pi.serial_number
         FROM sale_items si
         JOIN products p ON si.product_id = p.product_id
         LEFT JOIN product_instances pi ON si.instance_id = pi.instance_id
         WHERE si.sale_id = ?`,
        [saleRow.sale_id]
      );

      setCreatedInvoice({
        header: saleRow,
        items: saleItemsRows,
        customer: activeCustomer || { name: 'Counter Customer', phone: '0000000000', tier: 'COUNTER' }
      });

      setSuccessMessage(`Invoice ${invoiceNo} generated successfully.`);
      setShowInvoiceModal(true);

      // Trigger SMS if payment was received
      if (paidPaise > 0 && activeCustomer && activeCustomer.phone !== '0000000000') {
        db.invoke('enqueue-sms', activeCustomer.phone, 'sms_tpl_payment', {
          amount: (paidPaise / 100).toFixed(2),
          invoice_no: invoiceNo
        });
      }

      // Reset cart and transaction status
      setCart([]);
      setGlobalDiscount('');
      setTradeInDiscount('');
      setTradeInDesc('');
      setAmountPaidInput('');
      setCashTendered('');
      handleClearCustomer();
      fetchSettings(); // Refresh sequence number
    } catch (err: any) {
      setErrorMessage(`Checkout transaction failed: ${err.message}`);
    }
  };

  const formatPrice = (paise?: number) => {
    if (paise == null) return '₹0.00';
    return `₹${(paise / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
        <h1 className="text-xl font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center space-x-2">
          <ShoppingCart size={22} />
          <span>POS Billing / Check-Out</span>
        </h1>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 rounded text-sm font-mono flex items-center space-x-2">
          <CheckCircle size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-950/20 border border-red-500/30 text-red-400 rounded text-sm font-mono flex items-center space-x-2">
          <AlertTriangle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns - Inputs */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Customer Profile Selection */}
          <div className="border border-zinc-800 bg-zinc-900/10 p-5 rounded-lg space-y-4">
            <h2 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center justify-between">
              <span>Customer Account</span>
              {activeCustomer && (
                <span className="text-[10px] bg-amber-400/10 border border-amber-400/25 text-amber-400 px-1.5 py-0.2 rounded font-bold uppercase">
                  {activeCustomer.tier} TIER
                </span>
              )}
            </h2>

            {!activeCustomer ? (
              <form onSubmit={handleCustomerLookup} className="space-y-3">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    ref={phoneInputRef}
                    placeholder="Enter phone number..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-750 text-zinc-300 px-3 py-2 rounded text-xs transition-colors font-mono"
                  >
                    <Search size={14} />
                  </button>
                </div>
                {customerNotFound && (
                  <div className="p-3 bg-zinc-950 border border-zinc-850 rounded space-y-2">
                    <span className="block text-[10px] text-zinc-500 font-mono">No record for phone '{newCustPhone}'</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomerModal(true);
                        setNewCustPhone(newCustPhone);
                      }}
                      className="w-full flex items-center justify-center space-x-1 bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold px-3 py-1.5 rounded text-xs transition-colors font-mono"
                    >
                      <UserPlus size={12} />
                      <span>REGISTER NEW CUSTOMER</span>
                    </button>
                  </div>
                )}
              </form>
            ) : (
              <div className="bg-zinc-950 p-4 rounded border border-zinc-900 space-y-3 text-xs font-mono relative">
                <button
                  onClick={handleClearCustomer}
                  className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  ✕ CLEAR
                </button>
                <div className="space-y-1">
                  <div className="font-bold text-zinc-200 text-sm font-sans">{activeCustomer.name}</div>
                  <div className="text-zinc-500">{activeCustomer.phone}</div>
                  {activeCustomer.shop_name && <div className="text-zinc-400">Shop: {activeCustomer.shop_name}</div>}
                  {activeCustomer.gstin && <div className="text-zinc-400">GSTIN: {activeCustomer.gstin}</div>}
                </div>

                {/* Ledger balances */}
                {activeCustomer.phone !== '0000000000' && (
                  <div className="border-t border-zinc-900 pt-2.5 mt-2.5 grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-zinc-500 block uppercase">Udhaar Debt:</span>
                      <span className="font-bold text-zinc-200">{formatPrice(activeCustomer.current_balance)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block uppercase">Credit Limit:</span>
                      <span className="font-bold text-zinc-200">{formatPrice(activeCustomer.credit_limit)}</span>
                    </div>
                    {activeCustomer.credit_due_date && (
                      <div className="col-span-2 border-t border-zinc-900/50 pt-1.5 flex items-center space-x-1">
                        <span className="text-zinc-500 uppercase">Due Date:</span>
                        <span className={`font-bold ${new Date(activeCustomer.credit_due_date) < new Date() && activeCustomer.current_balance > 0 ? 'text-red-400' : 'text-zinc-350'}`}>
                          {activeCustomer.credit_due_date}
                        </span>
                        {new Date(activeCustomer.credit_due_date) < new Date() && activeCustomer.current_balance > 0 && (
                          <span className="text-[9px] bg-red-950/20 border border-red-500/30 text-red-400 px-1 rounded">
                            OVERDUE
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scanner Input Panel */}
          <div className="border border-zinc-800 bg-zinc-900/10 p-5 rounded-lg space-y-4">
            <div className="space-y-1">
              <h2 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center space-x-2">
                <Barcode size={16} />
                <span>Barcode Scan Wedge</span>
              </h2>
              <p className="text-[10px] text-zinc-500">
                Scan product SKU barcode or serial number sticker. Autofocus active.
              </p>
            </div>

            <form onSubmit={handleScanSubmit}>
              <input
                type="text"
                ref={scanInputRef}
                placeholder="Click here & scan..."
                value={scanQuery}
                onChange={(e) => setScanQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2.5 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              />
            </form>
          </div>
        </div>

        {/* Right Columns - Cart & Details */}
        <div className="lg:col-span-2 border border-zinc-800 bg-zinc-900/10 p-6 rounded-lg flex flex-col justify-between min-h-[480px]">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-850 pb-2">
              <span className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                <ShoppingCart size={15} />
                <span>Invoice Items Cart</span>
              </span>
              <span className="text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded font-mono font-bold">
                {cart.length} LINE ITEMS
              </span>
            </div>

            {/* Cart Items List */}
            <div className="max-h-64 overflow-y-auto divide-y divide-zinc-900 border border-zinc-850 rounded bg-zinc-950">
              {cart.length > 0 ? (
                cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center px-4 py-3 hover:bg-zinc-900/40 text-xs">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-zinc-200">{item.product.brand_name} {item.product.model_name}</span>
                        {item.instance ? (
                          <span className="text-[9px] bg-zinc-800 border border-zinc-700 text-amber-400 px-1.5 py-0.2 rounded font-mono">
                            SN: {item.instance.serial_number}
                          </span>
                        ) : (
                          <span className="text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-500 px-1.5 py-0.2 rounded font-mono">
                            Loose Bulk Component
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-[10px] text-zinc-500 font-mono">
                        <span>SKU: {item.product.sku_code}</span>
                        <span>GST: {item.product.gst_rate}%</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      {/* Price Details */}
                      <div className="text-right font-mono">
                        <div className="font-semibold text-zinc-200">
                          {formatPrice((item.price - item.discount) * item.quantity)}
                        </div>
                        {item.discount > 0 && (
                          <div className="text-[9px] text-emerald-400">
                            - {formatPrice(item.discount)} x {item.quantity} disc
                          </div>
                        )}
                        <div className="text-[9px] text-zinc-500">
                          {formatPrice(item.price)} each {item.quantity > 1 ? `x ${item.quantity}` : ''}
                        </div>
                      </div>

                      {/* Edit / Remove actions */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenEditItem(item)}
                          className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-zinc-500 italic">
                  Cart is empty. Scan an SKU barcode or serial number to begin billing.
                </div>
              )}
            </div>

            {/* Calculations and Billing Config */}
            {cart.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-850">
                
                {/* Checkout configs */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase">Bill Discount (INR)</label>
                      <input
                        type="number"
                        placeholder="e.g. 500"
                        value={globalDiscount}
                        onChange={(e) => setGlobalDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase">Payment Mode</label>
                      <select
                        value={paymentMode}
                        onChange={(e) => {
                          const mode = e.target.value as any;
                          setPaymentMode(mode);
                          if (mode === 'UDHAAR') {
                            setAmountPaidInput('0');
                          } else {
                            setAmountPaidInput('');
                          }
                        }}
                        className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-400"
                      >
                        <option value="CASH">CASH</option>
                        <option value="UPI">UPI</option>
                        <option value="CARD">CARD</option>
                        <option value="UDHAAR">UDHAAR (Credit)</option>
                      </select>
                    </div>
                  </div>

                  {/* Trade-In Row */}
                  <div className="grid grid-cols-3 gap-3 bg-zinc-950 p-3 rounded border border-zinc-900 border-dashed">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase">Old Item Trade-In (Desc)</label>
                      <input
                        type="text"
                        placeholder="e.g. Old Sony 32inch TV (Screen Scratched)"
                        value={tradeInDesc}
                        onChange={(e) => setTradeInDesc(e.target.value)}
                        className="mt-1 w-full bg-zinc-900 border border-zinc-850 rounded px-3 py-1.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase">Value (INR)</label>
                      <input
                        type="number"
                        placeholder="e.g. 1500"
                        value={tradeInDiscount}
                        onChange={(e) => setTradeInDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="mt-1 w-full bg-zinc-900 border border-zinc-850 rounded px-3 py-1.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  {paymentMode === 'CASH' && (
                    <div className="bg-zinc-950 p-3 rounded border border-zinc-900 grid grid-cols-2 gap-3 text-xs font-mono">
                      <div>
                        <label className="block text-[9px] text-zinc-500 uppercase">Cash Tendered (INR)</label>
                        <input
                          type="number"
                          placeholder="e.g. 5000"
                          value={cashTendered}
                          onChange={(e) => setCashTendered(e.target.value === '' ? '' : Number(e.target.value))}
                          className="mt-1 w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1 text-xs text-zinc-100 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <span className="text-[9px] text-zinc-500 uppercase">Change Due:</span>
                        <span className="font-bold text-amber-400 text-sm mt-1">
                          {cashTendered && cashTendered > (grandTotal / 100)
                            ? formatPrice(Math.round((Number(cashTendered) - (grandTotal / 100)) * 100))
                            : '₹0.00'}
                        </span>
                      </div>
                    </div>
                  )}

                  {paymentMode === 'UDHAAR' && (
                    <div className="bg-zinc-950 p-3 rounded border border-zinc-900 space-y-2 text-xs font-mono">
                      <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase">
                        <span>Credit limits check:</span>
                        {creditBlocked ? (
                          <span className="text-red-400 font-bold">BLOCKED</span>
                        ) : (
                          <span className="text-emerald-400 font-bold">PASSED</span>
                        )}
                      </div>
                      {creditBlocked && (
                        <div className="p-2 border border-red-500/25 bg-red-950/20 text-red-400 text-[10px] rounded leading-relaxed">
                          {creditReason}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] text-zinc-500 uppercase">Split Paid (INR)</label>
                          <input
                            type="number"
                            placeholder="e.g. 1000"
                            value={amountPaidInput}
                            onChange={(e) => setAmountPaidInput(e.target.value)}
                            className="mt-1 w-full bg-zinc-900 border border-zinc-850 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <span className="text-[9px] text-zinc-500 uppercase">Balance Debited:</span>
                          <span className="font-bold text-zinc-200 mt-1">
                            {formatPrice(Math.max(0, grandTotal - Math.round(Number(amountPaidInput || 0) * 100)))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pricing Summary */}
                <div className="bg-zinc-950 p-4 rounded border border-zinc-900 space-y-2 text-xs font-mono self-start">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal:</span>
                    <span>{formatPrice(calculateCartSubtotal())}</span>
                  </div>
                  {globalDiscount && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount:</span>
                      <span>- {formatPrice(Math.round(Number(globalDiscount) * 100))}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-550 border-t border-zinc-900 pt-1.5 text-[10px]">
                    <span>CGST + SGST Splits:</span>
                    <span>{formatPrice(cgst + sgst)}</span>
                  </div>
                  {igst > 0 && (
                    <div className="flex justify-between text-zinc-550 text-[10px]">
                      <span>IGST (Inter-state):</span>
                      <span>{formatPrice(igst)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-200 font-bold border-t border-zinc-900 pt-2 text-sm">
                    <span className="text-amber-400">Grand Total:</span>
                    <span className="text-amber-400">{formatPrice(grandTotal)}</span>
                  </div>
                </div>

              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="flex justify-end pt-6">
              <button
                onClick={handleCheckoutSubmit}
                disabled={paymentMode === 'UDHAAR' && creditBlocked}
                className="flex items-center space-x-2 bg-amber-400 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-950 font-bold px-8 py-3 rounded font-mono text-sm shadow-lg shadow-amber-400/5 transition-all"
              >
                <Receipt size={16} />
                <span>GENERATE & PRINT INVOICE</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* NEW CUSTOMER QUICK ADD MODAL */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-lg shadow-2xl overflow-hidden font-sans">
            <div className="bg-zinc-900 border-b border-zinc-850 px-5 py-4 flex justify-between items-center">
              <h3 className="text-sm font-bold font-mono text-amber-400 uppercase tracking-wider">
                Register New Customer
              </h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="text-zinc-500 hover:text-zinc-300 font-mono text-xs"
              >
                ✕ CANCEL
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="p-5 space-y-4 text-xs font-mono">
              <div>
                <label className="block text-zinc-400 uppercase">Customer Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Kumar"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 uppercase">Phone Number</label>
                  <input
                    type="text"
                    required
                    disabled
                    value={newCustPhone}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 uppercase">Pricing Tier</label>
                  <select
                    value={newCustTier}
                    onChange={(e) => setNewCustTier(e.target.value as any)}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-2 text-zinc-150 focus:outline-none focus:border-amber-400"
                  >
                    <option value="COUNTER">COUNTER</option>
                    <option value="DEALER">DEALER</option>
                    <option value="DISTRIBUTOR">DISTRIBUTOR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 uppercase">Shop Name (Dealers / Dist)</label>
                <input
                  type="text"
                  placeholder="e.g. Anand Audio Hub"
                  value={newCustShop}
                  onChange={(e) => setNewCustShop(e.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 uppercase">GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="15-digit code"
                    maxLength={15}
                    value={newCustGstin}
                    onChange={(e) => setNewCustGstin(e.target.value.toUpperCase())}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 uppercase">Credit Limit (INR)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={newCustLimit}
                    onChange={(e) => setNewCustLimit(e.target.value === '' ? '' : Number(e.target.value))}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold px-4 py-2.5 rounded font-mono uppercase tracking-wider mt-4"
              >
                CREATE CUSTOMER ACCOUNT
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CHOOSE SERIAL MODAL FOR SKU SCANS */}
      {showSerialModal && scannedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-lg shadow-2xl overflow-hidden font-sans">
            <div className="bg-zinc-900 border-b border-zinc-850 px-5 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold font-mono text-amber-400 uppercase tracking-wider">
                  Select Serial Instance
                </h3>
                <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                  {scannedProduct.brand_name} {scannedProduct.model_name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSerialModal(false);
                  setScannedProduct(null);
                  setAvailableSerials([]);
                }}
                className="text-zinc-500 hover:text-zinc-300 font-mono text-xs"
              >
                ✕ CANCEL
              </button>
            </div>

            <div className="p-4 max-h-72 overflow-y-auto divide-y divide-zinc-900">
              {availableSerials.map((s) => (
                <button
                  key={s.instance_id}
                  onClick={() => handleSelectSerial(s)}
                  className="w-full text-left px-4 py-3 hover:bg-zinc-900 flex justify-between items-center text-xs font-mono transition-colors"
                >
                  <span className="text-zinc-200">SN: {s.serial_number}</span>
                  <span className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.2 rounded uppercase">
                    Batch: {s.batch_number}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* EDIT CART LINE ITEM MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-sm rounded-lg shadow-2xl overflow-hidden font-sans">
            <div className="bg-zinc-900 border-b border-zinc-850 px-5 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold font-mono text-amber-400 uppercase tracking-wider">
                  Edit Item Options
                </h3>
                <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                  {editingItem.product.brand_name} {editingItem.product.model_name}
                </p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-zinc-500 hover:text-zinc-300 font-mono text-xs"
              >
                ✕ CANCEL
              </button>
            </div>

            <form onSubmit={handleSaveEditItemSubmit} className="p-5 space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 uppercase flex items-center gap-1">
                    Unit Price (INR) {!canEditPrice && <Lock size={10} className="text-red-400" />}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!canEditPrice}
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className={`mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none ${canEditPrice ? 'focus:border-amber-400' : 'opacity-60 cursor-not-allowed'}`}
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 uppercase flex items-center gap-1">
                    Unit Discount (INR) {!canEditPrice && <Lock size={10} className="text-red-400" />}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!canEditPrice}
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                    className={`mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none ${canEditPrice ? 'focus:border-amber-400' : 'opacity-60 cursor-not-allowed'}`}
                  />
                </div>
              </div>

              {!editingItem.instance && (
                <div>
                  <label className="block text-zinc-400 uppercase">Quantity (Loose Stock: {editingItem.product.loose_qty})</label>
                  <input
                    type="number"
                    min="1"
                    value={editQty}
                    onChange={(e) => setEditQty(Number(e.target.value))}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold px-4 py-2.5 rounded font-mono uppercase tracking-wider mt-4"
              >
                APPLY AMENDMENTS
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PRINT INVOICE MODAL */}
      {showInvoiceModal && createdInvoice && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-black w-full max-w-3xl rounded-lg shadow-2xl overflow-hidden my-8 flex flex-col">
            <div className="bg-zinc-900 text-zinc-100 px-6 py-4 flex justify-between items-center border-b border-zinc-800 shrink-0">
              <span className="font-bold font-mono tracking-wider text-sm">INVOICE GENERATED SUCCESSFULLY</span>
              <div className="flex space-x-3">
                <button
                  onClick={() => triggerPrint('SALE', createdInvoice.header.sale_id)}
                  className="bg-amber-400 hover:bg-amber-500 text-zinc-950 px-3.5 py-1.5 rounded font-mono font-bold text-xs flex items-center space-x-1.5 transition-colors"
                >
                  <Printer size={13} />
                  <span>PRINT INVOICE</span>
                </button>
                <button
                  onClick={() => {
                    setShowInvoiceModal(false);
                    setCreatedInvoice(null);
                  }}
                  className="text-zinc-450 hover:text-zinc-200 font-mono text-xs py-1.5 px-3"
                >
                  ✕ CLOSE
                </button>
              </div>
            </div>

            {/* Printable Receipt Core */}
            <div className="p-8 space-y-6 bg-white font-sans text-sm printable-invoice overflow-y-auto max-h-[75vh]">
              {/* Receipt Header */}
              <div className="flex justify-between items-start border-b-2 border-black pb-4">
                <div className="space-y-1">
                  <h1 className="text-lg font-bold uppercase tracking-wider">{shopSettings.shop_name}</h1>
                  <p className="text-xs text-zinc-700 max-w-sm whitespace-pre-line">{shopSettings.address}</p>
                  <p className="text-xs font-mono font-bold">GSTIN: {shopSettings.gstin}</p>
                </div>
                <div className="text-right space-y-1">
                  <h2 className="text-md font-bold uppercase tracking-wider text-zinc-800">TAX INVOICE</h2>
                  <p className="text-xs font-mono"><span className="font-bold text-zinc-650">INVOICE NO:</span> {createdInvoice.header.invoice_no}</p>
                  <p className="text-xs font-mono"><span className="font-bold text-zinc-650">DATE:</span> {createdInvoice.header.created_at}</p>
                </div>
              </div>

              {/* Billed To */}
              <div className="grid grid-cols-2 gap-6 bg-zinc-50 p-4 rounded border border-zinc-150">
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">BILLED TO:</span>
                  <div className="font-bold text-zinc-800">{createdInvoice.customer.name}</div>
                  <div className="text-xs text-zinc-600">Ph: {createdInvoice.customer.phone}</div>
                  {createdInvoice.customer.shop_name && <div className="text-xs text-zinc-600">Shop: {createdInvoice.customer.shop_name}</div>}
                </div>
                <div className="space-y-1 text-right">
                  <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">TRANSACTION DETAILS:</span>
                  <div className="text-xs font-mono"><span className="font-bold text-zinc-600">Payment Mode:</span> {createdInvoice.header.payment_mode}</div>
                  <div className="text-xs font-mono"><span className="font-bold text-zinc-600">Amount Paid:</span> {formatPrice(createdInvoice.header.amount_paid)}</div>
                  {createdInvoice.header.payment_mode === 'UDHAAR' && (
                    <div className="text-xs font-mono text-red-600 font-bold">
                      Pending Debit: {formatPrice(createdInvoice.header.grand_total - createdInvoice.header.amount_paid)}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-black font-bold uppercase text-[10px] text-zinc-700">
                    <th className="py-2">Item Description</th>
                    <th className="py-2 text-center">HSN</th>
                    <th className="py-2 text-center">Rate</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-center">Disc</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {createdInvoice.items.map((item: any) => (
                    <tr key={item.sale_item_id} className="py-2">
                      <td className="py-2">
                        <div className="font-bold">{item.brand_name} {item.model_name}</div>
                        {item.serial_number && (
                          <div className="text-[10px] font-mono text-zinc-500">S/N: {item.serial_number}</div>
                        )}
                      </td>
                      <td className="py-2 text-center font-mono">{item.hsn_code || 'N/A'}</td>
                      <td className="py-2 text-center font-mono">{formatPrice(item.unit_price)}</td>
                      <td className="py-2 text-center font-mono">{item.quantity}</td>
                      <td className="py-2 text-center font-mono text-zinc-500">{(item.line_discount > 0) ? `-${formatPrice(item.line_discount)}` : '0.00'}</td>
                      <td className="py-2 text-right font-mono font-bold">{formatPrice(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Splits & Totals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t-2 border-zinc-200">
                {/* GST breaks */}
                <div className="space-y-1.5 self-start bg-zinc-50 p-4 rounded border border-zinc-150 text-[11px] font-mono">
                  <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-sans mb-1">Tax Audit Splits:</span>
                  {createdInvoice.header.cgst > 0 && (
                    <div className="flex justify-between">
                      <span>CGST:</span>
                      <span>{formatPrice(createdInvoice.header.cgst)}</span>
                    </div>
                  )}
                  {createdInvoice.header.sgst > 0 && (
                    <div className="flex justify-between">
                      <span>SGST:</span>
                      <span>{formatPrice(createdInvoice.header.sgst)}</span>
                    </div>
                  )}
                  {createdInvoice.header.igst > 0 && (
                    <div className="flex justify-between">
                      <span>IGST:</span>
                      <span>{formatPrice(createdInvoice.header.igst)}</span>
                    </div>
                  )}
                </div>

                {/* Final values */}
                <div className="space-y-2 text-right font-mono self-start text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-650 font-sans">Subtotal:</span>
                    <span>{formatPrice(createdInvoice.header.subtotal)}</span>
                  </div>
                  {createdInvoice.header.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span className="font-sans">Invoice Discount:</span>
                      <span>- {formatPrice(createdInvoice.header.discount)}</span>
                    </div>
                  )}
                  {createdInvoice.header.trade_in_discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold text-[11px]">
                      <span className="font-sans">Trade-In Value:</span>
                      <span>- {formatPrice(createdInvoice.header.trade_in_discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm border-t-2 border-black pt-2">
                    <span className="font-sans">Grand Total:</span>
                    <span>{formatPrice(createdInvoice.header.grand_total)}</span>
                  </div>
                </div>
              </div>

              {/* Sticky styles for printing */}
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  .printable-invoice, .printable-invoice * {
                    visibility: visible;
                  }
                  .printable-invoice {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    max-height: none !important;
                    overflow: visible !important;
                  }
                }
              `}} />

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
