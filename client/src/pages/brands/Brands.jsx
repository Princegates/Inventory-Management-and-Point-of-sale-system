import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import PageHeader from '../../components/PageHeader';

export default function Brands() {
  const [brands, setBrands] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const { data } = await api.get('/lookups/brands');
    setBrands(data.brands);
  };
  useEffect(() => { load(); }, []);

  const addBrand = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/lookups/brands', { name });
      setName('');
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  };

  const startEdit = (b) => { setEditingId(b.id); setEditingName(b.name); };

  const saveEdit = async (id) => {
    setError('');
    try {
      await api.put(`/lookups/brands/${id}`, { name: editingName });
      setEditingId(null);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  };

  const remove = async (id) => {
    setError('');
    try { await api.delete(`/lookups/brands/${id}`); load(); } catch (err) { setError(apiErrorMessage(err)); }
  };

  return (
    <div>
      <PageHeader title="Brands" subtitle="Product brands, used to organize and filter your catalog" />

      <form onSubmit={addBrand} className="card p-4 mb-4 flex items-end gap-2">
        <div className="flex-1">
          <label className="label">New brand</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Anker, Samsung, Oraimo" required />
        </div>
        <button className="btn-primary">Add Brand</button>
      </form>

      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Name</th><th></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {brands.map((b) => (
              <tr key={b.id}>
                <td>
                  {editingId === b.id
                    ? <input className="input py-1 text-sm max-w-xs" value={editingName} onChange={(e) => setEditingName(e.target.value)} autoFocus />
                    : b.name}
                </td>
                <td className="space-x-3">
                  {editingId === b.id ? (
                    <>
                      <button className="text-[var(--brand-600)] text-xs hover:underline" onClick={() => saveEdit(b.id)}>Save</button>
                      <button className="text-slate-400 text-xs hover:underline" onClick={() => setEditingId(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="text-[var(--brand-600)] text-xs hover:underline" onClick={() => startEdit(b)}>Edit</button>
                      <button className="text-red-500 text-xs hover:underline" onClick={() => remove(b.id)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {brands.length === 0 && <tr><td colSpan={2} className="text-center text-slate-400 py-6">No brands yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
