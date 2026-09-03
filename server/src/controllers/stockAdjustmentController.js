const db = require('../models');
const sequelize = require('../config/database');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { GENERATORS } = require('../services/numberGenerator');
const { logAudit } = require('../services/auditLogger');
const inventoryEngine = require('../services/inventoryEngine');
const { assertLocationAccess } = require('../middleware/locationAccess');

const include = [
  { model: db.Product, as: 'product' },
  { model: db.Location, as: 'location' },
  { model: db.User, as: 'user', attributes: ['id', 'name'] },
];

const list = catchAsync(async (req, res) => {
  const where = {};
  if (req.query.locationId) where.location_id = req.query.locationId;
  if (req.query.productId) where.product_id = req.query.productId;
  const adjustments = await db.StockAdjustment.findAll({ where, include, order: [['created_at', 'DESC']] });
  res.json({ stockAdjustments: adjustments });
});

// Authorized users may adjust inventory directly for damage/theft/counting error/etc
// (SRS section 16). Every adjustment is written to the audit trail and the inventory ledger.
const create = catchAsync(async (req, res) => {
  const { productId, locationId, quantity, reason, notes } = req.body;
  if (!productId || !locationId || !quantity || !reason) {
    throw new ApiError(400, 'productId, locationId, quantity and reason are required');
  }
  if (!Number.isInteger(Number(quantity)) || Number(quantity) === 0) {
    throw new ApiError(400, 'quantity must be a non-zero integer (positive = increase, negative = decrease)');
  }
  assertLocationAccess(req, locationId);

  const adjustment = await sequelize.transaction(async (t) => {
    const adjustmentNumber = await GENERATORS.adjustment(t);
    const record = await db.StockAdjustment.create({
      adjustment_number: adjustmentNumber, product_id: productId, location_id: locationId,
      quantity, reason, notes, user_id: req.user.id,
    }, { transaction: t });

    const movementType = Number(quantity) > 0 ? 'adjustment_increase' : (reason === 'damaged' ? 'damaged' : (reason === 'expired' ? 'expired' : 'adjustment_decrease'));

    await inventoryEngine.applyMovement({
      productId, locationId, quantity: Number(quantity), type: movementType,
      referenceType: 'stock_adjustment', referenceId: record.id, referenceNumber: adjustmentNumber,
      userId: req.user.id, reason: notes || reason,
    }, t);

    await logAudit({ userId: req.user.id, action: 'STOCK_ADJUSTMENT', entityType: 'stock_adjustment', entityId: record.id, newValue: req.body }, t);
    return record;
  });

  const created = await db.StockAdjustment.findByPk(adjustment.id, { include });
  res.status(201).json({ stockAdjustment: created });
});

module.exports = { list, create };
