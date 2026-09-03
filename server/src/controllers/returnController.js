const db = require('../models');
const sequelize = require('../config/database');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { GENERATORS } = require('../services/numberGenerator');
const { logAudit } = require('../services/auditLogger');
const { notify } = require('../services/notifier');
const inventoryEngine = require('../services/inventoryEngine');

const include = [
  { model: db.Sale, as: 'sale' },
  { model: db.User, as: 'processor', attributes: ['id', 'name'] },
  { model: db.ReturnItem, as: 'items', include: [{ model: db.Product, as: 'product' }, { model: db.SaleItem, as: 'saleItem' }] },
];

const list = catchAsync(async (req, res) => {
  const where = {};
  if (req.query.saleId) where.sale_id = req.query.saleId;
  const returns = await db.Return.findAll({ where, include, order: [['created_at', 'DESC']] });
  res.json({ returns });
});

// Shows the original sale plus, for each line, how much has already been returned and how
// much is still returnable - prevents customers from repeatedly returning the same item
// (SRS section 25).
const returnableItems = catchAsync(async (req, res) => {
  const sale = await db.Sale.findByPk(req.params.saleId, {
    include: [{ model: db.SaleItem, as: 'items', include: [{ model: db.Product, as: 'product' }] }],
  });
  if (!sale) throw new ApiError(404, 'Sale not found');
  if (sale.status !== 'completed') throw new ApiError(400, 'Only completed sales can be returned against');

  const items = sale.items.map((item) => ({
    saleItemId: item.id,
    product: item.product,
    quantityPurchased: item.quantity,
    quantityReturned: item.quantity_returned,
    returnableQuantity: item.quantity - item.quantity_returned,
    unitPrice: item.unit_price,
  }));
  res.json({ sale: { id: sale.id, saleNumber: sale.sale_number, receiptNumber: sale.receipt_number, locationId: sale.location_id }, items });
});

// A valid resalable return puts the unit back into available inventory; a damaged return moves
// it to the damaged bucket instead, leaving available stock untouched (SRS section 26).
const create = catchAsync(async (req, res) => {
  const { saleId, items = [], reason } = req.body;
  if (!saleId) throw new ApiError(400, 'saleId is required');
  if (!items.length) throw new ApiError(400, 'A return must have at least one item');

  const record = await sequelize.transaction(async (t) => {
    const sale = await db.Sale.findByPk(saleId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!sale) throw new ApiError(404, 'Sale not found');
    if (sale.status !== 'completed') throw new ApiError(400, 'Only completed sales can be returned against');

    const returnNumber = await GENERATORS.return(t);
    const returnRecord = await db.Return.create({
      return_number: returnNumber, sale_id: saleId, processed_by: req.user.id, reason: reason || null,
    }, { transaction: t });

    let refundTotal = 0;

    for (const entry of items) {
      const saleItem = await db.SaleItem.findOne({ where: { id: entry.saleItemId, sale_id: saleId }, transaction: t, lock: t.LOCK.UPDATE });
      if (!saleItem) throw new ApiError(404, `Sale item ${entry.saleItemId} not found on this sale`);

      const quantity = Number(entry.quantity);
      const returnable = saleItem.quantity - saleItem.quantity_returned;
      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > returnable) {
        throw new ApiError(400, `Cannot return ${quantity} unit(s) - only ${returnable} unit(s) are returnable for this item`);
      }

      const condition = entry.condition === 'damaged' ? 'damaged' : 'resalable';
      const unitRefund = Number(saleItem.unit_price) - (Number(saleItem.discount) / saleItem.quantity || 0);
      const refundAmount = Math.round(unitRefund * quantity * 100) / 100;
      refundTotal += refundAmount;

      await db.ReturnItem.create({
        return_id: returnRecord.id, sale_item_id: saleItem.id, product_id: saleItem.product_id,
        quantity, condition, refund_amount: refundAmount,
      }, { transaction: t });

      saleItem.quantity_returned += quantity;
      await saleItem.save({ transaction: t });

      if (condition === 'resalable') {
        await inventoryEngine.applyMovement({
          productId: saleItem.product_id, locationId: sale.location_id, quantity, type: 'customer_return',
          referenceType: 'return', referenceId: returnRecord.id, referenceNumber: returnNumber,
          userId: req.user.id, reason: reason || 'Customer return - resalable',
        }, t);
      } else {
        await inventoryEngine.moveToDamaged({
          productId: saleItem.product_id, locationId: sale.location_id, quantity,
          referenceType: 'return', referenceId: returnRecord.id, referenceNumber: returnNumber,
          userId: req.user.id, reason: reason || 'Customer return - damaged',
        }, t);
      }
    }

    returnRecord.refund_total = Math.round(refundTotal * 100) / 100;
    await returnRecord.save({ transaction: t });

    if (refundTotal >= 500) {
      await notify({ type: 'large_refund', message: `Large refund of ${refundTotal.toFixed(2)} processed on return ${returnNumber}.`, referenceType: 'return', referenceId: returnRecord.id }, t);
    }

    await logAudit({ userId: req.user.id, action: 'PROCESS_RETURN', entityType: 'return', entityId: returnRecord.id, newValue: req.body }, t);
    return returnRecord;
  });

  const created = await db.Return.findByPk(record.id, { include });
  res.status(201).json({ return: created });
});

module.exports = { list, returnableItems, create };
