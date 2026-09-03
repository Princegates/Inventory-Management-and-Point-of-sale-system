const db = require('../models');
const sequelize = require('../config/database');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { GENERATORS } = require('../services/numberGenerator');
const { logAudit } = require('../services/auditLogger');
const inventoryEngine = require('../services/inventoryEngine');
const { assertLocationAccess } = require('../middleware/locationAccess');

const include = [
  { model: db.Location, as: 'location' },
  { model: db.User, as: 'counter', attributes: ['id', 'name'] },
  { model: db.User, as: 'approver', attributes: ['id', 'name'] },
  { model: db.StockCountItem, as: 'items', include: [{ model: db.Product, as: 'product' }] },
];

const list = catchAsync(async (req, res) => {
  const where = {};
  if (req.query.locationId) where.location_id = req.query.locationId;
  if (req.query.status) where.status = req.query.status;
  const counts = await db.StockCount.findAll({ where, include, order: [['created_at', 'DESC']] });
  res.json({ stockCounts: counts });
});

const get = catchAsync(async (req, res) => {
  const count = await db.StockCount.findByPk(req.params.id, { include });
  if (!count) throw new ApiError(404, 'Stock count not found');
  res.json({ stockCount: count });
});

// Opens a physical count session and snapshots the current system quantity for each product
// so the eventual variance can be computed (SRS section 15).
const create = catchAsync(async (req, res) => {
  const { locationId, productIds = [], notes } = req.body;
  if (!locationId) throw new ApiError(400, 'locationId is required');
  assertLocationAccess(req, locationId);

  const record = await sequelize.transaction(async (t) => {
    const countNumber = await GENERATORS.stockCount(t);
    const count = await db.StockCount.create({
      count_number: countNumber, location_id: locationId, counted_by: req.user.id, notes, status: 'draft',
    }, { transaction: t });

    const inventoryWhere = { location_id: locationId };
    if (productIds.length) inventoryWhere.product_id = productIds;
    const balances = await db.Inventory.findAll({ where: inventoryWhere, transaction: t });

    await db.StockCountItem.bulkCreate(balances.map((b) => ({
      stock_count_id: count.id, product_id: b.product_id, system_quantity: b.quantity,
    })), { transaction: t });

    await logAudit({ userId: req.user.id, action: 'CREATE_STOCK_COUNT', entityType: 'stock_count', entityId: count.id, newValue: req.body }, t);
    return count;
  });

  const created = await db.StockCount.findByPk(record.id, { include });
  res.status(201).json({ stockCount: created });
});

// Records the physically-counted quantities (SRS section 15 example: System / Physical / Difference).
const recordCounts = catchAsync(async (req, res) => {
  const { items = [] } = req.body; // [{ id, physicalQuantity, reason }]
  const count = await db.StockCount.findByPk(req.params.id);
  if (!count) throw new ApiError(404, 'Stock count not found');
  if (count.status !== 'draft') throw new ApiError(400, 'Only draft stock counts can be edited');

  await sequelize.transaction(async (t) => {
    for (const entry of items) {
      const item = await db.StockCountItem.findOne({ where: { id: entry.id, stock_count_id: count.id }, transaction: t });
      if (!item) continue;
      item.physical_quantity = entry.physicalQuantity;
      item.difference = Number(entry.physicalQuantity) - item.system_quantity;
      item.reason = entry.reason || null;
      await item.save({ transaction: t });
    }
  });

  const updated = await db.StockCount.findByPk(req.params.id, { include });
  res.json({ stockCount: updated });
});

const submit = catchAsync(async (req, res) => {
  const count = await db.StockCount.findByPk(req.params.id);
  if (!count) throw new ApiError(404, 'Stock count not found');
  if (count.status !== 'draft') throw new ApiError(400, `Cannot submit a stock count in status ${count.status}`);
  count.status = 'submitted';
  await count.save();
  await logAudit({ userId: req.user.id, action: 'SUBMIT_STOCK_COUNT', entityType: 'stock_count', entityId: count.id });
  res.json({ stockCount: count });
});

// Approval applies every non-zero variance to inventory through the engine, each producing a
// traceable stock_count_adjustment ledger entry (SRS: "Adjustments shall require authorization").
const approve = catchAsync(async (req, res) => {
  await sequelize.transaction(async (t) => {
    // Postgres rejects FOR UPDATE combined with an outer-join include, so lock the parent row
    // alone and fetch its items separately.
    const count = await db.StockCount.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!count) throw new ApiError(404, 'Stock count not found');
    if (count.status !== 'submitted') throw new ApiError(400, `Cannot approve a stock count in status ${count.status}`);
    count.items = await db.StockCountItem.findAll({ where: { stock_count_id: count.id }, transaction: t });

    for (const item of count.items) {
      if (item.physical_quantity === null || Number(item.difference) === 0) continue;
      await inventoryEngine.applyMovement({
        productId: item.product_id, locationId: count.location_id, quantity: item.difference,
        type: 'stock_count_adjustment', referenceType: 'stock_count', referenceId: count.id,
        referenceNumber: count.count_number, userId: req.user.id, reason: item.reason || 'Stock count variance',
      }, t);
    }

    count.status = 'approved';
    count.approved_by = req.user.id;
    await count.save({ transaction: t });
    await logAudit({ userId: req.user.id, action: 'APPROVE_STOCK_COUNT', entityType: 'stock_count', entityId: count.id }, t);
  });

  const updated = await db.StockCount.findByPk(req.params.id, { include });
  res.json({ stockCount: updated });
});

module.exports = { list, get, create, recordCounts, submit, approve };
