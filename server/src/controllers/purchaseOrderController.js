const db = require('../models');
const sequelize = require('../config/database');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { GENERATORS } = require('../services/numberGenerator');
const { logAudit } = require('../services/auditLogger');
const { assertLocationAccess } = require('../middleware/locationAccess');

const include = [
  { model: db.Supplier, as: 'supplier' },
  { model: db.Location, as: 'location' },
  { model: db.User, as: 'creator', attributes: ['id', 'name'] },
  { model: db.User, as: 'approver', attributes: ['id', 'name'] },
  { model: db.PurchaseOrderItem, as: 'items', include: [{ model: db.Product, as: 'product' }] },
];

const list = catchAsync(async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.supplierId) where.supplier_id = req.query.supplierId;
  const orders = await db.PurchaseOrder.findAll({ where, include, order: [['created_at', 'DESC']] });
  res.json({ purchaseOrders: orders });
});

const get = catchAsync(async (req, res) => {
  const order = await db.PurchaseOrder.findByPk(req.params.id, {
    include: [...include, { model: db.GoodsReceipt, as: 'goodsReceipts' }],
  });
  if (!order) throw new ApiError(404, 'Purchase order not found');
  res.json({ purchaseOrder: order });
});

const create = catchAsync(async (req, res) => {
  const { supplierId, locationId, expectedDate, notes, items = [] } = req.body;
  if (!supplierId || !locationId) throw new ApiError(400, 'supplierId and locationId are required');
  if (!items.length) throw new ApiError(400, 'A purchase order must have at least one item');
  assertLocationAccess(req, locationId);

  const order = await sequelize.transaction(async (t) => {
    const poNumber = await GENERATORS.purchaseOrder(t);
    const totalCost = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unitCost), 0);

    const po = await db.PurchaseOrder.create({
      po_number: poNumber, supplier_id: supplierId, location_id: locationId,
      expected_date: expectedDate || null, notes, created_by: req.user.id, total_cost: totalCost,
      status: 'draft',
    }, { transaction: t });

    await db.PurchaseOrderItem.bulkCreate(items.map((i) => ({
      purchase_order_id: po.id, product_id: i.productId, quantity: i.quantity,
      unit_cost: i.unitCost, total_cost: Number(i.quantity) * Number(i.unitCost),
    })), { transaction: t });

    await logAudit({ userId: req.user.id, action: 'CREATE_PURCHASE_ORDER', entityType: 'purchase_order', entityId: po.id, newValue: req.body }, t);
    return po;
  });

  const created = await db.PurchaseOrder.findByPk(order.id, { include });
  res.status(201).json({ purchaseOrder: created });
});

const VALID_TRANSITIONS = {
  draft: ['submitted', 'cancelled'],
  submitted: ['approved', 'cancelled'],
  approved: ['partially_received', 'fully_received', 'cancelled'],
  partially_received: ['fully_received', 'cancelled'],
};

const setStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  if (status === 'approved' && !req.userPermissions.has('APPROVE_PURCHASE')) {
    throw new ApiError(403, 'Missing required permission: APPROVE_PURCHASE');
  }
  const order = await db.PurchaseOrder.findByPk(req.params.id);
  if (!order) throw new ApiError(404, 'Purchase order not found');

  const allowed = VALID_TRANSITIONS[order.status] || [];
  if (!allowed.includes(status)) {
    throw new ApiError(400, `Cannot move purchase order from ${order.status} to ${status}`);
  }

  const before = order.status;
  order.status = status;
  if (status === 'approved') order.approved_by = req.user.id;
  await order.save();

  await logAudit({ userId: req.user.id, action: 'PURCHASE_ORDER_STATUS_CHANGE', entityType: 'purchase_order', entityId: order.id, previousValue: { status: before }, newValue: { status } });
  res.json({ purchaseOrder: order });
});

module.exports = { list, get, create, setStatus };
