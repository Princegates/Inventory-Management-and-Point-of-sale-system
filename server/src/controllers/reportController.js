const { Op } = require('sequelize');
const db = require('../models');
const catchAsync = require('../utils/catchAsync');

function dateRange(query) {
  const where = {};
  if (query.from || query.to) {
    where.created_at = {};
    if (query.from) where.created_at[Op.gte] = new Date(query.from);
    if (query.to) where.created_at[Op.lte] = new Date(query.to);
  }
  return where;
}

function locationScope(req, query) {
  if (query.locationId) return { location_id: query.locationId };
  if (!req.user.has_global_location_access) return { location_id: { [Op.in]: [...req.userLocationIds] } };
  return {};
}

// ---- Inventory reports (SRS section 37) ----

const inventoryCurrent = catchAsync(async (req, res) => {
  const where = locationScope(req, req.query);
  const rows = await db.Inventory.findAll({
    where,
    include: [
      { model: db.Product, as: 'product', attributes: ['id', 'name', 'sku', 'purchase_price', 'selling_price', 'category_id'] },
      { model: db.Location, as: 'location', attributes: ['id', 'name', 'type'] },
    ],
    order: [[{ model: db.Product, as: 'product' }, 'name', 'ASC']],
  });

  let totalValue = 0;
  const items = rows.map((r) => {
    const value = Number(r.quantity) * Number(r.product.purchase_price);
    totalValue += value;
    return {
      productId: r.product.id, productName: r.product.name, sku: r.product.sku,
      locationId: r.location.id, locationName: r.location.name,
      quantity: r.quantity, quantityInTransit: r.quantity_in_transit, quantityDamaged: r.quantity_damaged,
      unitCost: r.product.purchase_price, value: Math.round(value * 100) / 100,
    };
  });
  res.json({ items, totalValue: Math.round(totalValue * 100) / 100 });
});

const inventoryLowStock = catchAsync(async (req, res) => {
  const where = locationScope(req, req.query);
  const rows = await db.Inventory.findAll({
    where,
    include: [
      { model: db.Product, as: 'product', attributes: ['id', 'name', 'sku', 'reorder_level'], where: { reorder_level: { [Op.gt]: 0 } } },
      { model: db.Location, as: 'location', attributes: ['id', 'name'] },
    ],
  });
  const lowStock = rows.filter((r) => r.quantity <= r.product.reorder_level && r.quantity > 0);
  const outOfStock = rows.filter((r) => r.quantity <= 0);
  res.json({
    lowStock: lowStock.map((r) => ({ productId: r.product.id, productName: r.product.name, sku: r.product.sku, locationId: r.location.id, locationName: r.location.name, quantity: r.quantity, reorderLevel: r.product.reorder_level })),
    outOfStock: outOfStock.map((r) => ({ productId: r.product.id, productName: r.product.name, sku: r.product.sku, locationId: r.location.id, locationName: r.location.name, quantity: r.quantity })),
  });
});

// Products received with an expiry date approaching or already passed (SRS section 33).
const inventoryExpiry = catchAsync(async (req, res) => {
  const days = Number(req.query.days) || 30;
  const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const items = await db.GoodsReceiptItem.findAll({
    where: { expiry_date: { [Op.ne]: null, [Op.lte]: cutoff } },
    include: [
      { model: db.Product, as: 'product', attributes: ['id', 'name', 'sku'] },
      { model: db.GoodsReceipt, as: 'goodsReceipt', include: [{ model: db.Location, as: 'location', attributes: ['id', 'name'] }] },
    ],
    order: [['expiry_date', 'ASC']],
  });
  res.json({
    items: items.map((i) => ({
      productId: i.product.id, productName: i.product.name, sku: i.product.sku,
      locationId: i.goodsReceipt.location.id, locationName: i.goodsReceipt.location.name,
      batchNumber: i.batch_number, expiryDate: i.expiry_date, quantityReceived: i.received_quantity,
      status: i.expiry_date < new Date() ? 'expired' : 'expiring_soon',
    })),
  });
});

const stockAdjustmentReport = catchAsync(async (req, res) => {
  const where = { ...dateRange(req.query) };
  if (req.query.locationId) where.location_id = req.query.locationId;
  const adjustments = await db.StockAdjustment.findAll({
    where, include: [{ model: db.Product, as: 'product' }, { model: db.Location, as: 'location' }, { model: db.User, as: 'user', attributes: ['id', 'name'] }],
    order: [['created_at', 'DESC']],
  });
  res.json({ adjustments });
});

const stockCountVariance = catchAsync(async (req, res) => {
  const where = {};
  if (req.query.locationId) where.location_id = req.query.locationId;
  const counts = await db.StockCount.findAll({
    where, include: [{ model: db.StockCountItem, as: 'items', include: [{ model: db.Product, as: 'product' }] }, { model: db.Location, as: 'location' }],
    order: [['created_at', 'DESC']],
  });
  res.json({ stockCounts: counts });
});

// ---- Sales reports (SRS section 37) ----

const salesSummary = catchAsync(async (req, res) => {
  const where = { ...dateRange(req.query), ...locationScope(req, req.query), status: 'completed' };
  const sales = await db.Sale.findAll({ where });

  const totalRevenue = sales.reduce((s, x) => s + Number(x.total), 0);
  const totalDiscount = sales.reduce((s, x) => s + Number(x.discount_total), 0);
  const totalTax = sales.reduce((s, x) => s + Number(x.tax_total), 0);
  const totalCost = sales.reduce((s, x) => s + Number(x.cost_total), 0);
  const count = sales.length;

  res.json({
    transactionCount: count,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    grossProfit: Math.round((totalRevenue - totalCost) * 100) / 100,
    averageTransactionValue: count ? Math.round((totalRevenue / count) * 100) / 100 : 0,
  });
});

