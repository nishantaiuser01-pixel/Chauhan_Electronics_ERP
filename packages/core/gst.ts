export interface GSTSplit {
  cgst: number; // paise
  sgst: number; // paise
  igst: number; // paise
}

export function calculateGSTSplit(
  taxableAmountPaise: number,
  gstRate: number, // percentage, e.g. 18
  shopStateCode: string,
  customerGSTIN?: string | null
): GSTSplit {
  // Extract state code from customer GSTIN (first 2 characters) if available and numeric
  let customerStateCode = shopStateCode;
  if (customerGSTIN && customerGSTIN.trim().length >= 2) {
    const code = customerGSTIN.trim().substring(0, 2);
    if (/^\d+$/.test(code)) {
      customerStateCode = code;
    }
  }

  // Calculate total tax
  const totalTaxPaise = Math.round((taxableAmountPaise * gstRate) / 100);

  if (customerStateCode === shopStateCode) {
    // Intra-state split: CGST (50%) + SGST (50%)
    const halfTax = Math.round(totalTaxPaise / 2);
    return {
      cgst: halfTax,
      sgst: totalTaxPaise - halfTax, // handle odd-paise division correctly
      igst: 0,
    };
  } else {
    // Inter-state: IGST (100%)
    return {
      cgst: 0,
      sgst: 0,
      igst: totalTaxPaise,
    };
  }
}
export function getTaxableValue(lineTotalPaise: number, gstRate: number): number {
  // Reverse calculate the taxable value from line total
  // LineTotal = TaxableValue * (1 + GST_Rate / 100) => TaxableValue = LineTotal / (1 + GST_Rate / 100)
  return Math.round(lineTotalPaise / (1 + gstRate / 100));
}
