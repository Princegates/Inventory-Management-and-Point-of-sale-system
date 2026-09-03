import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { formatMoney } from '../utils/format';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard/summary').then((res) => setData(res.data)).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!data) return <p className="text-slate-500 text-sm">Loading dashboard...</p>;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Real-time overview of inventory, sales and operations" />

      <h2 className="text-sm font-semibold text-slate-600 mb-2">Inventory</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Products" value={data.inventory.totalProducts} />
        <StatCard label="Total Stock Units" value={data.inventory.totalStockUnits} />
        <StatCard label="Inventory Value" value={formatMoney(data.inventory.inventoryValue)} />
        <StatCard label="Low Stock" value={data.inventory.lowStockCount} tone={data.inventory.lowStockCount ? 'warning' : 'default'} />
        <StatCard label="Out of Stock" value={data.inventory.outOfStockCount} tone={data.inventory.outOfStockCount ? 'danger' : 'default'} />
      </div>

      <h2 className="text-sm font-semibold text-slate-600 mb-2">Sales</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Today's Revenue" value={formatMoney(data.sales.todayRevenue)} sub={`${data.sales.todayTransactionCount} transactions`} />
        <StatCard label="Weekly Revenue" value={formatMoney(data.sales.weeklyRevenue)} sub={`${data.sales.weeklyTransactionCount} transactions`} />
        <StatCard label="Monthly Revenue" value={formatMoney(data.sales.monthlyRevenue)} sub={`${data.sales.monthlyTransactionCount} transactions`} />
        <StatCard label="Avg Transaction" value={formatMoney(data.sales.averageTransactionValue)} />
      </div>

      <h2 className="text-sm font-semibold text-slate-600 mb-2">Financial (30 days)</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Revenue" value={formatMoney(data.financial.monthlyRevenue)} />
        <StatCard label="Cost of Goods Sold" value={formatMoney(data.financial.monthlyCostOfGoodsSold)} />
        <StatCard label="Gross Profit" value={formatMoney(data.financial.monthlyGrossProfit)} tone="success" />
        <StatCard label="Discounts Given" value={formatMoney(data.financial.monthlyDiscounts)} />
      </div>

      <h2 className="text-sm font-semibold text-slate-600 mb-2">Operations</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Pending Transfers" value={data.operations.pendingTransfers} />
        <StatCard label="Pending Purchase Orders" value={data.operations.pendingPurchaseOrders} />
        <StatCard label="Stock Counts Awaiting Approval" value={data.operations.pendingAdjustmentApprovals} />
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-semibold text-slate-600 mb-3">Top Selling Products (30 days)</h2>
        <table className="table-base">
          <thead><tr><th>Product</th><th>SKU</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {data.sales.topSellingProducts.map((p) => (
              <tr key={p.productId}>
                <td>{p.name}</td>
                <td>{p.sku}</td>
                <td>{p.quantity}</td>
                <td>{formatMoney(p.revenue)}</td>
              </tr>
            ))}
            {data.sales.topSellingProducts.length === 0 && (
              <tr><td colSpan={4} className="text-center text-slate-400 py-4">No sales yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
