const { Op } = require('sequelize');
const db = require('../models');
const sequelize = require('../config/database');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { GENERATORS } = require('../services/numberGenerator');
const { logAudit } = require('../services/auditLogger');
const { notify, checkStockThresholds } = require('../services/notifier');
const emailService = require('../services/emailService');
const inventoryEngine = require('../services/inventoryEngine');
const { assertLocationAccess } = require('../middleware/locationAccess');

const include = [
  { model: db.Location, as: 'location' },
  { model: db.User, as: 'cashier', attributes: ['id', 'name'] },
  { model: db.Customer, as: 'customer' },
  { model: db.SaleItem, as: 'items', include: [{ model: db.Product, as: 'product', attributes: ['id', 'name', 'sku', 'barcode'] }] },
  { model: db.Payment, as: 'payments' },
];

const list = catchAsync(async (req, res) => {
  const { locationId, cashierId, status, from, to, page = 1, pageSize = 25 } = req.query;
  const where = {};
  if (locationId) { assertLocationAccess(req, locationId); where.location_id = locationId; }
  else if (!req.user.has_global_location_access) where.location_id = { [Op.in]: [...req.userLocationIds] };
  if (cashierId) where.cashier_id = cashierId;
  if (status) where.status = status;
  if (from || to) {
    where.created_at = {};
    if (from) where.created_at[Op.gte] = new Date(from);
    if (to) where.created_at[Op.lte] = new Date(to);
  }

  const limit = Math.min(Number(pageSize) || 25, 200);
  const offset = (Number(page) - 1) * limit;
  const { rows, count } = await db.Sale.findAndCountAll({ where, include, order: [['created_at', 'DESC']], limit, offset, distinct: true });
  res.json({ sales: rows, total: count, page: Number(page), pageSize: limit });
});

const get = catchAsync(async (req, res) => {
  const sale = await db.Sale.findByPk(req.params.id, { include });
  if (!sale) throw new ApiError(404, 'Sale not found');
  res.json({ sale });
});

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Creates a POS sale. This is the single most important write path in the system - it must
 * implement the full chain from SRS section 55 inside one database transaction:
 *   Sale Created -> Payment Confirmed -> Inventory Validation -> Inventory Transaction Created
 *   -> Stock Balance Updated -> Profit/COGS Calculated -> Receipt Generated
 * If any step fails (insufficient stock, bad payment total) the whole transaction rolls back,
 * so a sale is never half-recorded (payment without inventory movement, or vice versa).
 */
