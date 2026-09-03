const db = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const list = catchAsync(async (req, res) => {
  const where = {};
  if (req.query.q) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${req.query.q}%` } },
      { phone: { [Op.iLike]: `%${req.query.q}%` } },
    ];
  }
  const customers = await db.Customer.findAll({ where, order: [['name', 'ASC']], limit: 100 });
  res.json({ customers });
});

const get = catchAsync(async (req, res) => {
  const customer = await db.Customer.findByPk(req.params.id, {
    include: [{ model: db.Sale, as: 'sales', order: [['created_at', 'DESC']], limit: 20 }],
  });
  if (!customer) throw new ApiError(404, 'Customer not found');
  res.json({ customer });
});

const create = catchAsync(async (req, res) => {
  const { name, phone, email, address } = req.body;
  if (!name) throw new ApiError(400, 'name is required');
  const customer = await db.Customer.create({ name, phone, email, address });
  res.status(201).json({ customer });
});

const update = catchAsync(async (req, res) => {
  const customer = await db.Customer.findByPk(req.params.id);
  if (!customer) throw new ApiError(404, 'Customer not found');
  const { name, phone, email, address } = req.body;
  if (name !== undefined) customer.name = name;
  if (phone !== undefined) customer.phone = phone;
  if (email !== undefined) customer.email = email;
  if (address !== undefined) customer.address = address;
  await customer.save();
  res.json({ customer });
});

module.exports = { list, get, create, update };
