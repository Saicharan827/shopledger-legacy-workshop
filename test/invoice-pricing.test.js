const test = require('node:test');
const assert = require('node:assert/strict');
const pricing = require('../lib/pricing');
const invoice = require('../lib/invoice');
const reports = require('../lib/reports');

test('Invoice uses the same HSN GST figures as the billed order', function () {
  const line = { id: 1, name: 'Rice', sku: 'GRN-001', hsn: '1006', price: 1000, qty: 1 };
  const billed = pricing.computeTotals([line], '');
  const printed = invoice.computeInvoiceFigures({ items: [line], coupon: '' });

  assert.deepEqual(
    { subtotal: billed.subtotal, tax: billed.tax, cgst: billed.cgst, sgst: billed.sgst, total: billed.total },
    { subtotal: 1000, tax: 50, cgst: 25, sgst: 25, total: 1050 }
  );
  assert.deepEqual(
    { subtotal: printed.subtotal, tax: printed.tax, cgst: printed.cgst, sgst: printed.sgst, total: printed.total, gstPercent: printed.rows[0].gstPercent },
    { subtotal: 1000, tax: billed.tax, cgst: billed.cgst, sgst: billed.sgst, total: billed.total, gstPercent: 5 }
  );
});

test('Invoice applies the billed coupon discount and maximum cap', function () {
  const line = { id: 8, name: 'Tea', sku: 'BEV-001', hsn: '0902', price: 3000, qty: 1 };
  const billed = pricing.computeTotals([line], 'SAVE10');
  const printed = invoice.computeInvoiceFigures({ items: [line], coupon: 'SAVE10' });

  assert.deepEqual(
    { discount: billed.discount, tax: billed.tax, total: billed.total },
    { discount: 150, tax: 513, total: 3363 }
  );
  assert.deepEqual(
    { discount: printed.discount, tax: printed.tax, total: printed.total },
    { discount: billed.discount, tax: billed.tax, total: billed.total }
  );
});

test('GST reconciliation matches invoice figures to the billed order', function () {
  const order = {
    id: 42,
    date: '01/01/2022',
    customer: 'In-memory customer',
    coupon: 'SAVE10',
    subtotal: 1000,
    discount: 100,
    tax: 45,
    total: 945,
    items: [{ id: 1, name: 'Rice', hsn: '1006', price: 1000, qty: 1 }]
  };

  const result = reports.getGstReconciliation({ orders: [order] });

  assert.equal(result.totalChecked, 1);
  assert.equal(result.mismatchCount, 0);
  assert.equal(result.totalDelta, 0);
  assert.deepEqual(
    { invoiceTax: result.rows[0].invoiceTax, invoiceTotal: result.rows[0].invoiceTotal, delta: result.rows[0].delta, matched: result.rows[0].matched },
    { invoiceTax: 45, invoiceTotal: 945, delta: 0, matched: true }
  );
});

// These characterization cases use only in-memory objects and never access data/db.json.