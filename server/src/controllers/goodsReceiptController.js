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
  { model: db.User, as: 'receiver', attributes: ['id', 'name'] },
  { model: db.PurchaseOrder, as: 'purchaseOrder' },
  { model: db.GoodsReceiptItem, as: 'items', include: [{ model: db.Product, as: 'product' }] },
];

const list = catchAsync(async (req, res) => {
  const where = {};
  if (req.query.purchaseOrderId) where.purchase_order_id = req.query.purchaseOrderId;
  if (req.query.locationId) where.location_id = req.query.locationId;
  const receipts = await db.GoodsReceipt.findAll({ where, include, order: [['received_at', 'DESC']] });
  res.json({ goodsReceipts: receipts });
});

const get = catchAsync(async (req, res) => {
  const receipt = await db.GoodsReceipt.findByPk(req.params.id, { include });
  if (!receipt) throw new ApiError(404, 'Goods receipt not found');
  res.json({ goodsReceipt: receipt });
});

// Confirms goods have arrived (SRS section 12): only the accepted/good quantity automatically
// enters available inventory - damaged and missing quantities are recorded but do not.
const create = catchAsync(async (req, res) => {
  const { purchaseOrderId, locationId, notes, items = [] } = req.body;
  if (!locationId) throw new ApiError(400, 'locationId is required');
  if (!items.length) throw new ApiError(400, 'A goods receipt must have at least one item');
  assertLocationAccess(req, locationId);

  const result = await sequelize.transaction(async (t) => {
    let purchaseOrder = null;
    if (purchaseOrderId) {
      purchaseOrder = await db.PurchaseOrder.findByPk(purchaseOrderId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!purchaseOrder) throw new ApiError(404, 'Purchase order not found');
      if (!['approved', 'partially_received'].includes(purchaseOrder.status)) {
        throw new ApiError(400, `Purchase order must be approved before receiving (currently ${purchaseOrder.status})`);
      }
    }

    const receiptNumber = await GENERATORS.goodsReceipt(t);
    const receipt = await db.GoodsReceipt.create({
      receipt_number: receiptNumber, purchase_order_id: purchaseOrderId || null,
      location_id: locationId, received_by: req.user.id, notes,
    }, { transaction: t });

    for (const item of items) {
      const receivedQty = Number(item.receivedQuantity) || 0;
      const damagedQty = Number(item.damagedQuantity) || 0;
      const missingQty = Number(item.missingQuantity) || 0;

      const receiptItem = await db.GoodsReceiptItem.create({
        goods_receipt_id: receipt.id, product_id: item.productId,
        ordered_quantity: item.orderedQuantity || null,
        received_quantity: receivedQty, damaged_quantity: damagedQty, missing_quantity: missingQty,
        unit_cost: item.unitCost || 0, batch_number: item.batchNumber || null, expiry_date: item.expiryDate || null,
      }, { transaction: t });

      if (receivedQty > 0) {
        await inventoryEngine.applyMovement({
          productId: item.productId, locationId, quantity: receivedQty, type: 'purchase_receipt',
          referenceType: 'goods_receipt', referenceId: receipt.id, referenceNumber: receiptNumber,
          userId: req.user.id, reason: purchaseOrder ? `Received against ${purchaseOrder.po_number}` : 'Direct stock receipt',
        }, t);
      }

      if (purchaseOrder) {
        const poItem = await db.PurchaseOrderItem.findOne({
          where: { purchase_order_id: purchaseOrder.id, product_id: item.productId }, transaction: t,
        });
        if (poItem) {
          poItem.quantity_received += receivedQty;
          await poItem.save({ transaction: t });
        }
      }

      if (item.purchasePrice === undefined && item.unitCost) {
        // keep product's standard cost roughly current; explicit price edits still go through
        // the product controller's tracked price-history flow.
        await db.Product.update({ purchase_price: item.unitCost }, { where: { id: item.productId }, transaction: t });
      }

      void receiptItem;
    }

    if (purchaseOrder) {
      const poItems = await db.PurchaseOrderItem.findAll({ where: { purchase_order_id: purchaseOrder.id }, transaction: t });
      const fullyReceived = poItems.every((i) => i.quantity_received >= i.quantity);
      purchaseOrder.status = fullyReceived ? 'fully_received' : 'partially_received';
      await purchaseOrder.save({ transaction: t });
    }

    await logAudit({ userId: req.user.id, action: 'GOODS_RECEIPT', entityType: 'goods_receipt', entityId: receipt.id, newValue: req.body }, t);
    return receipt;
  });

  const created = await db.GoodsReceipt.findByPk(result.id, { include });
  res.status(201).json({ goodsReceipt: created });
});

module.exports = { list, get, create };
