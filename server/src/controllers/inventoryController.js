const { Op } = require('sequelize');
const db = require('../models');
const catchAsync = require('../utils/catchAsync');
const { assertLocationAccess, canAccessLocation } = require('../middleware/locationAccess');

// Current stock balances, filterable by location/product (SRS section 8: inventory maintained
// by Product + Location, never one undifferentiated quantity).
const balances = catchAsync(async (req, res) => {
  const { locationId, productId, lowStockOnly, q } = req.query;
  const where = {};
  if (locationId) {
    assertLocationAccess(req, locationId);
    where.location_id = locationId;
  } else if (!req.user.has_global_location_access) {
    where.location_id = { [Op.in]: [...req.userLocationIds] };
  }
  if (productId) where.product_id = productId;

  const productWhere = {};
  if (q) {
    productWhere[Op.or] = [{ name: { [Op.iLike]: `%${q}%` } }, { sku: { [Op.iLike]: `%${q}%` } }];
  }

  const rows = await db.Inventory.findAll({
    where,
    include: [
      { model: db.Product, as: 'product', where: Object.keys(productWhere).length ? productWhere : undefined },
      { model: db.Location, as: 'location' },
    ],
    order: [[{ model: db.Product, as: 'product' }, 'name', 'ASC']],
  });

  const filtered = lowStockOnly === 'true'
    ? rows.filter((r) => r.product && r.product.reorder_level > 0 && r.quantity <= r.product.reorder_level)
    : rows;

  res.json({ inventory: filtered });
});

// Product totals across every accessible location (used by "how much stock do we have" views).
const productTotals = catchAsync(async (req, res) => {
  const rows = await db.Inventory.findAll({
    attributes: ['product_id', [db.sequelize.fn('SUM', db.sequelize.col('quantity')), 'total_quantity']],
    include: [{ model: db.Product, as: 'product', attributes: ['id', 'name', 'sku', 'selling_price', 'purchase_price'] }],
    group: ['product_id', 'product.id'],
  });
  res.json({ totals: rows });
});

// Inventory transaction ledger (SRS section 9-10) - the full traceable movement history.
const ledger = catchAsync(async (req, res) => {
  const { productId, locationId, type, from, to, page = 1, pageSize = 50 } = req.query;
  const where = {};
  if (productId) where.product_id = productId;
  if (locationId) {
    assertLocationAccess(req, locationId);
    where.location_id = locationId;
  } else if (!req.user.has_global_location_access) {
    where.location_id = { [Op.in]: [...req.userLocationIds] };
  }
  if (type) where.type = type;
  if (from || to) {
    where.created_at = {};
    if (from) where.created_at[Op.gte] = new Date(from);
    if (to) where.created_at[Op.lte] = new Date(to);
  }

  const limit = Math.min(Number(pageSize) || 50, 200);
  const offset = (Number(page) - 1) * limit;

  const { rows, count } = await db.InventoryTransaction.findAndCountAll({
    where,
    include: [
      { model: db.Product, as: 'product', attributes: ['id', 'name', 'sku'] },
      { model: db.Location, as: 'location', attributes: ['id', 'name'] },
      { model: db.User, as: 'user', attributes: ['id', 'name'] },
    ],
    order: [['created_at', 'DESC'], ['id', 'DESC']],
    limit, offset,
  });

  res.json({ transactions: rows, total: count, page: Number(page), pageSize: limit });
});

module.exports = { balances, productTotals, ledger };
