import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import { formatMoney } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import ProductForm from './ProductForm';

export default function Products() {
  const { hasPermission } = useAuth();
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [lookups, setLookups] = useState({ categories: [], brands: [], units: [], suppliers: [] });

  const load = async (query = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/products', { params: { q: query, pageSize: 100 } });
      setProducts(data.products);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    const [categories, brands, units, suppliers] = await Promise.all([
      api.get('/categories'), api.get('/lookups/brands'), api.get('/lookups/units'), api.get('/suppliers'),
    ]);
    setLookups({
      categories: categories.data.categories, brands: brands.data.brands,
      units: units.data.units, suppliers: suppliers.data.suppliers,
    });
  };

  useEffect(() => { load(); loadLookups(); }, []);

  const onSearch = (e) => { e.preventDefault(); load(q); };

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (product) => { setEditing(product); setModalOpen(true); };

  const handleSaved = () => { setModalOpen(false); load(q); };

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage the product catalog, pricing and stock thresholds"
        actions={hasPermission('CREATE_PRODUCTS') && <button className="btn-primary" onClick={openCreate}>+ New Product</button>}
      />

      <form onSubmit={onSearch} className="flex gap-2 mb-4">
        <input className="input max-w-xs" placeholder="Search by name, SKU or barcode" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-secondary" type="submit">Search</button>
      </form>

      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th><th>SKU</th><th>Barcode</th><th>Category</th>
              <th>Purchase Price</th><th>Selling Price</th><th>Reorder Level</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={9} className="text-center text-slate-400 py-6">Loading...</td></tr>}
            {!loading && products.length === 0 && <tr><td colSpan={9} className="text-center text-slate-400 py-6">No products found</td></tr>}
            {products.map((p) => (
              <tr key={p.id}>
                <td className="font-medium text-slate-800">{p.name}</td>
                <td>{p.sku}</td>
                <td>{p.barcode || '-'}</td>
                <td>{p.category?.name || '-'}</td>
                <td>{formatMoney(p.purchase_price)}</td>
                <td>{formatMoney(p.selling_price)}</td>
                <td>{p.reorder_level}</td>
                <td>
                  <span className={`badge ${p.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{p.status}</span>
                </td>
                <td>
                  {hasPermission('EDIT_PRODUCTS') && (
                    <button className="text-[var(--brand-600)] text-xs font-medium hover:underline" onClick={() => openEdit(p)}>Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} title={editing ? 'Edit Product' : 'New Product'} onClose={() => setModalOpen(false)} width="max-w-2xl">
        <ProductForm product={editing} lookups={lookups} onSaved={handleSaved} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
