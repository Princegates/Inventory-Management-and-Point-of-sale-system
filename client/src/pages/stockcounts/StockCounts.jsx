import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import { formatDateTime } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = { draft: 'bg-slate-200 text-slate-700', submitted: 'bg-amber-100 text-amber-700', approved: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700' };

export default function StockCounts() {
  const { hasPermission } = useAuth();
  const [counts, setCounts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newLocationId, setNewLocationId] = useState('');
  const [detail, setDetail] = useState(null);
  const [physicalValues, setPhysicalValues] = useState({});
  const [error, setError] = useState('');

  const load = async () => {
    const { data } = await api.get('/stock-counts');
    setCounts(data.stockCounts);
  };
  useEffect(() => { load(); api.get('/locations').then((r) => setLocations(r.data.locations)); }, []);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/stock-counts', { locationId: newLocationId });
      setCreateOpen(false);
      setNewLocationId('');
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  };

  const openDetail = async (count) => {
    const { data } = await api.get(`/stock-counts/${count.id}`);
    setDetail(data.stockCount);
    const initial = {};
    data.stockCount.items.forEach((i) => { initial[i.id] = i.physical_quantity ?? ''; });
    setPhysicalValues(initial);
  };

  const saveCounts = async () => {
    const items = detail.items.map((i) => ({ id: i.id, physicalQuantity: physicalValues[i.id] === '' ? i.system_quantity : Number(physicalValues[i.id]) }));
    try { await api.put(`/stock-counts/${detail.id}/counts`, { items }); openDetail(detail); load(); }
    catch (err) { alert(apiErrorMessage(err)); }
  };

  const submitCount = async () => { try { await api.post(`/stock-counts/${detail.id}/submit`); setDetail(null); load(); } catch (err) { alert(apiErrorMessage(err)); } };
  const approveCount = async () => { try { await api.post(`/stock-counts/${detail.id}/approve`); setDetail(null); load(); } catch (err) { alert(apiErrorMessage(err)); } };

  return (
    <div>
      <PageHeader title="Stock Counts" subtitle="Periodic physical inventory counting" actions={hasPermission('CONDUCT_STOCK_COUNT') && <button className="btn-primary" onClick={() => setCreateOpen(true)}>+ New Stock Count</button>} />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Count #</th><th>Location</th><th>Counted By</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {counts.map((c) => (
              <tr key={c.id}>
                <td className="font-medium text-slate-800">{c.count_number}</td>
                <td>{c.location?.name}</td>
                <td>{c.counter?.name}</td>
                <td><span className={`badge capitalize ${STATUS_COLORS[c.status]}`}>{c.status}</span></td>
                <td>{formatDateTime(c.createdAt)}</td>
                <td><button className="text-[var(--brand-600)] text-xs hover:underline" onClick={() => openDetail(c)}>Open</button></td>
              </tr>
            ))}
            {counts.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-6">No stock counts yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={createOpen} title="New Stock Count" onClose={() => setCreateOpen(false)}>
        <form onSubmit={create} className="space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          <div>
            <label className="label">Location</label>
            <select required className="input" value={newLocationId} onChange={(e) => setNewLocationId(e.target.value)}>
              <option value="">Select</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <p className="text-xs text-slate-500">This will snapshot the current system quantity for every product at this location.</p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="btn-primary">Start Count</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} title={detail ? `Stock Count ${detail.count_number}` : ''} onClose={() => setDetail(null)} width="max-w-3xl">
        {detail && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className={`badge capitalize ${STATUS_COLORS[detail.status]}`}>{detail.status}</span>
              <div className="space-x-2">
                {detail.status === 'draft' && <>
                  <button className="btn-secondary text-xs" onClick={saveCounts}>Save Counts</button>
                  <button className="btn-primary text-xs" onClick={submitCount}>Submit for Approval</button>
                </>}
                {detail.status === 'submitted' && hasPermission('APPROVE_STOCK_COUNT') && <button className="btn-primary text-xs" onClick={approveCount}>Approve &amp; Apply Adjustments</button>}
              </div>
            </div>
            <table className="table-base">
              <thead><tr><th>Product</th><th>System Qty</th><th>Physical Qty</th><th>Difference</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {detail.items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.product?.name}</td>
                    <td>{i.system_quantity}</td>
                    <td>
                      {detail.status === 'draft' ? (
                        <input
                          type="number" className="input w-24"
                          value={physicalValues[i.id] ?? ''}
                          onChange={(e) => setPhysicalValues((v) => ({ ...v, [i.id]: e.target.value }))}
                        />
                      ) : i.physical_quantity}
                    </td>
                    <td className={i.difference > 0 ? 'text-emerald-600' : i.difference < 0 ? 'text-red-600' : ''}>{i.difference ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
