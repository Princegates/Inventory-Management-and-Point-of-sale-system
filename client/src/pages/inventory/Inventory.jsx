import { useEffect, useState } from 'react';
import api from '../../api/client';
import PageHeader from '../../components/PageHeader';
import { formatDateTime } from '../../utils/format';

export default function Inventory() {
  const [tab, setTab] = useState('balances');
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState('');
  const [q, setQ] = useState('');
  const [inventory, setInventory] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  useEffect(() => { api.get('/locations').then((r) => setLocations(r.data.locations)); }, []);

  const loadBalances = async () => {
    const { data } = await api.get('/inventory', { params: { locationId: locationId || undefined, q: q || undefined, lowStockOnly: lowStockOnly || undefined } });
    setInventory(data.inventory);
  };
  const loadLedger = async () => {
    const { data } = await api.get('/inventory/ledger', { params: { locationId: locationId || undefined, pageSize: 100 } });
    setLedger(data.transactions);
  };

  useEffect(() => { if (tab === 'balances') loadBalances(); else loadLedger(); }, [tab, locationId, lowStockOnly]);

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Stock balances by location and the full movement ledger" />

      <div className="flex gap-2 mb-4">
        <button className={`btn-secondary ${tab === 'balances' ? 'bg-slate-800 text-white' : ''}`} onClick={() => setTab('balances')}>Stock Balances</button>
        <button className={`btn-secondary ${tab === 'ledger' ? 'bg-slate-800 text-white' : ''}`} onClick={() => setTab('ledger')}>Movement Ledger</button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <select className="input max-w-xs" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          <option value="">All locations</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        {tab === 'balances' && (
          <>
            <form onSubmit={(e) => { e.preventDefault(); loadBalances(); }} className="flex gap-2">
              <input className="input max-w-xs" placeholder="Search product" value={q} onChange={(e) => setQ(e.target.value)} />
              <button className="btn-secondary">Search</button>
            </form>
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} /> Low stock only
            </label>
          </>
        )}
      </div>

      {tab === 'balances' && (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Product</th><th>SKU</th><th>Location</th><th>Available</th><th>In Transit</th><th>Damaged</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {inventory.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium text-slate-800">{r.product?.name}</td>
                  <td>{r.product?.sku}</td>
                  <td>{r.location?.name}</td>
                  <td className={r.quantity <= 0 ? 'text-red-600 font-semibold' : (r.product?.reorder_level > 0 && r.quantity <= r.product.reorder_level ? 'text-amber-600 font-semibold' : '')}>{r.quantity}</td>
                  <td>{r.quantity_in_transit}</td>
                  <td>{r.quantity_damaged}</td>
                </tr>
              ))}
              {inventory.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-6">No inventory records</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'ledger' && (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Date</th><th>Product</th><th>Location</th><th>Type</th><th>Qty</th><th>Balance</th><th>Reference</th><th>User</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {ledger.map((t) => (
                <tr key={t.id}>
                  <td>{formatDateTime(t.createdAt)}</td>
                  <td>{t.product?.name}</td>
                  <td>{t.location?.name}</td>
                  <td className="capitalize">{t.type.replaceAll('_', ' ')}</td>
                  <td className={t.quantity < 0 ? 'text-red-600' : 'text-emerald-600'}>{t.quantity > 0 ? `+${t.quantity}` : t.quantity}</td>
                  <td>{t.new_balance}</td>
                  <td>{t.reference_number || '-'}</td>
                  <td>{t.user?.name || '-'}</td>
                </tr>
              ))}
              {ledger.length === 0 && <tr><td colSpan={8} className="text-center text-slate-400 py-6">No transactions</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
