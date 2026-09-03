import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';

const empty = { name: '', contactPerson: '', phone: '', email: '', address: '', paymentTerms: '', notes: '' };

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const load = async () => {
    const { data } = await api.get('/suppliers');
    setSuppliers(data.suppliers);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setModalOpen(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, contactPerson: s.contact_person || '', phone: s.phone || '', email: s.email || '', address: s.address || '', paymentTerms: s.payment_terms || '', notes: s.notes || '' });
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) await api.put(`/suppliers/${editing.id}`, form);
      else await api.post('/suppliers', form);
      setModalOpen(false);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  };

  return (
    <div>
      <PageHeader title="Suppliers" subtitle="Manage supplier records and contacts" actions={<button className="btn-primary" onClick={openCreate}>+ New Supplier</button>} />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Name</th><th>Contact Person</th><th>Phone</th><th>Email</th><th>Status</th><th></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td className="font-medium text-slate-800">{s.name}</td>
                <td>{s.contact_person || '-'}</td>
                <td>{s.phone || '-'}</td>
                <td>{s.email || '-'}</td>
                <td><span className="badge bg-emerald-100 text-emerald-700">{s.status}</span></td>
                <td><button className="text-[var(--brand-600)] text-xs font-medium hover:underline" onClick={() => openEdit(s)}>Edit</button></td>
              </tr>
            ))}
            {suppliers.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-6">No suppliers yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} title={editing ? 'Edit Supplier' : 'New Supplier'} onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          <div><label className="label">Company Name</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Contact Person</label><input className="input" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="label">Email</label><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div><label className="label">Address</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><label className="label">Payment Terms</label><input className="input" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
