const { Op } = require('sequelize');
const db = require('../models');
const sequelize = require('../config/database');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { GENERATORS } = require('../services/numberGenerator');
const { logAudit } = require('../services/auditLogger');
const { notify } = require('../services/notifier');
const inventoryEngine = require('../services/inventoryEngine');
const { assertLocationAccess } = require('../middleware/locationAccess');

const include = [
  { model: db.Location, as: 'sourceLocation' },
  { model: db.Location, as: 'destinationLocation' },
  { model: db.User, as: 'requester', attributes: ['id', 'name'] },
  { model: db.User, as: 'approver', attributes: ['id', 'name'] },
  { model: db.User, as: 'issuer', attributes: ['id', 'name'] },
  { model: db.User, as: 'receiver', attributes: ['id', 'name'] },
  { model: db.StockTransferItem, as: 'items', include: [{ model: db.Product, as: 'product' }] },
];

const list = catchAsync(async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (!req.user.has_global_location_access) {
    const ids = [...req.userLocationIds];
    where[Op.or] = [{ source_location_id: ids }, { destination_location_id: ids }];
  }
  const transfers = await db.StockTransfer.findAll({ where, include, order: [['created_at', 'DESC']] });
  res.json({ stockTransfers: transfers });
});

const get = catchAsync(async (req, res) => {
  const transfer = await db.StockTransfer.findByPk(req.params.id, { include });
  if (!transfer) throw new ApiError(404, 'Stock transfer not found');
  res.json({ stockTransfer: transfer });
});

// Transfer Request -> Approval -> Stock Issued -> In Transit -> Stock Received -> Completed (SRS section 13).
const create = catchAsync(async (req, res) => {
  const { sourceLocationId, destinationLocationId, notes, items = [] } = req.body;
  if (!sourceLocationId || !destinationLocationId) throw new ApiError(400, 'sourceLocationId and destinationLocationId are required');
  if (sourceLocationId === destinationLocationId) throw new ApiError(400, 'Source and destination locations must differ');
  if (!items.length) throw new ApiError(400, 'A transfer must have at least one item');
  assertLocationAccess(req, sourceLocationId);

  const transfer = await sequelize.transaction(async (t) => {
    const transferNumber = await GENERATORS.transfer(t);
    const record = await db.StockTransfer.create({
      transfer_number: transferNumber, source_location_id: sourceLocationId, destination_location_id: destinationLocationId,
      requested_by: req.user.id, notes, status: 'requested',
    }, { transaction: t });

    await db.StockTransferItem.bulkCreate(items.map((i) => ({
      stock_transfer_id: record.id, product_id: i.productId, quantity: i.quantity,
    })), { transaction: t });

    await logAudit({ userId: req.user.id, action: 'REQUEST_TRANSFER', entityType: 'stock_transfer', entityId: record.id, newValue: req.body }, t);
    return record;
  });

  const created = await db.StockTransfer.findByPk(transfer.id, { include });
  res.status(201).json({ stockTransfer: created });
});

// Postgres refuses FOR UPDATE combined with an outer-join include ("FOR UPDATE cannot be
// applied to the nullable side of an outer join"), so the parent row is locked on its own and
// the line items are fetched separately - the items themselves are never mutated concurrently,
// only the inventory rows they reference, which are locked individually inside the engine.
async function loadTransferWithItems(id, t) {
  const transfer = await db.StockTransfer.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
  if (!transfer) throw new ApiError(404, 'Stock transfer not found');
  transfer.items = await db.StockTransferItem.findAll({ where: { stock_transfer_id: transfer.id }, transaction: t });
  return transfer;
}

const approve = catchAsync(async (req, res) => {
  await sequelize.transaction(async (t) => {
    const transfer = await loadTransferWithItems(req.params.id, t);
    if (transfer.status !== 'requested') throw new ApiError(400, `Cannot approve a transfer in status ${transfer.status}`);
    transfer.status = 'approved';
    transfer.approved_by = req.user.id;
    await transfer.save({ transaction: t });
    await logAudit({ userId: req.user.id, action: 'APPROVE_TRANSFER', entityType: 'stock_transfer', entityId: transfer.id }, t);
  });
  const updated = await db.StockTransfer.findByPk(req.params.id, { include });
  res.json({ stockTransfer: updated });
});

