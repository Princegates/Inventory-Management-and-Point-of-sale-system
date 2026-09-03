import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';

const empty = { name: '', code: '', type: 'shop', address: '', phone: '' };

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const load = async () => {
    const { data } = await api.get('/locations');
    setLocations(data.locations);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/locations', form);
      setForm(empty);
      setModalOpen(false);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  };

  return (
    <div>
      <PageHeader title="Locations" subtitle="Warehouses, shops and branches" actions={<button className="btn-primary" onClick={() => setModalOpen(true)}>+ New Location</button>} />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((l) => (
          <div key={l.id} className="card p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-800">{l.name}</p>
              <span className="badge bg-[var(--brand-100)] text-[var(--brand-700)] capitalize">{l.type}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Code: {l.code}</p>
            {l.address && <p className="text-xs text-slate-500">{l.address}</p>}
            <span className={`badge mt-2 ${l.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{l.status}</span>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} title="New Location" onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          <div><label className="label">Name</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Code</label><input required className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="warehouse">Warehouse</option>
              <option value="shop">Shop</option>
              <option value="branch">Branch</option>
              <option value="distribution_centre">Distribution Centre</option>
            </select>
          </div>
          <div><label className="label">Address</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
