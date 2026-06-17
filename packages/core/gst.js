"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateGSTSplit = calculateGSTSplit;
exports.getTaxableValue = getTaxableValue;
function calculateGSTSplit(taxableAmountPaise, gstRate, // percentage, e.g. 18
shopStateCode, customerGSTIN) {
    // Extract state code from customer GSTIN (first 2 characters) if available and numeric
    var customerStateCode = shopStateCode;
    if (customerGSTIN && customerGSTIN.trim().length >= 2) {
        var code = customerGSTIN.trim().substring(0, 2);
        if (/^\d+$/.test(code)) {
            customerStateCode = code;
        }
    }
    // Calculate total tax
    var totalTaxPaise = Math.round((taxableAmountPaise * gstRate) / 100);
    if (customerStateCode === shopStateCode) {
        // Intra-state split: CGST (50%) + SGST (50%)
        var halfTax = Math.round(totalTaxPaise / 2);
        return {
            cgst: halfTax,
            sgst: totalTaxPaise - halfTax, // handle odd-paise division correctly
            igst: 0,
        };
    }
    else {
        // Inter-state: IGST (100%)
        return {
            cgst: 0,
            sgst: 0,
            igst: totalTaxPaise,
        };
    }
}
function getTaxableValue(lineTotalPaise, gstRate) {
    // Reverse calculate the taxable value from line total
    // LineTotal = TaxableValue * (1 + GST_Rate / 100) => TaxableValue = LineTotal / (1 + GST_Rate / 100)
    return Math.round(lineTotalPaise / (1 + gstRate / 100));
}
