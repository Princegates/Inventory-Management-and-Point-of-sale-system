import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import { formatMoney, formatDate } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = {
  draft: 'bg-slate-200 text-slate-700', submitted: 'bg-blue-100 text-blue-700', approved: 'bg-[var(--brand-100)] text-[var(--brand-700)]',
  partially_received: 'bg-amber-100 text-amber-700', fully_received: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700', closed: 'bg-slate-200 text-slate-700',
};

export default function PurchaseOrders() {
  const { hasPermission } = useAuth();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ supplierId: '', locationId: '', expectedDate: '', notes: '', items: [] });

  const load = async () => {
    const { data } = await api.get('/purchase-orders');
    setOrders(data.purchaseOrders);
  };

  useEffect(() => {
    load();
    api.get('/suppliers').then((r) => setSuppliers(r.data.suppliers));
    api.get('/locations', { params: { type: 'warehouse' } }).then((r) => setLocations(r.data.locations));
    api.get('/products', { params: { pageSize: 200 } }).then((r) => setProducts(r.data.products));
  }, []);

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { productId: '', quantity: 1, unitCost: 0 }] }));
  const updateItem = (idx, key, value) => setForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [key]: value } : it) }));
  const removeItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/purchase-orders', form);
      setModalOpen(false);
      setForm({ supplierId: '', locationId: '', expectedDate: '', notes: '', items: [] });
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  };

  const setStatus = async (order, status) => {
    try { await api.post(`/purchase-orders/${order.id}/status`, { status }); load(); }
    catch (err) { alert(apiErrorMessage(err)); }
  };

  const total = form.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0), 0);

  return (
    <div>
      <PageHeader title="Purchase Orders" subtitle="Create and track purchase orders with suppliers" actions={hasPermission('CREATE_PURCHASE') && <button className="btn-primary" onClick={() => setModalOpen(true)}>+ New Purchase Order</button>} />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>PO Number</th><th>Supplier</th><th>Warehouse</th><th>Total</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="font-medium text-slate-800">{o.po_number}</td>
                <td>{o.supplier?.name}</td>
                <td>{o.location?.name}</td>
                <td>{formatMoney(o.total_cost)}</td>
                <td><span className={`badge capitalize ${STATUS_COLORS[o.status]}`}>{o.status.replaceAll('_', ' ')}</span></td>
                <td>{formatDate(o.createdAt)}</td>
                <td className="space-x-2">
                  {o.status === 'draft' && hasPermission('CREATE_PURCHASE') && <button className="text-[var(--brand-600)] text-xs hover:underline" onClick={() => setStatus(o, 'submitted')}>Submit</button>}
                  {o.status === 'submitted' && hasPermission('APPROVE_PURCHASE') && <button className="text-[var(--brand-600)] text-xs hover:underline" onClick={() => setStatus(o, 'approved')}>Approve</button>}
                  {['draft', 'submitted', 'approved'].includes(o.status) && <button className="text-red-500 text-xs hover:underline" onClick={() => setStatus(o, 'cancelled')}>Cancel</button>}
                </td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-6">No purchase orders yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} title="New Purchase Order" onClose={() => setModalOpen(false)} width="max-w-2xl">
        <form onSubmit={submit} className="space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Supplier</label>
              <select required className="input" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                <option value="">Select</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Receiving Warehouse</label>
              <select required className="input" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
                <option value="">Select</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Expected Date</label>
              <input type="date" className="input" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Items</label>
              <button type="button" className="btn-secondary text-xs" onClick={addItem}>+ Add item</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select className="input flex-1" value={item.productId} onChange={(e) => updateItem(idx, 'productId', e.target.value)}>
                    <option value="">Select product</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                  <input type="number" min="1" className="input w-24" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                  <input type="number" step="0.01" className="input w-28" placeholder="Unit cost" value={item.unitCost} onChange={(e) => updateItem(idx, 'unitCost', e.target.value)} />
                  <button type="button" className="text-red-500 text-xs" onClick={() => removeItem(idx)}>Remove</button>
                </div>
              ))}
              {form.items.length === 0 && <p className="text-xs text-slate-400">No items added yet</p>}
            </div>
          </div>

          <p className="text-sm text-right font-medium">Total: {formatMoney(total)}</p>

          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={!form.items.length}>Create Purchase Order</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
