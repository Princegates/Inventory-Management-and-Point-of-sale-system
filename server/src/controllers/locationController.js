const db = require('../models');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { logAudit } = require('../services/auditLogger');

const list = catchAsync(async (req, res) => {
  const where = {};
  if (req.query.type) where.type = req.query.type;
  const locations = await db.Location.findAll({ where, order: [['name', 'ASC']] });
  res.json({ locations });
});

const get = catchAsync(async (req, res) => {
  const location = await db.Location.findByPk(req.params.id);
  if (!location) throw new ApiError(404, 'Location not found');
  res.json({ location });
});

const create = catchAsync(async (req, res) => {
  const { name, code, type, address, phone } = req.body;
  if (!name || !code || !type) throw new ApiError(400, 'name, code and type are required');
  const location = await db.Location.create({ name, code, type, address, phone });
  await logAudit({ userId: req.user.id, action: 'CREATE_LOCATION', entityType: 'location', entityId: location.id, newValue: req.body });
  res.status(201).json({ location });
});

const update = catchAsync(async (req, res) => {
  const location = await db.Location.findByPk(req.params.id);
  if (!location) throw new ApiError(404, 'Location not found');
  const before = location.toJSON();
  const { name, address, phone, status } = req.body;
  if (name !== undefined) location.name = name;
  if (address !== undefined) location.address = address;
  if (phone !== undefined) location.phone = phone;
  if (status !== undefined) location.status = status;
  await location.save();
  await logAudit({ userId: req.user.id, action: 'UPDATE_LOCATION', entityType: 'location', entityId: location.id, previousValue: before, newValue: req.body });
  res.json({ location });
});

module.exports = { list, get, create, update };
