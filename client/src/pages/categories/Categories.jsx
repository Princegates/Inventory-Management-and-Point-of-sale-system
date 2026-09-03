import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import PageHeader from '../../components/PageHeader';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [subName, setSubName] = useState({});
  const [error, setError] = useState('');

  const load = async () => {
    const { data } = await api.get('/categories');
    setCategories(data.categories);
  };

  useEffect(() => { load(); }, []);

  const addCategory = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/categories', { name, parentId: parentId || null });
      setName(''); setParentId('');
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  };

  const addSubcategory = async (parent) => {
    const value = subName[parent.id];
    if (!value) return;
    try {
      await api.post('/categories', { name: value, parentId: parent.id });
      setSubName((s) => ({ ...s, [parent.id]: '' }));
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  };

  const remove = async (id) => {
    try { await api.delete(`/categories/${id}`); load(); } catch (err) { setError(apiErrorMessage(err)); }
  };

  return (
    <div>
      <PageHeader title="Categories" subtitle="Organize products into categories and subcategories" />

      <form onSubmit={addCategory} className="card p-4 mb-4 flex items-end gap-2">
        <div className="flex-1">
          <label className="label">New top-level category</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <button className="btn-primary">Add Category</button>
      </form>

      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

      <div className="grid gap-3">
        {categories.map((cat) => (
          <div key={cat.id} className="card p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-800">{cat.name}</p>
              <button className="text-red-500 text-xs hover:underline" onClick={() => remove(cat.id)}>Delete</button>
            </div>
            <div className="mt-2 pl-4 space-y-1">
              {cat.subcategories?.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between text-sm text-slate-600">
                  <span>&mdash; {sub.name}</span>
                  <button className="text-red-500 text-xs hover:underline" onClick={() => remove(sub.id)}>Delete</button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <input
                  className="input text-sm py-1"
                  placeholder="Add subcategory"
                  value={subName[cat.id] || ''}
                  onChange={(e) => setSubName((s) => ({ ...s, [cat.id]: e.target.value }))}
                />
                <button className="btn-secondary text-xs" onClick={() => addSubcategory(cat)}>Add</button>
              </div>
            </div>
          </div>
        ))}
        {categories.length === 0 && <p className="text-slate-400 text-sm">No categories yet</p>}
      </div>
    </div>
  );
}
