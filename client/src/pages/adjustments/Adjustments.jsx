import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import { formatDateTime } from '../../utils/format';

const REASONS = ['damaged', 'theft_loss', 'counting_error', 'expired', 'data_correction', 'opening_balance', 'other'];

export default function Adjustments() {
  const [adjustments, setAdjustments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ productId: '', locationId: '', direction: 'increase', quantity: '', reason: 'counting_error', notes: '' });

  const load = async () => {
    const { data } = await api.get('/stock-adjustments');
    setAdjustments(data.stockAdjustments);
  };
  useEffect(() => {
    load();
    api.get('/locations').then((r) => setLocations(r.data.locations));
    api.get('/products', { params: { pageSize: 200 } }).then((r) => setProducts(r.data.products));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const qty = Number(form.quantity) * (form.direction === 'decrease' ? -1 : 1);
      await api.post('/stock-adjustments', { productId: form.productId, locationId: form.locationId, quantity: qty, reason: form.reason, notes: form.notes });
      setModalOpen(false);
      setForm({ productId: '', locationId: '', direction: 'increase', quantity: '', reason: 'counting_error', notes: '' });
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  };

  return (
    <div>
      <PageHeader title="Stock Adjustments" subtitle="Direct inventory corrections with a traceable reason" actions={<button className="btn-primary" onClick={() => setModalOpen(true)}>+ New Adjustment</button>} />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Adjustment #</th><th>Product</th><th>Location</th><th>Qty</th><th>Reason</th><th>By</th><th>Date</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {adjustments.map((a) => (
              <tr key={a.id}>
                <td className="font-medium text-slate-800">{a.adjustment_number}</td>
                <td>{a.product?.name}</td>
                <td>{a.location?.name}</td>
                <td className={a.quantity < 0 ? 'text-red-600' : 'text-emerald-600'}>{a.quantity > 0 ? `+${a.quantity}` : a.quantity}</td>
                <td className="capitalize">{a.reason.replaceAll('_', ' ')}</td>
                <td>{a.user?.name}</td>
                <td>{formatDateTime(a.createdAt)}</td>
              </tr>
            ))}
            {adjustments.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-6">No adjustments yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} title="New Stock Adjustment" onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          <div>
            <label className="label">Product</label>
            <select required className="input" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
              <option value="">Select</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Location</label>
            <select required className="input" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
              <option value="">Select</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Direction</label>
              <select className="input" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
                <option value="increase">Increase</option>
                <option value="decrease">Decrease</option>
              </select>
            </div>
            <div>
              <label className="label">Quantity</label>
              <input required type="number" min="1" className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Reason</label>
            <select className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
              {REASONS.map((r) => <option key={r} value={r}>{r.replaceAll('_', ' ')}</option>)}
            </select>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary">Save Adjustment</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
