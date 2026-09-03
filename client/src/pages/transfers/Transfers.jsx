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
  const [viewing, setViewing] = useState(null); // the transfer whose item history is open in the detail modal
  const [error, setError] = useState('');
  const [form, setForm] = useState({ sourceLocationId: '', destinationLocationId: '', notes: '', items: [] });
  const [sourceBalances, setSourceBalances] = useState({}); // productId (string) -> quantity available at the chosen source

  const load = async () => {
    const { data } = await api.get('/stock-transfers');
    setTransfers(data.stockTransfers);
  };

  useEffect(() => {
    load();
    api.get('/locations').then((r) => setLocations(r.data.locations));
    api.get('/products', { params: { pageSize: 200 } }).then((r) => setProducts(r.data.products));
  }, []);

  // Shows how much of each product is actually available at the source location, so a
  // request can't be built against stock that isn't really there.
  useEffect(() => {
    if (!form.sourceLocationId) {
      setSourceBalances({});
      return;
    }
    api.get('/inventory', { params: { locationId: form.sourceLocationId } }).then((r) => {
      const byProduct = {};
      r.data.inventory.forEach((row) => { byProduct[row.product_id] = row.quantity; });
      setSourceBalances(byProduct);
    });
  }, [form.sourceLocationId]);

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
          <thead><tr><th>Transfer #</th><th>From</th><th>To</th><th>Items</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {transfers.map((t) => (
              <tr key={t.id}>
                <td className="font-medium text-slate-800">{t.transfer_number}</td>
                <td>{t.sourceLocation?.name}</td>
                <td>{t.destinationLocation?.name}</td>
                <td>{(t.items || []).reduce((sum, i) => sum + i.quantity, 0)} units &middot; {(t.items || []).length} product{t.items?.length === 1 ? '' : 's'}</td>
                <td><span className={`badge capitalize ${STATUS_COLORS[t.status]}`}>{t.status.replaceAll('_', ' ')}</span></td>
                <td>{formatDateTime(t.createdAt)}</td>
                <td className="space-x-2 whitespace-nowrap">
                  <button className="text-[var(--brand-600)] text-xs hover:underline" onClick={() => setViewing(t)}>View</button>
                  {t.status === 'requested' && hasPermission('APPROVE_TRANSFER') && <button className="text-[var(--brand-600)] text-xs hover:underline" onClick={() => action(t, 'approve')}>Approve</button>}
                  {t.status === 'approved' && hasPermission('ISSUE_TRANSFER') && <button className="text-[var(--brand-600)] text-xs hover:underline" onClick={() => action(t, 'issue')}>Issue</button>}
                  {t.status === 'in_transit' && hasPermission('RECEIVE_TRANSFER') && <button className="text-[var(--brand-600)] text-xs hover:underline" onClick={() => action(t, 'receive')}>Receive</button>}
                  {['requested', 'approved', 'in_transit'].includes(t.status) && <button className="text-red-500 text-xs hover:underline" onClick={() => action(t, 'cancel')}>Cancel</button>}
                </td>
              </tr>
            ))}
            {transfers.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-6">No transfers yet</td></tr>}
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
            {!form.sourceLocationId && <p className="text-xs text-slate-400 mb-2">Choose a source location to see how much stock is available to move.</p>}
            <div className="space-y-2">
              {form.items.map((item, idx) => {
                const chosenElsewhere = new Set(form.items.filter((_, i) => i !== idx).map((it) => it.productId).filter(Boolean));
                const available = item.productId && form.sourceLocationId ? (sourceBalances[item.productId] ?? 0) : null;
                const overAvailable = available !== null && Number(item.quantity) > available;
                return (
                  <div key={idx}>
                    <div className="flex gap-2 items-center">
                      <select className="input flex-1" value={item.productId} onChange={(e) => updateItem(idx, 'productId', e.target.value)}>
                        <option value="">Select product</option>
                        {products.filter((p) => String(p.id) === String(item.productId) || !chosenElsewhere.has(String(p.id))).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}){form.sourceLocationId ? ` — ${sourceBalances[p.id] ?? 0} in stock` : ''}
                          </option>
                        ))}
                      </select>
                      <input type="number" min="1" className="input w-24" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                      <button type="button" className="text-red-500 text-xs" onClick={() => removeItem(idx)}>Remove</button>
                    </div>
                    {available !== null && (
                      <p className={`text-xs mt-0.5 ${overAvailable ? 'text-red-600' : 'text-slate-400'}`}>
                        {overAvailable ? `Only ${available} available - reduce the quantity` : `${available} available at source`}
                      </p>
                    )}
                  </div>
                );
              })}
              {form.items.length === 0 && <p className="text-xs text-slate-400">No items added yet</p>}
            </div>
          </div>

          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={!form.items.length || (!!form.sourceLocationId && form.items.some((it) => it.productId && Number(it.quantity) > (sourceBalances[it.productId] ?? 0)))}>Request Transfer</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!viewing} title={viewing ? `Transfer ${viewing.transfer_number}` : ''} onClose={() => setViewing(null)} width="max-w-xl">
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">{viewing.sourceLocation?.name} &rarr; {viewing.destinationLocation?.name}</p>
              <span className={`badge capitalize ${STATUS_COLORS[viewing.status]}`}>{viewing.status.replaceAll('_', ' ')}</span>
            </div>

            <div>
              <p className="label mb-1">Items Transferred</p>
              <table className="table-base">
                <thead><tr><th>Product</th><th>SKU</th><th>Quantity</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {(viewing.items || []).map((i) => (
                    <tr key={i.id}>
                      <td>{i.product?.name}</td>
                      <td className="text-slate-500">{i.product?.sku}</td>
                      <td>{i.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <p className="label mb-1">History</p>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>Requested by {viewing.requester?.name || 'unknown'} on {formatDateTime(viewing.createdAt)}</li>
                {viewing.approver && <li>Approved by {viewing.approver.name}</li>}
                {viewing.issuer && <li>Issued by {viewing.issuer.name}{viewing.issued_at ? ` on ${formatDateTime(viewing.issued_at)}` : ''}</li>}
                {viewing.receiver && <li>Received by {viewing.receiver.name}{viewing.received_at ? ` on ${formatDateTime(viewing.received_at)}` : ''}</li>}
                {viewing.status === 'cancelled' && <li className="text-red-600">Cancelled</li>}
              </ul>
            </div>

            {viewing.notes && (
              <div>
                <p className="label mb-1">Notes</p>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{viewing.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