const create = catchAsync(async (req, res) => {
  const { locationId, cashierSessionId, customerId, terminalId, items = [], payments = [] } = req.body;

  if (!locationId) throw new ApiError(400, 'locationId is required');
  if (!items.length) throw new ApiError(400, 'A sale must have at least one item');
  if (!payments.length) throw new ApiError(400, 'At least one payment is required');
  assertLocationAccess(req, locationId);

  const session = await db.CashierSession.findByPk(cashierSessionId);
  if (!session || session.status !== 'open' || session.cashier_id !== req.user.id) {
    throw new ApiError(400, 'You must have an open POS session to complete a sale');
  }

  const maxDiscountPercent = req.user.has_global_location_access ? 100 : Number(req.user.role?.max_discount_percent ?? 0);

  const result = await sequelize.transaction(async (t) => {
    const products = await db.Product.findAll({
      where: { id: items.map((i) => i.productId) }, transaction: t,
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0, discountTotal = 0, taxTotal = 0, costTotal = 0;
    const lineData = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) throw new ApiError(404, `Product ${item.productId} not found`);
      if (product.status !== 'active') throw new ApiError(400, `${product.name} is not available for sale`);

      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) throw new ApiError(400, `Invalid quantity for ${product.name}`);

      const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : Number(product.selling_price);
      const lineGross = round2(unitPrice * quantity);

      let discountAmount = item.discountPercent
        ? round2(lineGross * Number(item.discountPercent) / 100)
        : round2(Number(item.discountAmount) || 0);
      discountAmount = Math.min(discountAmount, lineGross);

      const effectivePercent = lineGross > 0 ? (discountAmount / lineGross) * 100 : 0;
      if (effectivePercent > maxDiscountPercent + 0.001 && !req.userPermissions.has('APPLY_DISCOUNT')) {
        throw new ApiError(403, 'You are not authorized to apply discounts');
      }
      if (effectivePercent > maxDiscountPercent + 0.001) {
        throw new ApiError(403, `Discount of ${effectivePercent.toFixed(1)}% exceeds your authorized limit of ${maxDiscountPercent}%`);
      }

      const taxable = lineGross - discountAmount;
      const taxAmount = round2(taxable * Number(product.tax_rate) / 100);
      const lineTotal = round2(taxable + taxAmount);
      const lineCost = round2(Number(product.purchase_price) * quantity);

      subtotal += lineGross;
      discountTotal += discountAmount;
      taxTotal += taxAmount;
      costTotal += lineCost;

      lineData.push({ product, quantity, unitPrice, discountAmount, taxAmount, lineTotal, lineCost });
    }

    const total = round2(subtotal - discountTotal + taxTotal);
    const amountReceived = round2(payments.reduce((sum, p) => sum + Number(p.amount), 0));
    if (amountReceived < total - 0.01) {
      throw new ApiError(400, `Payment amount (${amountReceived}) is insufficient for the sale total (${total})`);
    }
    const changeDue = round2(amountReceived - total);

    const saleNumber = await GENERATORS.sale(t);
    const receiptNumber = await GENERATORS.receipt(t);

    const sale = await db.Sale.create({
      sale_number: saleNumber, receipt_number: receiptNumber, location_id: locationId,
      terminal_id: terminalId || null, cashier_id: req.user.id, cashier_session_id: session.id,
      customer_id: customerId || null, subtotal: round2(subtotal), discount_total: round2(discountTotal),
      tax_total: round2(taxTotal), total, cost_total: round2(costTotal),
      amount_received: amountReceived, change_due: changeDue, status: 'completed',
    }, { transaction: t });

    for (const line of lineData) {
      await db.SaleItem.create({
        sale_id: sale.id, product_id: line.product.id, quantity: line.quantity,
        unit_price: line.unitPrice, unit_cost: line.product.purchase_price,
        discount: line.discountAmount, tax: line.taxAmount, total: line.lineTotal,
      }, { transaction: t });

      // Inventory validation + deduction happens here, inside the same transaction as the
      // sale record - if stock is insufficient this throws and the whole sale rolls back
      // (SRS section 19-20).
      const allowOverride = item_allowOverride(items, line.product.id) && req.userPermissions.has('OVERRIDE_STOCK_CHECK');
      const movement = await inventoryEngine.applyMovement({
        productId: line.product.id, locationId, quantity: -line.quantity, type: 'sale',
        referenceType: 'sale', referenceId: sale.id, referenceNumber: saleNumber,
        userId: req.user.id, allowNegative: allowOverride,
      }, t);

      if (allowOverride && movement.ledgerEntry.new_balance < 0) {
        await logAudit({ userId: req.user.id, action: 'STOCK_OVERRIDE', entityType: 'sale', entityId: sale.id, newValue: { productId: line.product.id } }, t);
      }

      const location = await db.Location.findByPk(locationId, { transaction: t });
      await checkStockThresholds(line.product, location, movement.ledgerEntry.new_balance, t);
    }

    for (const payment of payments) {
      await db.Payment.create({ sale_id: sale.id, method: payment.method, amount: payment.amount, reference: payment.reference || null }, { transaction: t });
    }

    if (discountTotal > 0 && (discountTotal / (subtotal || 1)) * 100 >= 20) {
      await notify({ type: 'large_discount', message: `Large discount of ${discountTotal.toFixed(2)} applied on sale ${saleNumber}.`, referenceType: 'sale', referenceId: sale.id }, t);
    }

    await logAudit({ userId: req.user.id, action: 'CREATE_SALE', entityType: 'sale', entityId: sale.id, newValue: { saleNumber, total } }, t);
    return sale;
  });

  const created = await db.Sale.findByPk(result.id, { include });

  // Fire-and-forget: emailing the receipt must never slow down or fail the checkout itself.
  if (created.customer?.email) {
    emailService.sendReceiptEmail(created)
      .catch((err) => console.error(`[email] receipt email for sale ${created.sale_number} failed:`, err.message)); // eslint-disable-line no-console
  }

  res.status(201).json({ sale: created });
});

function item_allowOverride(items, productId) {
  const match = items.find((i) => i.productId === productId);
  return !!(match && match.overrideStock);
}

// Void / Reverse Sale (SRS section 48): the original sale is never deleted, its inventory
// impact is reversed, and the reversal itself is authorized and audited.
const voidSale = catchAsync(async (req, res) => {
  const { reason } = req.body;
  if (!reason) throw new ApiError(400, 'A reason is required to void a sale');

  await sequelize.transaction(async (t) => {
    // Postgres rejects FOR UPDATE combined with an outer-join include, so lock the parent row
    // alone and fetch its items separately.
    const sale = await db.Sale.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!sale) throw new ApiError(404, 'Sale not found');
    if (sale.status !== 'completed') throw new ApiError(400, 'Only completed sales can be voided');
    sale.items = await db.SaleItem.findAll({ where: { sale_id: sale.id }, transaction: t });

    for (const item of sale.items) {
      await inventoryEngine.applyMovement({
        productId: item.product_id, locationId: sale.location_id, quantity: item.quantity, type: 'sale_void',
        referenceType: 'sale', referenceId: sale.id, referenceNumber: sale.sale_number,
        userId: req.user.id, reason: `Void: ${reason}`,
      }, t);
    }

    sale.status = 'voided';
    sale.voided_by = req.user.id;
    sale.voided_at = new Date();
    sale.void_reason = reason;
    await sale.save({ transaction: t });

    await notify({ type: 'voided_transaction', message: `Sale ${sale.sale_number} was voided: ${reason}`, referenceType: 'sale', referenceId: sale.id }, t);
    await logAudit({ userId: req.user.id, action: 'VOID_SALE', entityType: 'sale', entityId: sale.id, newValue: { reason } }, t);
  });

  const updated = await db.Sale.findByPk(req.params.id, { include });
  res.json({ sale: updated });
});

module.exports = { list, get, create, voidSale };
