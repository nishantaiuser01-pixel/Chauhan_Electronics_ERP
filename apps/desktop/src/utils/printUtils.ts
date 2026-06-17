export async function triggerPrint(kind: 'SALE' | 'CREDIT_NOTE' | 'REPAIR', id: number, isReprint = false) {
  try {
    const data = await (window as any).ipcRenderer.invoke('get-print-data', kind, id);
    if (!data) return;

    if (isReprint) {
      await (window as any).ipcRenderer.invoke('log-reprint', kind, id, 1);
    }

    const { settings } = data;
    const type = settings.printer_type || 'A4';
    
    if (type === 'THERMAL') {
      const text = generateThermalText(kind, data, settings.paper_width || '80mm', isReprint);
      await (window as any).ipcRenderer.invoke('print-thermal', text);
    } else {
      // For A4, navigate to print view in a new window or use hash routing.
      window.open(`/#/print/${kind}/${id}?reprint=${isReprint}`, '_blank', 'width=800,height=1000');
    }
  } catch (err) {
    console.error("Print Error:", err);
  }
}

function generateThermalText(kind: string, data: any, width: string, isReprint: boolean) {
  const lineLen = width === '58mm' ? 32 : 48;
  const pad = (str: string, len: number) => (str + ' '.repeat(len)).substring(0, len);
  const center = (str: string) => str.padStart((lineLen + str.length) / 2).padEnd(lineLen);
  const sep = '-'.repeat(lineLen) + '\n';
  
  let out = '';
  out += center(data.settings.shop_name || 'CHAUHAN ELECTRONICS') + '\n';
  out += center(data.settings.address || '') + '\n';
  out += center('GSTIN: ' + (data.settings.gstin || '')) + '\n';
  out += sep;

  if (isReprint) out += center('*** DUPLICATE ***') + '\n' + sep;

  if (kind === 'SALE') {
    out += `Inv No: ${data.sale.invoice_no}\n`;
    out += `Date: ${new Date(data.sale.created_at).toLocaleDateString()}\n`;
    out += `Customer: ${data.sale.customer_name || 'Cash'}\n`;
    out += sep;
    out += pad('Item', lineLen - 15) + 'Qty' + '   ' + 'Total\n';
    out += sep;
    data.items.forEach((item: any) => {
      let name = item.model_name.substring(0, lineLen - 16);
      out += pad(name, lineLen - 15) + pad(item.quantity.toString(), 3) + ' ' + (item.line_total / 100).toFixed(2).padStart(8) + '\n';
    });
    out += sep;
    out += pad('TOTAL', lineLen - 10) + (data.sale.grand_total / 100).toFixed(2).padStart(10) + '\n';
  } else if (kind === 'CREDIT_NOTE') {
    out += center('CREDIT NOTE') + '\n';
    out += `CN No: ${data.cn.cn_no}\n`;
    out += `Against Inv: ${data.cn.invoice_no}\n`;
    out += `Amount: Rs ${(data.cn.amount / 100).toFixed(2)}\n`;
  }
  
  out += sep;
  out += center('Thank you for your business!') + '\n\n\n';
  return out;
}
