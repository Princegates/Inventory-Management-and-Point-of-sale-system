import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import { formatDateTime } from '../../utils/format';

export default function GoodsReceipts() {
  const [receipts, setReceipts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ purchaseOrderId: '', locationId: '', notes: '', items: [] });

  const load = async () => {
    const { data } = await api.get('/goods-receipts');
    setReceipts(data.goodsReceipts);
  };

  useEffect(() => {
    load();
    api.get('/purchase-orders', { params: { status: 'approved' } }).then((r) => setPurchaseOrders(r.data.purchaseOrders));
    api.get('/locations', { params: { type: 'warehouse' } }).then((r) => setLocations(r.data.locations));
    api.get('/products', { params: { pageSize: 200 } }).then((r) => setProducts(r.data.products));
  }, []);

  const selectPO = (poId) => {
    const po = purchaseOrders.find((p) => String(p.id) === String(poId));
    if (!po) { setForm((f) => ({ ...f, purchaseOrderId: '', items: [] })); return; }
    setForm((f) => ({
      ...f, purchaseOrderId: poId, locationId: po.location_id,
      items: po.items.map((i) => ({ productId: i.product_id, orderedQuantity: i.quantity, receivedQuantity: i.quantity - i.quantity_received, damagedQuantity: 0, missingQuantity: 0, unitCost: i.unit_cost })),
    }));
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { productId: '', receivedQuantity: 0, damagedQuantity: 0, missingQuantity: 0, unitCost: 0 }] }));
  const updateItem = (idx, key, value) => setForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [key]: value } : it) }));
  const removeItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/goods-receipts', { ...form, purchaseOrderId: form.purchaseOrderId || null });
      setModalOpen(false);
      setForm({ purchaseOrderId: '', locationId: '', notes: '', items: [] });
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  };

  return (
    <div>
      <PageHeader title="Goods Receiving" subtitle="Confirm stock arrivals - only accepted quantities enter available inventory" actions={<button className="btn-primary" onClick={() => setModalOpen(true)}>+ Receive Stock</button>} />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Receipt #</th><th>PO #</th><th>Location</th><th>Received By</th><th>Date</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {receipts.map((r) => (
              <tr key={r.id}>
                <td className="font-medium text-slate-800">{r.receipt_number}</td>
                <td>{r.purchaseOrder?.po_number || 'Direct receipt'}</td>
                <td>{r.location?.name}</td>
                <td>{r.receiver?.name}</td>
                <td>{formatDateTime(r.received_at)}</td>
              </tr>
            ))}
            {receipts.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-6">No goods receipts yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} title="Receive Stock" onClose={() => setModalOpen(false)} width="max-w-2xl">
        <form onSubmit={submit} className="space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Against Purchase Order (optional)</label>
              <select className="input" value={form.purchaseOrderId} onChange={(e) => selectPO(e.target.value)}>
                <option value="">Direct receipt (no PO)</option>
                {purchaseOrders.map((p) => <option key={p.id} value={p.id}>{p.po_number} - {p.supplier?.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Receiving Location</label>
              <select required className="input" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
                <option value="">Select</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Items</label>
              {!form.purchaseOrderId && <button type="button" className="btn-secondary text-xs" onClick={addItem}>+ Add item</button>}
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-6 gap-2 items-center text-sm">
                  {form.purchaseOrderId ? (
                    <span className="col-span-2 truncate">{products.find((p) => p.id === item.productId)?.name || item.productId}</span>
                  ) : (
                    <select className="input col-span-2" value={item.productId} onChange={(e) => updateItem(idx, 'productId', e.target.value)}>
                      <option value="">Product</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                  <input type="number" className="input" placeholder="Good qty" value={item.receivedQuantity} onChange={(e) => updateItem(idx, 'receivedQuantity', e.target.value)} />
                  <input type="number" className="input" placeholder="Damaged" value={item.damagedQuantity} onChange={(e) => updateItem(idx, 'damagedQuantity', e.target.value)} />
                  <input type="number" className="input" placeholder="Missing" value={item.missingQuantity} onChange={(e) => updateItem(idx, 'missingQuantity', e.target.value)} />
                  <div className="flex items-center gap-1">
                    <input type="number" step="0.01" className="input" placeholder="Cost" value={item.unitCost} onChange={(e) => updateItem(idx, 'unitCost', e.target.value)} />
                    {!form.purchaseOrderId && <button type="button" className="text-red-500 text-xs" onClick={() => removeItem(idx)}>&times;</button>}
                  </div>
                </div>
              ))}
              {form.items.length === 0 && <p className="text-xs text-slate-400">No items</p>}
            </div>
          </div>

          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={!form.items.length}>Confirm Receipt</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
