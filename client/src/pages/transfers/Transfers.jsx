import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import { formatDateTime } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = {
  requested: 'bg-slate-200 text-slate-700', approved: 'bg-blue-100 text-blue-700', in_transit: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700',
};

export default function Transfers() {
  const { hasPermission } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ sourceLocationId: '', destinationLocationId: '', notes: '', items: [] });

  const load = async () => {
    const { data } = await api.get('/stock-transfers');
    setTransfers(data.stockTransfers);
  };

  useEffect(() => {
    load();
    api.get('/locations').then((r) => setLocations(r.data.locations));
    api.get('/products', { params: { pageSize: 200 } }).then((r) => setProducts(r.data.products));
  }, []);

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { productId: '', quantity: 1 }] }));
  const updateItem = (idx, key, value) => setForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [key]: value } : it) }));
  const removeItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/stock-transfers', form);
      setModalOpen(false);
      setForm({ sourceLocationId: '', destinationLocationId: '', notes: '', items: [] });
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  };

  const action = async (transfer, act) => {
    try { await api.post(`/stock-transfers/${transfer.id}/${act}`); load(); }
    catch (err) { alert(apiErrorMessage(err)); }
  };

  return (
    <div>
      <PageHeader title="Stock Transfers" subtitle="Move stock between warehouses and shops" actions={hasPermission('REQUEST_TRANSFER') && <button className="btn-primary" onClick={() => setModalOpen(true)}>+ New Transfer</button>} />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Transfer #</th><th>From</th><th>To</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {transfers.map((t) => (
              <tr key={t.id}>
                <td className="font-medium text-slate-800">{t.transfer_number}</td>
                <td>{t.sourceLocation?.name}</td>
                <td>{t.destinationLocation?.name}</td>
                <td><span className={`badge capitalize ${STATUS_COLORS[t.status]}`}>{t.status.replaceAll('_', ' ')}</span></td>
                <td>{formatDateTime(t.createdAt)}</td>
                <td className="space-x-2">
                  {t.status === 'requested' && hasPermission('APPROVE_TRANSFER') && <button className="text-indigo-600 text-xs hover:underline" onClick={() => action(t, 'approve')}>Approve</button>}
                  {t.status === 'approved' && hasPermission('ISSUE_TRANSFER') && <button className="text-indigo-600 text-xs hover:underline" onClick={() => action(t, 'issue')}>Issue</button>}
                  {t.status === 'in_transit' && hasPermission('RECEIVE_TRANSFER') && <button className="text-indigo-600 text-xs hover:underline" onClick={() => action(t, 'receive')}>Receive</button>}
                  {['requested', 'approved', 'in_transit'].includes(t.status) && <button className="text-red-500 text-xs hover:underline" onClick={() => action(t, 'cancel')}>Cancel</button>}
                </td>
              </tr>
            ))}
            {transfers.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-6">No transfers yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} title="New Stock Transfer" onClose={() => setModalOpen(false)} width="max-w-2xl">
        <form onSubmit={submit} className="space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Source Location</label>
              <select required className="input" value={form.sourceLocationId} onChange={(e) => setForm({ ...form, sourceLocationId: e.target.value })}>
                <option value="">Select</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Destination Location</label>
              <select required className="input" value={form.destinationLocationId} onChange={(e) => setForm({ ...form, destinationLocationId: e.target.value })}>
                <option value="">Select</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
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
                  <input type="number" min="1" className="input w-24" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                  <button type="button" className="text-red-500 text-xs" onClick={() => removeItem(idx)}>Remove</button>
                </div>
              ))}
              {form.items.length === 0 && <p className="text-xs text-slate-400">No items added yet</p>}
            </div>
          </div>

          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={!form.items.length}>Request Transfer</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
