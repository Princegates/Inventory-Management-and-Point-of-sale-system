const db = require('../models');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const list = catchAsync(async (req, res) => {
  const categories = await db.Category.findAll({
    include: [{ model: db.Category, as: 'subcategories' }],
    where: { parent_id: null },
    order: [['name', 'ASC']],
  });
  res.json({ categories });
});

const create = catchAsync(async (req, res) => {
  const { name, parentId } = req.body;
  if (!name) throw new ApiError(400, 'name is required');
  const category = await db.Category.create({ name, parent_id: parentId || null });
  res.status(201).json({ category });
});

const update = catchAsync(async (req, res) => {
  const category = await db.Category.findByPk(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');
  const { name, parentId } = req.body;
  if (name !== undefined) category.name = name;
  if (parentId !== undefined) category.parent_id = parentId;
  await category.save();
  res.json({ category });
});

const remove = catchAsync(async (req, res) => {
  const category = await db.Category.findByPk(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');
  const inUse = await db.Product.count({ where: { category_id: category.id } });
  if (inUse > 0) throw new ApiError(409, 'Cannot delete a category that is in use by products');
  await category.destroy();
  res.json({ success: true });
});

module.exports = { list, create, update, remove };