// Issues stock from the source: source quantity decreases, source in-transit bucket increases.
const issue = catchAsync(async (req, res) => {
  await sequelize.transaction(async (t) => {
    const transfer = await loadTransferWithItems(req.params.id, t);
    if (transfer.status !== 'approved') throw new ApiError(400, `Cannot issue a transfer in status ${transfer.status}`);
    assertLocationAccess(req, transfer.source_location_id);

    for (const item of transfer.items) {
      await inventoryEngine.issueToTransit({
        productId: item.product_id, locationId: transfer.source_location_id, quantity: item.quantity,
        referenceType: 'stock_transfer', referenceId: transfer.id, referenceNumber: transfer.transfer_number, userId: req.user.id,
      }, t);
    }

    transfer.status = 'in_transit';
    transfer.issued_by = req.user.id;
    transfer.issued_at = new Date();
    await transfer.save({ transaction: t });

    const destination = await db.Location.findByPk(transfer.destination_location_id, { transaction: t });
    await notify({ type: 'pending_transfer', message: `Transfer ${transfer.transfer_number} is in transit to ${destination.name}.`, referenceType: 'stock_transfer', referenceId: transfer.id }, t);
    await logAudit({ userId: req.user.id, action: 'ISSUE_TRANSFER', entityType: 'stock_transfer', entityId: transfer.id }, t);
  });
  const updated = await db.StockTransfer.findByPk(req.params.id, { include });
  res.json({ stockTransfer: updated });
});

// Confirms receipt at the destination: in-transit bucket clears, destination quantity increases.
const receive = catchAsync(async (req, res) => {
  await sequelize.transaction(async (t) => {
    const transfer = await loadTransferWithItems(req.params.id, t);
    if (transfer.status !== 'in_transit') throw new ApiError(400, `Cannot receive a transfer in status ${transfer.status}`);
    assertLocationAccess(req, transfer.destination_location_id);

    for (const item of transfer.items) {
      await inventoryEngine.receiveFromTransit({
        productId: item.product_id, sourceLocationId: transfer.source_location_id,
        destinationLocationId: transfer.destination_location_id, quantity: item.quantity,
        referenceType: 'stock_transfer', referenceId: transfer.id, referenceNumber: transfer.transfer_number, userId: req.user.id,
      }, t);
    }

    transfer.status = 'completed';
    transfer.received_by = req.user.id;
    transfer.received_at = new Date();
    await transfer.save({ transaction: t });

    await notify({ type: 'transfer_received', message: `Transfer ${transfer.transfer_number} received.`, referenceType: 'stock_transfer', referenceId: transfer.id }, t);
    await logAudit({ userId: req.user.id, action: 'RECEIVE_TRANSFER', entityType: 'stock_transfer', entityId: transfer.id }, t);
  });
  const updated = await db.StockTransfer.findByPk(req.params.id, { include });
  res.json({ stockTransfer: updated });
});

const cancel = catchAsync(async (req, res) => {
  await sequelize.transaction(async (t) => {
    const transfer = await loadTransferWithItems(req.params.id, t);
    if (!['requested', 'approved', 'in_transit'].includes(transfer.status)) {
      throw new ApiError(400, `Cannot cancel a transfer in status ${transfer.status}`);
    }

    if (transfer.status === 'in_transit') {
      for (const item of transfer.items) {
        await inventoryEngine.cancelTransit({
          productId: item.product_id, locationId: transfer.source_location_id, quantity: item.quantity,
          referenceType: 'stock_transfer', referenceId: transfer.id, referenceNumber: transfer.transfer_number, userId: req.user.id,
        }, t);
      }
    }

    transfer.status = 'cancelled';
    await transfer.save({ transaction: t });
    await logAudit({ userId: req.user.id, action: 'CANCEL_TRANSFER', entityType: 'stock_transfer', entityId: transfer.id, newValue: { reason: req.body.reason } }, t);
  });
  const updated = await db.StockTransfer.findByPk(req.params.id, { include });
  res.json({ stockTransfer: updated });
});

module.exports = { list, get, create, approve, issue, receive, cancel };
