import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import { formatMoney, formatDateTime } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

export default function Sales() {
  const { hasPermission } = useAuth();
  const [sales, setSales] = useState([]);
  const [detail, setDetail] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [returnItems, setReturnItems] = useState(null);
  const [returnSelections, setReturnSelections] = useState({});

  const load = async () => {
    const { data } = await api.get('/sales', { params: { pageSize: 50 } });
    setSales(data.sales);
  };
  useEffect(() => { load(); }, []);

  const openDetail = async (sale) => {
    const { data } = await api.get(`/sales/${sale.id}`);
    setDetail(data.sale);
  };

  const voidSale = async () => {
    try {
      await api.post(`/sales/${detail.id}/void`, { reason: voidReason });
      setDetail(null); setVoidReason('');
      load();
    } catch (err) { alert(apiErrorMessage(err)); }
  };

  const openReturn = async () => {
    const { data } = await api.get(`/returns/sale/${detail.id}/returnable`);
    setReturnItems(data.items);
    const sel = {};
    data.items.forEach((i) => { sel[i.saleItemId] = { quantity: 0, condition: 'resalable' }; });
    setReturnSelections(sel);
  };

  const submitReturn = async () => {
    const items = Object.entries(returnSelections)
      .filter(([, v]) => Number(v.quantity) > 0)
      .map(([saleItemId, v]) => ({ saleItemId: Number(saleItemId), quantity: Number(v.quantity), condition: v.condition }));
    if (!items.length) return;
    try {
      await api.post('/returns', { saleId: detail.id, items, reason: 'Customer return' });
      setReturnItems(null);
      openDetail(detail);
      load();
    } catch (err) { alert(apiErrorMessage(err)); }
  };

  return (
    <div>
      <PageHeader title="Sales" subtitle="All POS transactions" />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Sale #</th><th>Location</th><th>Cashier</th><th>Total</th><th>Status</th><th>Date</th><th></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {sales.map((s) => (
              <tr key={s.id}>
                <td className="font-medium text-slate-800">{s.sale_number}</td>
                <td>{s.location?.name}</td>
                <td>{s.cashier?.name}</td>
                <td>{formatMoney(s.total)}</td>
                <td><span className={`badge ${s.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{s.status}</span></td>
                <td>{formatDateTime(s.createdAt)}</td>
                <td><button className="text-indigo-600 text-xs hover:underline" onClick={() => openDetail(s)}>View</button></td>
              </tr>
            ))}
            {sales.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-6">No sales yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={!!detail} title={detail ? `Sale ${detail.sale_number}` : ''} onClose={() => setDetail(null)} width="max-w-2xl">
        {detail && (
          <div>
            <div className="flex items-center justify-between mb-3 text-sm text-slate-600">
              <div>
                <p>Receipt: {detail.receipt_number}</p>
                <p>Cashier: {detail.cashier?.name} &middot; {formatDateTime(detail.createdAt)}</p>
              </div>
              <span className={`badge ${detail.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{detail.status}</span>
            </div>

            <table className="table-base mb-3">
              <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Discount</th><th>Tax</th><th>Total</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {detail.items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.product?.name}</td>
                    <td>{i.quantity} {i.quantity_returned > 0 && <span className="text-xs text-amber-600">({i.quantity_returned} returned)</span>}</td>
                    <td>{formatMoney(i.unit_price)}</td>
                    <td>{formatMoney(i.discount)}</td>
                    <td>{formatMoney(i.tax)}</td>
                    <td>{formatMoney(i.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-sm space-y-1 mb-3">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(detail.subtotal)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>-{formatMoney(detail.discount_total)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{formatMoney(detail.tax_total)}</span></div>
              <div className="flex justify-between font-semibold"><span>Total</span><span>{formatMoney(detail.total)}</span></div>
            </div>

            {detail.status === 'completed' && (
              <div className="flex gap-2 pt-2 border-t border-slate-200">
                {hasPermission('REFUND_SALE') && <button className="btn-secondary text-xs" onClick={openReturn}>Process Return</button>}
                {hasPermission('VOID_SALE') && (
                  <div className="flex gap-2 items-center flex-1">
                    <input className="input text-xs" placeholder="Reason for void" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
                    <button className="btn-danger text-xs shrink-0" disabled={!voidReason} onClick={voidSale}>Void Sale</button>
                  </div>
                )}
              </div>
            )}
            {detail.status === 'voided' && <p className="text-xs text-red-600">Voided: {detail.void_reason}</p>}
          </div>
        )}
      </Modal>

      <Modal open={!!returnItems} title="Process Return" onClose={() => setReturnItems(null)}>
        {returnItems && (
          <div className="space-y-3">
            {returnItems.map((i) => (
              <div key={i.saleItemId} className="flex items-center gap-2 text-sm border-b border-slate-100 pb-2">
                <span className="flex-1">{i.product?.name}<br /><span className="text-xs text-slate-400">Returnable: {i.returnableQuantity}</span></span>
                <input
                  type="number" min="0" max={i.returnableQuantity} className="input w-20"
                  value={returnSelections[i.saleItemId]?.quantity ?? 0}
                  onChange={(e) => setReturnSelections((s) => ({ ...s, [i.saleItemId]: { ...s[i.saleItemId], quantity: e.target.value } }))}
                />
                <select
                  className="input w-32"
                  value={returnSelections[i.saleItemId]?.condition ?? 'resalable'}
                  onChange={(e) => setReturnSelections((s) => ({ ...s, [i.saleItemId]: { ...s[i.saleItemId], condition: e.target.value } }))}
                >
                  <option value="resalable">Resalable</option>
                  <option value="damaged">Damaged</option>
                </select>
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => setReturnItems(null)}>Cancel</button>
              <button className="btn-primary" onClick={submitReturn}>Process Return</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
