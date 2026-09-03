const db = require('../models');
const sequelize = require('../config/database');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { GENERATORS } = require('../services/numberGenerator');
const { logAudit } = require('../services/auditLogger');
const { assertLocationAccess } = require('../middleware/locationAccess');

const include = [
  { model: db.User, as: 'cashier', attributes: ['id', 'name'] },
  { model: db.Location, as: 'location' },
];

const list = catchAsync(async (req, res) => {
  const where = {};
  if (req.query.locationId) where.location_id = req.query.locationId;
  if (req.query.cashierId) where.cashier_id = req.query.cashierId;
  if (req.query.status) where.status = req.query.status;
  const sessions = await db.CashierSession.findAll({ where, include, order: [['opened_at', 'DESC']] });
  res.json({ cashierSessions: sessions });
});

// The cashier's own currently-open session, if any - the POS uses this on load to decide
// whether to show "open session" or the sales screen (SRS section 23).
const current = catchAsync(async (req, res) => {
  const session = await db.CashierSession.findOne({
    where: { cashier_id: req.user.id, status: 'open' }, include,
  });
  res.json({ cashierSession: session });
});

const open = catchAsync(async (req, res) => {
  const { locationId, terminalId, openingBalance = 0 } = req.body;
  if (!locationId) throw new ApiError(400, 'locationId is required');
  assertLocationAccess(req, locationId);

  const existing = await db.CashierSession.findOne({ where: { cashier_id: req.user.id, status: 'open' } });
  if (existing) throw new ApiError(409, 'You already have an open POS session. Close it before opening a new one.');

  const session = await sequelize.transaction(async (t) => {
    const sessionNumber = await GENERATORS.cashierSession(t);
    const record = await db.CashierSession.create({
      session_number: sessionNumber, cashier_id: req.user.id, location_id: locationId,
      terminal_id: terminalId || null, opening_balance: openingBalance,
    }, { transaction: t });
    await logAudit({ userId: req.user.id, action: 'OPEN_CASHIER_SESSION', entityType: 'cashier_session', entityId: record.id, newValue: req.body }, t);
    return record;
  });

  const created = await db.CashierSession.findByPk(session.id, { include });
  res.status(201).json({ cashierSession: created });
});

// Closing computes expected cash from completed sales/refunds recorded in the session and
// records the variance against what the cashier actually counted (SRS section 23).
const close = catchAsync(async (req, res) => {
  const { actualCash, notes } = req.body;
  if (actualCash === undefined) throw new ApiError(400, 'actualCash is required');

  const updated = await sequelize.transaction(async (t) => {
    const session = await db.CashierSession.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!session) throw new ApiError(404, 'Cashier session not found');
    if (session.cashier_id !== req.user.id && !req.userPermissions.has('MANAGE_USERS')) {
      throw new ApiError(403, 'You can only close your own POS session');
    }
    if (session.status !== 'open') throw new ApiError(400, 'This session is already closed');

    const cashSales = await db.Payment.sum('amount', {
      where: { method: 'cash' },
      include: [{ model: db.Sale, as: 'sale', where: { cashier_session_id: session.id, status: 'completed' }, attributes: [] }],
      transaction: t,
    }) || 0;

    const cashRefunds = await db.Return.sum('refund_total', {
      where: { status: 'completed' },
      include: [{ model: db.Sale, as: 'sale', where: { cashier_session_id: session.id }, attributes: [] }],
      transaction: t,
    }) || 0;

    const expectedCash = Number(session.opening_balance) + Number(cashSales) - Number(cashRefunds);
    const variance = Number(actualCash) - expectedCash;

    session.expected_cash = expectedCash;
    session.actual_cash = actualCash;
    session.variance = variance;
    session.status = 'closed';
    session.closed_at = new Date();
    session.notes = notes || session.notes;
    await session.save({ transaction: t });

    await logAudit({ userId: req.user.id, action: 'CLOSE_CASHIER_SESSION', entityType: 'cashier_session', entityId: session.id, newValue: { expectedCash, actualCash, variance } }, t);
    return session;
  });

  const result = await db.CashierSession.findByPk(updated.id, { include });
  res.json({ cashierSession: result });
});

module.exports = { list, current, open, close };