const GROUP_CONFIG = {
  product: { model: 'SaleItem', label: 'productId' },
  cashier: { column: 'cashier_id' },
  shop: { column: 'location_id' },
  paymentMethod: null, // handled separately (joins payments)
  customer: { column: 'customer_id' },
};

const salesByDimension = catchAsync(async (req, res) => {
  const dimension = req.query.by || 'product';
  const saleWhere = { ...dateRange(req.query), ...locationScope(req, req.query), status: 'completed' };

  if (dimension === 'product' || dimension === 'category') {
    const items = await db.SaleItem.findAll({
      include: [
        { model: db.Sale, as: 'sale', where: saleWhere, attributes: [] },
        { model: db.Product, as: 'product', attributes: ['id', 'name', 'sku', 'category_id'] },
      ],
    });
    const groups = new Map();
    for (const item of items) {
      const key = dimension === 'product' ? item.product.id : (item.product.category_id || 'uncategorized');
      const label = dimension === 'product' ? item.product.name : String(item.product.category_id || 'Uncategorized');
      if (!groups.has(key)) groups.set(key, { key, label, quantity: 0, revenue: 0, cost: 0 });
      const g = groups.get(key);
      g.quantity += item.quantity;
      g.revenue += Number(item.total);
      g.cost += Number(item.unit_cost) * item.quantity;
    }
    return res.json({ groups: [...groups.values()].sort((a, b) => b.revenue - a.revenue) });
  }

  if (dimension === 'paymentMethod') {
    const payments = await db.Payment.findAll({
      include: [{ model: db.Sale, as: 'sale', where: saleWhere, attributes: [] }],
    });
    const groups = new Map();
    for (const p of payments) {
      if (!groups.has(p.method)) groups.set(p.method, { key: p.method, label: p.method, amount: 0, count: 0 });
      const g = groups.get(p.method);
      g.amount += Number(p.amount);
      g.count += 1;
    }
    return res.json({ groups: [...groups.values()] });
  }

  const config = GROUP_CONFIG[dimension];
  if (!config) return res.json({ groups: [] });

  const sales = await db.Sale.findAll({
    where: saleWhere,
    include: dimension === 'cashier'
      ? [{ model: db.User, as: 'cashier', attributes: ['id', 'name'] }]
      : dimension === 'shop'
        ? [{ model: db.Location, as: 'location', attributes: ['id', 'name'] }]
        : [{ model: db.Customer, as: 'customer', attributes: ['id', 'name'] }],
  });

  const groups = new Map();
  for (const sale of sales) {
    const entity = dimension === 'cashier' ? sale.cashier : dimension === 'shop' ? sale.location : sale.customer;
    const key = entity ? entity.id : 'unknown';
    const label = entity ? (entity.name) : 'Walk-in';
    if (!groups.has(key)) groups.set(key, { key, label, revenue: 0, transactionCount: 0 });
    const g = groups.get(key);
    g.revenue += Number(sale.total);
    g.transactionCount += 1;
  }
  res.json({ groups: [...groups.values()].sort((a, b) => b.revenue - a.revenue) });
});

// ---- Purchasing reports (SRS section 37) ----

const purchasingSummary = catchAsync(async (req, res) => {
  const where = { ...dateRange(req.query) };
  if (req.query.supplierId) where.supplier_id = req.query.supplierId;
  const orders = await db.PurchaseOrder.findAll({ where, include: [{ model: db.Supplier, as: 'supplier' }] });

  const bySupplier = new Map();
  let totalValue = 0, outstanding = 0;
  for (const po of orders) {
    totalValue += Number(po.total_cost);
    if (!['fully_received', 'cancelled', 'closed'].includes(po.status)) outstanding += 1;
    const key = po.supplier_id;
    if (!bySupplier.has(key)) bySupplier.set(key, { supplierId: key, supplierName: po.supplier?.name, orderCount: 0, totalValue: 0 });
    const g = bySupplier.get(key);
    g.orderCount += 1;
    g.totalValue += Number(po.total_cost);
  }

  res.json({
    orderCount: orders.length, totalValue: Math.round(totalValue * 100) / 100, outstandingOrders: outstanding,
    bySupplier: [...bySupplier.values()],
  });
});

// ---- Profitability reports (SRS section 37, 35) ----

const profitability = catchAsync(async (req, res) => {
  const saleWhere = { ...dateRange(req.query), ...locationScope(req, req.query), status: 'completed' };
  const sales = await db.Sale.findAll({ where: saleWhere });

  const grossSales = sales.reduce((s, x) => s + Number(x.subtotal), 0);
  const discounts = sales.reduce((s, x) => s + Number(x.discount_total), 0);
  const netSales = sales.reduce((s, x) => s + Number(x.total) - Number(x.tax_total), 0);
  const cogs = sales.reduce((s, x) => s + Number(x.cost_total), 0);
  const grossProfit = netSales - cogs;

  res.json({
    grossSales: Math.round(grossSales * 100) / 100,
    discounts: Math.round(discounts * 100) / 100,
    netSales: Math.round(netSales * 100) / 100,
    costOfGoodsSold: Math.round(cogs * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossMarginPercent: netSales ? Math.round((grossProfit / netSales) * 10000) / 100 : 0,
  });
});

module.exports = {
  inventoryCurrent, inventoryLowStock, inventoryExpiry, stockAdjustmentReport, stockCountVariance,
  salesSummary, salesByDimension, purchasingSummary, profitability,
};
