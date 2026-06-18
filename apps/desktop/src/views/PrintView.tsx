import React, { useEffect, useState } from 'react';
// Mock Barcode component
const Barcode = ({ value, width, height, fontSize }: any) => (
  <div className="border-2 border-black p-1 flex flex-col items-center justify-center bg-white">
    <div className="w-full flex overflow-hidden opacity-50 bg-[repeating-linear-gradient(90deg,#000_0px,#000_1px,transparent_1px,transparent_3px,#000_3px,#000_4px,transparent_4px,transparent_5px)]" style={{height: 30}} />
    <span className="font-mono font-bold mt-1 text-black" style={{ fontSize: fontSize || 10 }}>{value}</span>
  </div>
);
export default function PrintView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const match = window.location.hash.match(/#\/print\/([A-Z_]+)\/(\d+)/);
  const searchParams = new URLSearchParams(window.location.hash.split('?')[1] || '');

  useEffect(() => {
    if (match) {
      const kind = match[1];
      const id = parseInt(match[2]);
      const isReprint = searchParams.get('reprint') === 'true';
      const labelQty = parseInt(searchParams.get('qty') || '1');

      (window as any).ipcRenderer.invoke('get-print-data', kind, id).then((res: any) => {
        if (res) {
          setData({ ...res, kind, isReprint, labelQty });
          setTimeout(() => {
            window.print();
          }, 500);
        }
        setLoading(false);
      }).catch((err: any) => {
        console.error("Print Error:", err);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) return <div className="p-10 font-mono text-center">Loading print data...</div>;
  if (!data) return <div className="p-10 font-mono text-center text-red-500">Document not found or invalid URL.</div>;

  const { settings, sale, items, cn, job, kind, isReprint, product, labelQty } = data;

  const toINR = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((paise || 0) / 100);

  if (kind === 'LABEL') {
    if (!product) return <div className="p-10 font-mono text-center text-red-500">Product data missing for label.</div>;
    const labels = Array.from({ length: labelQty || 1 });
    return (
      <div className="bg-white text-black min-h-screen p-4 flex flex-wrap gap-4 items-start content-start">
        {labels.map((_, i) => (
          <div key={i} className="flex flex-col items-center justify-center border-2 border-black p-2 bg-white" style={{ width: '50mm', height: '25mm', overflow: 'hidden' }}>
            <span className="text-[9px] font-bold tracking-widest font-mono uppercase text-black leading-none">{settings.shop_name || 'CHAUHAN ELECTRONICS'}</span>
            <span className="font-bold text-[10px] mt-0.5 text-center leading-tight truncate w-full">
              {product.brand_name} {product.model_name}
            </span>
            <div className="my-0.5 transform scale-75 origin-top">
              <Barcode value={product.sku_code} format="CODE128" width={1.2} height={25} fontSize={10} margin={0} displayValue={true} />
            </div>
            <div className="flex justify-between w-full text-[9px] font-bold font-mono px-1">
              <span>Wty: {product.warranty_months}m</span>
              <span>{toINR(product.counter_price)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const numToWords = (numInPaise: number) => {
    const amount = numInPaise / 100;
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);

    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];

    const inWords = (n: number): string => {
        if (n === 0) return '';
        const s = ('000000000' + n).slice(-9);
        const match = s.match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!match) return '';
        let str = '';
        str += parseInt(match[1]) !== 0 ? (a[Number(match[1])] || b[match[1][0] as any as number] + a[match[1][1] as any as number]) + 'Crore ' : '';
        str += parseInt(match[2]) !== 0 ? (a[Number(match[2])] || b[match[2][0] as any as number] + a[match[2][1] as any as number]) + 'Lakh ' : '';
        str += parseInt(match[3]) !== 0 ? (a[Number(match[3])] || b[match[3][0] as any as number] + a[match[3][1] as any as number]) + 'Thousand ' : '';
        str += parseInt(match[4]) !== 0 ? (a[Number(match[4])] || b[match[4][0] as any as number] + a[match[4][1] as any as number]) + 'Hundred ' : '';
        str += parseInt(match[5]) !== 0 ? (a[Number(match[5])] || b[match[5][0] as any as number] + a[match[5][1] as any as number]) : '';
        return str.trim();
    };

    let result = '';
    if (rupees > 0) {
        result += inWords(rupees) + ' Rupees';
    }
    if (paise > 0) {
        if (rupees > 0) result += ' and ';
        result += inWords(paise) + ' Paise';
    }
    if (result === '') {
        return 'Zero Rupees Only';
    }
    return result + ' Only';
  };

  const isInterState = kind === 'SALE' && sale.igst > 0;

  return (
    <div className="bg-white text-black min-h-screen p-8 max-w-4xl mx-auto font-sans" style={{ width: '210mm' }}>
      {/* HEADER */}
      <div className="text-center mb-6 border-b-2 border-black pb-4">
        <h1 className="text-3xl font-bold uppercase">{settings.shop_name || 'CHAUHAN ELECTRONICS'}</h1>
        <p className="text-sm">{settings.address}</p>
        <p className="text-sm font-bold mt-1">GSTIN: {settings.gstin} | State Code: {settings.state_code}</p>
      </div>

      {isReprint && <div className="text-center text-xl font-bold mb-4 uppercase tracking-widest border border-black p-1 w-max mx-auto">*** DUPLICATE COPY ***</div>}

      {/* METADATA */}
      <div className="flex justify-between mb-6">
        <div className="border border-black p-4 w-1/2 mr-2">
          <p className="text-xs uppercase font-bold text-gray-500">Billed To:</p>
          {kind === 'SALE' || kind === 'QUOTATION' ? (
            <>
              <p className="font-bold">{sale.customer_name || 'Cash Customer'}</p>
              <p>Phone: {sale.customer_phone || 'N/A'}</p>
              <p>GSTIN: {sale.customer_gstin || 'Unregistered'}</p>
            </>
          ) : kind === 'CREDIT_NOTE' ? (
            <>
              <p className="font-bold">{cn.customer_name || 'Cash Customer'}</p>
              <p>GSTIN: {cn.customer_gstin || 'Unregistered'}</p>
            </>
          ) : kind === 'REPAIR' ? (
            <>
              <p className="font-bold">{job.customer_name || 'Cash Customer'}</p>
              <p>Phone: {job.customer_phone || 'N/A'}</p>
              <p>GSTIN: {job.customer_gstin || 'Unregistered'}</p>
            </>
          ) : null}
        </div>
        <div className="border border-black p-4 w-1/2 ml-2">
          {kind === 'SALE' || kind === 'QUOTATION' ? (
            <>
              <h2 className="text-lg font-bold uppercase mb-2">{kind === 'QUOTATION' ? 'PROFORMA QUOTATION' : 'TAX INVOICE'}</h2>
              <p><strong>{kind === 'QUOTATION' ? 'Quotation No:' : 'Invoice No:'}</strong> {sale.invoice_no}</p>
              <p><strong>Date:</strong> {new Date(sale.created_at).toLocaleDateString()}</p>
              {kind === 'QUOTATION' ? (
                <p><strong>Valid Until:</strong> {new Date(sale.valid_until).toLocaleDateString()}</p>
              ) : (
                <p><strong>Payment Mode:</strong> {sale.payment_mode}</p>
              )}
            </>
          ) : kind === 'CREDIT_NOTE' ? (
            <>
              <h2 className="text-lg font-bold uppercase mb-2">CREDIT NOTE</h2>
              <p><strong>CN No:</strong> {cn.cn_no}</p>
              <p><strong>Against Invoice:</strong> {cn.invoice_no}</p>
              <p><strong>Date:</strong> {new Date(cn.created_at).toLocaleDateString()}</p>
            </>
          ) : kind === 'REPAIR' ? (
            <>
              <h2 className="text-lg font-bold uppercase mb-2">REPAIR BILL</h2>
              <p><strong>Job No:</strong> {job.job_no}</p>
              <p><strong>Intake Date:</strong> {new Date(job.intake_date).toLocaleDateString()}</p>
              <p><strong>Status:</strong> {job.status}</p>
            </>
          ) : null}
        </div>
      </div>

      {/* TABLE */}
      {(kind === 'SALE' || kind === 'QUOTATION') && (
        <table className="w-full border-collapse border border-black text-sm mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-left">S.No</th>
              <th className="border border-black p-2 text-left">Item / Model</th>
              <th className="border border-black p-2 text-left">HSN</th>
              <th className="border border-black p-2 text-center">Qty</th>
              <th className="border border-black p-2 text-right">Rate</th>
              <th className="border border-black p-2 text-right">Taxable</th>
              {isInterState ? (
                <th className="border border-black p-2 text-right">IGST</th>
              ) : (
                <>
                  <th className="border border-black p-2 text-right">CGST</th>
                  <th className="border border-black p-2 text-right">SGST</th>
                </>
              )}
              <th className="border border-black p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, idx: number) => {
              const itemGstRate = item.gst_rate || item.tax_rate || 18;
              const lineTotal = item.line_total || item.total_amt || 0;
              const unitPrice = item.unit_price || item.price || 0;
              const taxable = (lineTotal * 100) / (100 + itemGstRate);
              const taxAmount = lineTotal - taxable;
              
              return (
                <tr key={idx}>
                  <td className="border border-black p-2">{idx + 1}</td>
                  <td className="border border-black p-2">
                    {item.model_name}
                    {item.serial_number && <div className="text-xs text-gray-500">S/N: {item.serial_number}</div>}
                  </td>
                  <td className="border border-black p-2">{item.hsn_code || '8544'}</td>
                  <td className="border border-black p-2 text-center">{item.quantity}</td>
                  <td className="border border-black p-2 text-right">{(unitPrice / 100).toFixed(2)}</td>
                  <td className="border border-black p-2 text-right">{(taxable / 100).toFixed(2)}</td>
                  {isInterState ? (
                    <td className="border border-black p-2 text-right">{(taxAmount / 100).toFixed(2)} ({itemGstRate}%)</td>
                  ) : (
                    <>
                      <td className="border border-black p-2 text-right">{((taxAmount / 2) / 100).toFixed(2)} ({itemGstRate/2}%)</td>
                      <td className="border border-black p-2 text-right">{((taxAmount / 2) / 100).toFixed(2)} ({itemGstRate/2}%)</td>
                    </>
                  )}
                  <td className="border border-black p-2 text-right">{(lineTotal / 100).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {kind === 'CREDIT_NOTE' && (
        <table className="w-full border-collapse border border-black text-sm mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-left">Reason</th>
              <th className="border border-black p-2 text-left">Item / Model</th>
              <th className="border border-black p-2 text-right">Credit Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-2">{cn.reason}</td>
              <td className="border border-black p-2">{data.instance.model_name}</td>
              <td className="border border-black p-2 text-right">{(cn.amount / 100).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      )}

      {kind === 'REPAIR' && (
        <table className="w-full border-collapse border border-black text-sm mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-left">S.No</th>
              <th className="border border-black p-2 text-left">Part Name</th>
              <th className="border border-black p-2 text-center">Qty</th>
              <th className="border border-black p-2 text-right">Cost</th>
            </tr>
          </thead>
          <tbody>
            {items && items.map((item: any, idx: number) => (
              <tr key={idx}>
                <td className="border border-black p-2">{idx + 1}</td>
                <td className="border border-black p-2">{item.model_name}</td>
                <td className="border border-black p-2 text-center">{item.qty}</td>
                <td className="border border-black p-2 text-right">{(item.cost / 100).toFixed(2)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} className="border border-black p-2 text-right font-bold">Labour Cost</td>
              <td className="border border-black p-2 text-right">{(job.labour_cost / 100).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      )}

      {/* FOOTER */}
      <div className="flex justify-between items-end border-t-2 border-black pt-4">
        <div className="w-1/2">
          <p className="text-sm mb-8"><strong>Amount in words:</strong> <br/>{numToWords(kind === 'SALE' ? sale.grand_total : kind === 'REPAIR' ? job.final_cost : cn.amount)}</p>
          <div className="border-t border-black w-48 mt-10">
            <p className="text-xs text-center mt-1">Customer Signature</p>
          </div>
        </div>
        <div className="w-1/3 text-right">
          {(kind === 'SALE' || kind === 'QUOTATION') && (
            <div className="mb-8 space-y-1">
              <div className="flex justify-between"><span>Taxable Value:</span> <span>{((sale.subtotal || sale.total_taxable) / 100).toFixed(2)}</span></div>
              {(sale.discount || 0) > 0 && <div className="flex justify-between text-red-600"><span>Discount:</span> <span>-{(sale.discount / 100).toFixed(2)}</span></div>}
              {(sale.trade_in_discount || 0) > 0 && <div className="flex justify-between text-red-600"><span>Trade-In Val:</span> <span>-{(sale.trade_in_discount / 100).toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-lg border-t border-black pt-1"><span>GRAND TOTAL:</span> <span>₹{(sale.grand_total / 100).toFixed(2)}</span></div>
            </div>
          )}
          {kind === 'REPAIR' && (
            <div className="mb-8 space-y-1">
              <div className="flex justify-between"><span>Parts + Labour:</span> <span>{((job.parts_cost + job.labour_cost) / 100).toFixed(2)}</span></div>
              <div className="flex justify-between text-red-600"><span>Advance Paid:</span> <span>-{(job.advance_paid / 100).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg border-t border-black pt-1"><span>FINAL COST:</span> <span>₹{(job.final_cost / 100).toFixed(2)}</span></div>
            </div>
          )}
          <div className="border-t border-black w-48 ml-auto mt-10">
            <p className="text-xs text-center mt-1">Authorized Signatory</p>
            <p className="text-xs text-center font-bold">{settings.shop_name}</p>
          </div>
        </div>
      </div>

    </div>
  );
}
