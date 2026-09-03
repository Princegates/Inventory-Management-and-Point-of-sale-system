import { useEffect, useState } from 'react';
import api from '../../api/client';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { formatMoney } from '../../utils/format';

const TABS = ['Inventory', 'Sales', 'Purchasing', 'Profitability'];

export default function Reports() {
  const [tab, setTab] = useState('Inventory');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  return (
    <div>
      <PageHeader title="Reports" subtitle="Inventory, sales, purchasing and profitability reporting" />

      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button key={t} className={`btn-secondary ${tab === t ? 'bg-slate-800 text-white' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {(tab === 'Sales' || tab === 'Profitability') && (
        <div className="flex gap-2 mb-4 items-end">
          <div><label className="label">From</label><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className="label">To</label><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
      )}

      {tab === 'Inventory' && <InventoryReport />}
      {tab === 'Sales' && <SalesReport from={from} to={to} />}
      {tab === 'Purchasing' && <PurchasingReport />}
      {tab === 'Profitability' && <ProfitabilityReport from={from} to={to} />}
    </div>
  );
}

function InventoryReport() {
  const [current, setCurrent] = useState(null);
  const [lowStock, setLowStock] = useState(null);
  useEffect(() => {
    api.get('/reports/inventory/current').then((r) => setCurrent(r.data));
    api.get('/reports/inventory/low-stock').then((r) => setLowStock(r.data));
  }, []);
  if (!current || !lowStock) return <p className="text-slate-500 text-sm">Loading...</p>;
  return (
    <div className="space-y-4">
      <StatCard label="Total Inventory Value" value={formatMoney(current.totalValue)} />
      <div className="card overflow-x-auto">
        <h3 className="p-3 text-sm font-semibold text-slate-600">Current Inventory</h3>
        <table className="table-base">
          <thead><tr><th>Product</th><th>Location</th><th>Qty</th><th>Unit Cost</th><th>Value</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {current.items.map((i, idx) => (
              <tr key={idx}><td>{i.productName}</td><td>{i.locationName}</td><td>{i.quantity}</td><td>{formatMoney(i.unitCost)}</td><td>{formatMoney(i.value)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card overflow-x-auto">
          <h3 className="p-3 text-sm font-semibold text-amber-600">Low Stock</h3>
          <table className="table-base">
            <thead><tr><th>Product</th><th>Location</th><th>Qty</th><th>Reorder Level</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {lowStock.lowStock.map((i, idx) => <tr key={idx}><td>{i.productName}</td><td>{i.locationName}</td><td>{i.quantity}</td><td>{i.reorderLevel}</td></tr>)}
              {lowStock.lowStock.length === 0 && <tr><td colSpan={4} className="text-center text-slate-400 py-4">None</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card overflow-x-auto">
          <h3 className="p-3 text-sm font-semibold text-red-600">Out of Stock</h3>
          <table className="table-base">
            <thead><tr><th>Product</th><th>Location</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {lowStock.outOfStock.map((i, idx) => <tr key={idx}><td>{i.productName}</td><td>{i.locationName}</td></tr>)}
              {lowStock.outOfStock.length === 0 && <tr><td colSpan={2} className="text-center text-slate-400 py-4">None</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SalesReport({ from, to }) {
  const [summary, setSummary] = useState(null);
  const [byProduct, setByProduct] = useState([]);
  useEffect(() => {
    const params = { from: from || undefined, to: to || undefined };
    api.get('/reports/sales/summary', { params }).then((r) => setSummary(r.data));
    api.get('/reports/sales/by-dimension', { params: { ...params, by: 'product' } }).then((r) => setByProduct(r.data.groups));
  }, [from, to]);
  if (!summary) return <p className="text-slate-500 text-sm">Loading...</p>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Transactions" value={summary.transactionCount} />
        <StatCard label="Revenue" value={formatMoney(summary.totalRevenue)} />
        <StatCard label="Discounts" value={formatMoney(summary.totalDiscount)} />
        <StatCard label="Gross Profit" value={formatMoney(summary.grossProfit)} tone="success" />
        <StatCard label="Avg Transaction" value={formatMoney(summary.averageTransactionValue)} />
      </div>
      <div className="card overflow-x-auto">
        <h3 className="p-3 text-sm font-semibold text-slate-600">Sales by Product</h3>
        <table className="table-base">
          <thead><tr><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {byProduct.map((g) => <tr key={g.key}><td>{g.label}</td><td>{g.quantity}</td><td>{formatMoney(g.revenue)}</td></tr>)}
            {byProduct.length === 0 && <tr><td colSpan={3} className="text-center text-slate-400 py-4">No sales in range</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PurchasingReport() {
  const [summary, setSummary] = useState(null);
  useEffect(() => { api.get('/reports/purchasing/summary').then((r) => setSummary(r.data)); }, []);
  if (!summary) return <p className="text-slate-500 text-sm">Loading...</p>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Orders" value={summary.orderCount} />
        <StatCard label="Total Value" value={formatMoney(summary.totalValue)} />
        <StatCard label="Outstanding" value={summary.outstandingOrders} />
      </div>
      <div className="card overflow-x-auto">
        <h3 className="p-3 text-sm font-semibold text-slate-600">By Supplier</h3>
        <table className="table-base">
          <thead><tr><th>Supplier</th><th>Orders</th><th>Value</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {summary.bySupplier.map((s) => <tr key={s.supplierId}><td>{s.supplierName}</td><td>{s.orderCount}</td><td>{formatMoney(s.totalValue)}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfitabilityReport({ from, to }) {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/reports/profitability', { params: { from: from || undefined, to: to || undefined } }).then((r) => setData(r.data)); }, [from, to]);
  if (!data) return <p className="text-slate-500 text-sm">Loading...</p>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <StatCard label="Gross Sales" value={formatMoney(data.grossSales)} />
      <StatCard label="Discounts" value={formatMoney(data.discounts)} />
      <StatCard label="Net Sales" value={formatMoney(data.netSales)} />
      <StatCard label="Cost of Goods Sold" value={formatMoney(data.costOfGoodsSold)} />
      <StatCard label="Gross Profit" value={formatMoney(data.grossProfit)} tone="success" />
      <StatCard label="Gross Margin" value={`${data.grossMarginPercent}%`} />
    </div>
  );
}
