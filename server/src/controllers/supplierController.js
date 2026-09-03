const db = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const list = catchAsync(async (req, res) => {
  const where = {};
  if (req.query.q) where.name = { [Op.iLike]: `%${req.query.q}%` };
  if (req.query.status) where.status = req.query.status;
  const suppliers = await db.Supplier.findAll({ where, order: [['name', 'ASC']] });
  res.json({ suppliers });
});

const get = catchAsync(async (req, res) => {
  const supplier = await db.Supplier.findByPk(req.params.id, {
    include: [{ model: db.PurchaseOrder, as: 'purchaseOrders', order: [['created_at', 'DESC']], limit: 20 }],
  });
  if (!supplier) throw new ApiError(404, 'Supplier not found');
  res.json({ supplier });
});

const create = catchAsync(async (req, res) => {
  const { name, contactPerson, phone, email, address, taxInfo, paymentTerms, notes } = req.body;
  if (!name) throw new ApiError(400, 'name is required');
  const supplier = await db.Supplier.create({
    name, contact_person: contactPerson, phone, email, address, tax_info: taxInfo, payment_terms: paymentTerms, notes,
  });
  res.status(201).json({ supplier });
});

const update = catchAsync(async (req, res) => {
  const supplier = await db.Supplier.findByPk(req.params.id);
  if (!supplier) throw new ApiError(404, 'Supplier not found');
  const map = {
    name: 'name', contactPerson: 'contact_person', phone: 'phone', email: 'email', address: 'address',
    taxInfo: 'tax_info', paymentTerms: 'payment_terms', notes: 'notes', status: 'status',
  };
  for (const [key, column] of Object.entries(map)) {
    if (req.body[key] !== undefined) supplier[column] = req.body[key];
  }
  await supplier.save();
  res.json({ supplier });
});

module.exports = { list, get, create, update };
