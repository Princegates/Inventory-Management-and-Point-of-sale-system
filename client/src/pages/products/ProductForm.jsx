import { useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';

const empty = {
  sku: '', barcode: '', name: '', description: '', categoryId: '', brandId: '', unitId: '', supplierId: '',
  purchasePrice: '', sellingPrice: '', wholesalePrice: '', minSellingPrice: '', taxRate: '0',
  reorderLevel: '0', minStockLevel: '0', maxStockLevel: '', trackExpiry: false, trackBatch: false, allowBackorder: false, status: 'active',
};

export default function ProductForm({ product, lookups, onSaved, onCancel }) {
  const [form, setForm] = useState(() => product ? {
    sku: product.sku, barcode: product.barcode || '', name: product.name, description: product.description || '',
    categoryId: product.category_id || '', brandId: product.brand_id || '', unitId: product.unit_id || '', supplierId: product.supplier_id || '',
    purchasePrice: product.purchase_price, sellingPrice: product.selling_price, wholesalePrice: product.wholesale_price || '',
    minSellingPrice: product.min_selling_price || '', taxRate: product.tax_rate,
    reorderLevel: product.reorder_level, minStockLevel: product.min_stock_level, maxStockLevel: product.max_stock_level || '',
    trackExpiry: product.track_expiry, trackBatch: product.track_batch, allowBackorder: product.allow_backorder, status: product.status,
  } : empty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        categoryId: form.categoryId || null, brandId: form.brandId || null, unitId: form.unitId || null, supplierId: form.supplierId || null,
        maxStockLevel: form.maxStockLevel || null, wholesalePrice: form.wholesalePrice || null, minSellingPrice: form.minSellingPrice || null,
      };
      if (product) await api.put(`/products/${product.id}`, payload);
      else await api.post('/products', payload);
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">SKU</label>
          <input required className="input" value={form.sku} onChange={set('sku')} disabled={!!product} />
        </div>
        <div>
          <label className="label">Barcode</label>
          <input className="input" value={form.barcode} onChange={set('barcode')} />
        </div>
      </div>

      <div>
        <label className="label">Product Name</label>
        <input required className="input" value={form.name} onChange={set('name')} />
      </div>

      <div>
        <label className="label">Description</label>
        <textarea className="input" rows={2} value={form.description} onChange={set('description')} />
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="label">Category</label>
          <select className="input" value={form.categoryId} onChange={set('categoryId')}>
            <option value="">-</option>
            {lookups.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Brand</label>
          <select className="input" value={form.brandId} onChange={set('brandId')}>
            <option value="">-</option>
            {lookups.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Unit</label>
          <select className="input" value={form.unitId} onChange={set('unitId')}>
            <option value="">-</option>
            {lookups.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Supplier</label>
          <select className="input" value={form.supplierId} onChange={set('supplierId')}>
            <option value="">-</option>
            {lookups.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="label">Purchase Price</label>
          <input type="number" step="0.01" required className="input" value={form.purchasePrice} onChange={set('purchasePrice')} />
        </div>
        <div>
          <label className="label">Selling Price</label>
          <input type="number" step="0.01" required className="input" value={form.sellingPrice} onChange={set('sellingPrice')} />
        </div>
        <div>
          <label className="label">Wholesale Price</label>
          <input type="number" step="0.01" className="input" value={form.wholesalePrice} onChange={set('wholesalePrice')} />
        </div>
        <div>
          <label className="label">Tax Rate %</label>
          <input type="number" step="0.01" className="input" value={form.taxRate} onChange={set('taxRate')} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="label">Reorder Level</label>
          <input type="number" className="input" value={form.reorderLevel} onChange={set('reorderLevel')} />
        </div>
        <div>
          <label className="label">Min Stock Level</label>
          <input type="number" className="input" value={form.minStockLevel} onChange={set('minStockLevel')} />
        </div>
        <div>
          <label className="label">Max Stock Level</label>
          <input type="number" className="input" value={form.maxStockLevel} onChange={set('maxStockLevel')} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>
      </div>

      <div className="flex gap-4 text-sm text-slate-600">
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.trackExpiry} onChange={set('trackExpiry')} /> Track expiry</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.trackBatch} onChange={set('trackBatch')} /> Track batch</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.allowBackorder} onChange={set('allowBackorder')} /> Allow backorder</label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Product'}</button>
      </div>
    </form>
  );
}
