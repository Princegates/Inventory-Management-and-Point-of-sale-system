import { useEffect, useRef, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import { formatMoney } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import Receipt from './Receipt';
import CloseSessionModal from './CloseSessionModal';

const PAYMENT_METHODS = ['cash', 'mobile_money', 'card', 'bank_transfer', 'other'];

export default function POSScreen({ session, onSessionClosed }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [payments, setPayments] = useState([{ method: 'cash', amount: '' }]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receiptSale, setReceiptSale] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query) { setResults([]); return; }
    const timer = setTimeout(() => {
      api.get('/products/pos-search', { params: { q: query, locationId: session.location_id } }).then((r) => setResults(r.data.products));
    }, 200);
    return () => clearTimeout(timer);
  }, [query, session.location_id]);

  useEffect(() => {
    if (!customerQuery) { setCustomerResults([]); return; }
    const timer = setTimeout(() => {
      api.get('/customers', { params: { q: customerQuery } }).then((r) => setCustomerResults(r.data.customers));
    }, 200);
    return () => clearTimeout(timer);
  }, [customerQuery]);

  const addToCart = (product) => {
    setCart((c) => {
      const existing = c.find((i) => i.productId === product.id);
      if (existing) return c.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...c, {
        productId: product.id, name: product.name, sku: product.sku,
        unitPrice: Number(product.selling_price), taxRate: Number(product.tax_rate),
        quantity: 1, discountPercent: 0,
      }];
    });
    setQuery(''); setResults([]);
    searchRef.current?.focus();
  };

  const onSearchKeyDown = async (e) => {
    if (e.key !== 'Enter' || !query) return;
    e.preventDefault();
    try {
      const { data } = await api.get(`/products/lookup/${encodeURIComponent(query)}`);
      addToCart(data.product);
    } catch {
      if (results.length === 1) addToCart(results[0]);
    }
  };

  const updateLine = (productId, key, value) => setCart((c) => c.map((i) => i.productId === productId ? { ...i, [key]: value } : i));
  const removeLine = (productId) => setCart((c) => c.filter((i) => i.productId !== productId));

  const lineTotal = (line) => {
    const gross = line.unitPrice * line.quantity;
    const discount = gross * (Number(line.discountPercent) || 0) / 100;
    const taxable = gross - discount;
    const tax = taxable * line.taxRate / 100;
    return { gross, discount, tax, total: taxable + tax };
  };

  const totals = cart.reduce((acc, line) => {
    const t = lineTotal(line);
    return { subtotal: acc.subtotal + t.gross, discount: acc.discount + t.discount, tax: acc.tax + t.tax, total: acc.total + t.total };
  }, { subtotal: 0, discount: 0, tax: 0, total: 0 });

  const paymentsTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const changeDue = Math.max(0, paymentsTotal - totals.total);

  const addPaymentRow = () => setPayments((p) => [...p, { method: 'cash', amount: '' }]);
  const updatePayment = (idx, key, value) => setPayments((p) => p.map((row, i) => i === idx ? { ...row, [key]: value } : row));
  const removePayment = (idx) => setPayments((p) => p.filter((_, i) => i !== idx));

  const fillExactCash = () => setPayments([{ method: 'cash', amount: totals.total.toFixed(2) }]);

  const checkout = async () => {
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/sales', {
        locationId: session.location_id, cashierSessionId: session.id, terminalId: session.terminal_id,
        customerId: customer?.id || null,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, discountPercent: Number(i.discountPercent) || 0 })),
        payments: payments.filter((p) => Number(p.amount) > 0).map((p) => ({ method: p.method, amount: Number(p.amount) })),
      });
      setReceiptSale(data.sale);
      setCheckoutOpen(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForNewSale = () => {
    setCart([]); setCustomer(null); setCustomerQuery(''); setPayments([{ method: 'cash', amount: '' }]);
    setReceiptSale(null);
    searchRef.current?.focus();
  };

  return (
    <div className="grid grid-cols-3 gap-4 h-[calc(100vh-6.5rem)]">
      <div className="col-span-2 flex flex-col gap-3">
        <div className="card p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">{session.location?.name}</span> &middot; Terminal {session.terminal_id} &middot; {user?.name}
            </div>
            <button className="btn-secondary text-xs" onClick={() => setCloseOpen(true)}>Close Session</button>
          </div>
          <input
            ref={searchRef}
            className="input"
            placeholder="Scan barcode or search product name / SKU"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
          />
          {results.length > 0 && (
            <div className="mt-2 border border-slate-200 rounded-md divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {results.map((p) => {
                const qty = p.inventory?.reduce((s, i) => s + i.quantity, 0) ?? null;
                return (
                  <button key={p.id} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex justify-between" onClick={() => addToCart(p)}>
                    <span>{p.name} <span className="text-slate-400 text-xs">({p.sku})</span></span>
                    <span className="text-slate-500">{formatMoney(p.selling_price)} {qty !== null && <span className="text-xs">&middot; {qty} in stock</span>}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="card flex-1 overflow-y-auto">
          <table className="table-base">
            <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Discount %</th><th>Total</th><th></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {cart.map((line) => {
                const t = lineTotal(line);
                return (
                  <tr key={line.productId}>
                    <td>{line.name}</td>
                    <td>
                      <input type="number" min="1" className="input w-16" value={line.quantity} onChange={(e) => updateLine(line.productId, 'quantity', Math.max(1, Number(e.target.value)))} />
                    </td>
                    <td>{formatMoney(line.unitPrice)}</td>
                    <td>
                      <input type="number" min="0" max="100" className="input w-16" value={line.discountPercent} onChange={(e) => updateLine(line.productId, 'discountPercent', e.target.value)} />
                    </td>
                    <td>{formatMoney(t.total)}</td>
                    <td><button className="text-red-500 text-xs" onClick={() => removeLine(line.productId)}>Remove</button></td>
                  </tr>
                );
              })}
              {cart.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-10">Cart is empty - scan or search a product to begin</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-4 flex flex-col">
        <h2 className="font-semibold text-slate-800 mb-3">Order Summary</h2>

        <div className="mb-3">
          <label className="label">Customer (optional)</label>
          {customer ? (
            <div className="flex items-center justify-between text-sm bg-slate-50 rounded-md px-2 py-1.5">
              <span>{customer.name}</span>
              <button className="text-xs text-red-500" onClick={() => setCustomer(null)}>Remove</button>
            </div>
          ) : (
            <>
              <input className="input" placeholder="Search customer" value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} />
              {customerResults.length > 0 && (
                <div className="mt-1 border border-slate-200 rounded-md divide-y divide-slate-100 max-h-32 overflow-y-auto">
                  {customerResults.map((c) => (
                    <button key={c.id} className="w-full text-left px-2 py-1 text-xs hover:bg-slate-50" onClick={() => { setCustomer(c); setCustomerQuery(''); setCustomerResults([]); }}>{c.name} {c.phone && `(${c.phone})`}</button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="text-sm space-y-1 mb-4">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(totals.subtotal)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>-{formatMoney(totals.discount)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{formatMoney(totals.tax)}</span></div>
          <div className="flex justify-between text-lg font-semibold border-t border-slate-200 pt-2"><span>Total</span><span>{formatMoney(totals.total)}</span></div>
        </div>

        <button className="btn-primary w-full mb-2" disabled={!cart.length} onClick={() => setCheckoutOpen(true)}>Checkout</button>
        <button className="btn-secondary w-full text-xs" disabled={!cart.length} onClick={() => setCart([])}>Clear Cart</button>

        {checkoutOpen && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Payment</h3>
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1.5 mb-2">{error}</div>}
            <div className="space-y-2 mb-2">
              {payments.map((p, idx) => (
                <div key={idx} className="flex gap-2">
                  <select className="input text-xs" value={p.method} onChange={(e) => updatePayment(idx, 'method', e.target.value)}>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replaceAll('_', ' ')}</option>)}
                  </select>
                  <input type="number" step="0.01" className="input text-xs" placeholder="Amount" value={p.amount} onChange={(e) => updatePayment(idx, 'amount', e.target.value)} />
                  {payments.length > 1 && <button className="text-red-500 text-xs" onClick={() => removePayment(idx)}>&times;</button>}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-3">
              <button type="button" className="btn-secondary text-xs" onClick={addPaymentRow}>+ Split payment</button>
              <button type="button" className="btn-secondary text-xs" onClick={fillExactCash}>Exact cash</button>
            </div>
            <div className="text-xs text-slate-500 mb-3">Change due: <span className="font-semibold text-slate-700">{formatMoney(changeDue)}</span></div>
            <button className="btn-primary w-full" disabled={submitting || paymentsTotal < totals.total - 0.01} onClick={checkout}>
              {submitting ? 'Processing...' : `Complete Sale (${formatMoney(totals.total)})`}
            </button>
          </div>
        )}
      </div>

      {receiptSale && <Receipt sale={receiptSale} onClose={() => setReceiptSale(null)} onNewSale={resetForNewSale} />}
      <CloseSessionModal
        session={session}
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        onClosed={() => { setCloseOpen(false); onSessionClosed(); }}
      />
    </div>
  );
}
