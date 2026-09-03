const { Op } = require('sequelize');
const db = require('../models');
const catchAsync = require('../utils/catchAsync');

function locationScope(req) {
  if (!req.user.has_global_location_access) return { location_id: { [Op.in]: [...req.userLocationIds] } };
  return {};
}

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function daysAgo(n) { const x = new Date(); x.setDate(x.getDate() - n); return startOfDay(x); }

// Management dashboard summary (SRS section 36): inventory, sales, financial and
// operations KPIs in one call so the frontend can render everything with a single request.
const summary = catchAsync(async (req, res) => {
  const invWhere = locationScope(req);

  const [totalProducts, inventoryRows] = await Promise.all([
    db.Product.count({ where: { status: 'active' } }),
    db.Inventory.findAll({ where: invWhere, include: [{ model: db.Product, as: 'product', attributes: ['id', 'reorder_level', 'purchase_price'] }] }),
  ]);

  let totalStockUnits = 0, inventoryValue = 0, lowStockCount = 0, outOfStockCount = 0;
  for (const row of inventoryRows) {
    totalStockUnits += row.quantity;
    inventoryValue += row.quantity * Number(row.product.purchase_price);
    if (row.quantity <= 0) outOfStockCount += 1;
    else if (row.product.reorder_level > 0 && row.quantity <= row.product.reorder_level) lowStockCount += 1;
  }

  const expiringCount = await db.GoodsReceiptItem.count({
    where: { expiry_date: { [Op.ne]: null, [Op.lte]: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } },
  });

  const saleWhere = { status: 'completed', ...locationScope(req) };
  const [todaySales, weekSales, monthSales] = await Promise.all([
    db.Sale.findAll({ where: { ...saleWhere, created_at: { [Op.gte]: startOfDay() } } }),
    db.Sale.findAll({ where: { ...saleWhere, created_at: { [Op.gte]: daysAgo(7) } } }),
    db.Sale.findAll({ where: { ...saleWhere, created_at: { [Op.gte]: daysAgo(30) } } }),
  ]);

  const sum = (rows, field) => rows.reduce((s, r) => s + Number(r[field]), 0);
  const round2 = (n) => Math.round(n * 100) / 100;

  const topProductsRaw = await db.SaleItem.findAll({
    include: [
      { model: db.Sale, as: 'sale', where: { ...saleWhere, created_at: { [Op.gte]: daysAgo(30) } }, attributes: [] },
      { model: db.Product, as: 'product', attributes: ['id', 'name', 'sku'] },
    ],
  });
  const topMap = new Map();
  for (const item of topProductsRaw) {
    const key = item.product.id;
    if (!topMap.has(key)) topMap.set(key, { productId: key, name: item.product.name, sku: item.product.sku, quantity: 0, revenue: 0 });
    const g = topMap.get(key);
    g.quantity += item.quantity;
    g.revenue += Number(item.total);
  }
  const topSellingProducts = [...topMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const [pendingTransfers, pendingPurchaseOrders, pendingAdjustmentApprovals] = await Promise.all([
    db.StockTransfer.count({ where: { status: { [Op.in]: ['requested', 'approved', 'in_transit'] } } }),
    db.PurchaseOrder.count({ where: { status: { [Op.in]: ['draft', 'submitted', 'approved', 'partially_received'] } } }),
    db.StockCount.count({ where: { status: 'submitted' } }),
  ]);

  res.json({
    inventory: {
      totalProducts, totalStockUnits, inventoryValue: round2(inventoryValue),
      lowStockCount, outOfStockCount, expiringProductsCount: expiringCount,
    },
    sales: {
      todayRevenue: round2(sum(todaySales, 'total')), todayTransactionCount: todaySales.length,
      weeklyRevenue: round2(sum(weekSales, 'total')), weeklyTransactionCount: weekSales.length,
      monthlyRevenue: round2(sum(monthSales, 'total')), monthlyTransactionCount: monthSales.length,
      averageTransactionValue: monthSales.length ? round2(sum(monthSales, 'total') / monthSales.length) : 0,
      topSellingProducts,
    },
    financial: {
      monthlyRevenue: round2(sum(monthSales, 'total')),
      monthlyCostOfGoodsSold: round2(sum(monthSales, 'cost_total')),
      monthlyGrossProfit: round2(sum(monthSales, 'total') - sum(monthSales, 'cost_total')),
      monthlyDiscounts: round2(sum(monthSales, 'discount_total')),
    },
    operations: { pendingTransfers, pendingPurchaseOrders, pendingAdjustmentApprovals },
  });
});

module.exports = { summary };
