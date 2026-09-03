const { Op } = require('sequelize');
const db = require('../models');
const sequelize = require('../config/database');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { logAudit } = require('../services/auditLogger');

const include = [
  { model: db.Category, as: 'category' },
  { model: db.Category, as: 'subcategory' },
  { model: db.Brand, as: 'brand' },
  { model: db.Unit, as: 'unit' },
  { model: db.Supplier, as: 'supplier' },
];

// General management list: filterable, paginated, includes catalog metadata (no stock join -
// use GET /inventory for stock-by-location views).
const list = catchAsync(async (req, res) => {
  const { q, categoryId, status, page = 1, pageSize = 25 } = req.query;
  const where = {};
  if (q) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${q}%` } },
      { sku: { [Op.iLike]: `%${q}%` } },
      { barcode: { [Op.iLike]: `%${q}%` } },
    ];
  }
  if (categoryId) where.category_id = categoryId;
  if (status) where.status = status;

  const limit = Math.min(Number(pageSize) || 25, 200);
  const offset = (Number(page) - 1) * limit;

  const { rows, count } = await db.Product.findAndCountAll({
    where, include, limit, offset, order: [['name', 'ASC']], distinct: true,
  });
  res.json({ products: rows, total: count, page: Number(page), pageSize: limit });
});

const get = catchAsync(async (req, res) => {
  const product = await db.Product.findByPk(req.params.id, {
    include: [...include, { model: db.Inventory, as: 'inventory', include: [{ model: db.Location, as: 'location' }] }],
  });
  if (!product) throw new ApiError(404, 'Product not found');
  res.json({ product });
});

// Barcode scan / SKU entry lookup used by the POS (SRS section 7-8).
const lookup = catchAsync(async (req, res) => {
  const { code } = req.params;
  const product = await db.Product.findOne({
    where: {
      status: 'active',
      [Op.or]: [{ barcode: code }, { sku: code }],
    },
    include,
  });
  if (!product) throw new ApiError(404, 'Product not found for this barcode/SKU');
  res.json({ product });
});

// POS product search - active products only (SRS section 6.3: "Inactive products should not
// appear in normal POS searches"), optionally scoped to a location for stock display.
const posSearch = catchAsync(async (req, res) => {
  const { q, locationId } = req.query;
  const where = { status: 'active' };
  if (q) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${q}%` } },
      { sku: { [Op.iLike]: `%${q}%` } },
      { barcode: { [Op.iLike]: `%${q}%` } },
    ];
  }
  const inventoryInclude = { model: db.Inventory, as: 'inventory' };
  if (locationId) inventoryInclude.where = { location_id: locationId };
  inventoryInclude.required = false;

  const products = await db.Product.findAll({
    where, include: [{ model: db.Category, as: 'category' }, inventoryInclude],
    order: [['name', 'ASC']], limit: 50,
  });
  res.json({ products });
});

const create = catchAsync(async (req, res) => {
  const body = req.body;
  if (!body.sku || !body.name) throw new ApiError(400, 'sku and name are required');

  const product = await db.Product.create({
    sku: body.sku, barcode: body.barcode || null, name: body.name, description: body.description,
    category_id: body.categoryId || null, subcategory_id: body.subcategoryId || null,
    brand_id: body.brandId || null, unit_id: body.unitId || null, supplier_id: body.supplierId || null,
    purchase_price: body.purchasePrice || 0, selling_price: body.sellingPrice || 0,
    wholesale_price: body.wholesalePrice || null, min_selling_price: body.minSellingPrice || null,
    tax_rate: body.taxRate || 0, reorder_level: body.reorderLevel || 0,
    min_stock_level: body.minStockLevel || 0, max_stock_level: body.maxStockLevel || null,
    image_url: body.imageUrl || null, track_expiry: !!body.trackExpiry, track_batch: !!body.trackBatch,
    allow_backorder: !!body.allowBackorder,
  });

  await logAudit({ userId: req.user.id, action: 'CREATE_PRODUCT', entityType: 'product', entityId: product.id, newValue: body });
  const created = await db.Product.findByPk(product.id, { include });
  res.status(201).json({ product: created });
});

const FIELD_MAP = {
  name: 'name', description: 'description', barcode: 'barcode',
  categoryId: 'category_id', subcategoryId: 'subcategory_id', brandId: 'brand_id',
  unitId: 'unit_id', supplierId: 'supplier_id',
  taxRate: 'tax_rate', reorderLevel: 'reorder_level', minStockLevel: 'min_stock_level',
  maxStockLevel: 'max_stock_level', status: 'status', imageUrl: 'image_url',
  trackExpiry: 'track_expiry', trackBatch: 'track_batch', allowBackorder: 'allow_backorder',
};

const PRICE_FIELDS = {
  purchasePrice: { column: 'purchase_price', type: 'purchase_price' },
  sellingPrice: { column: 'selling_price', type: 'selling_price' },
  wholesalePrice: { column: 'wholesale_price', type: 'wholesale_price' },
};

// Price changes must be tracked (SRS section 29 / Rule 12) - every update to a price column
// writes a price_history row alongside the product update, inside one transaction.
const update = catchAsync(async (req, res) => {
  const body = req.body;
  await sequelize.transaction(async (t) => {
    const product = await db.Product.findByPk(req.params.id, { transaction: t });
    if (!product) throw new ApiError(404, 'Product not found');
    const before = product.toJSON();

    for (const [key, column] of Object.entries(FIELD_MAP)) {
      if (body[key] !== undefined) product[column] = body[key];
    }

    for (const [key, meta] of Object.entries(PRICE_FIELDS)) {
      if (body[key] !== undefined && Number(body[key]) !== Number(product[meta.column])) {
        await db.PriceHistory.create({
          product_id: product.id, price_type: meta.type,
          old_price: product[meta.column], new_price: body[key],
          changed_by: req.user.id, reason: body.priceChangeReason || null,
        }, { transaction: t });
        product[meta.column] = body[key];
      }
    }
    if (body.minSellingPrice !== undefined) product.min_selling_price = body.minSellingPrice;

    await product.save({ transaction: t });
    await logAudit({ userId: req.user.id, action: 'UPDATE_PRODUCT', entityType: 'product', entityId: product.id, previousValue: before, newValue: body }, t);
  });

  const updated = await db.Product.findByPk(req.params.id, { include });
  res.json({ product: updated });
});

const priceHistory = catchAsync(async (req, res) => {
  const history = await db.PriceHistory.findAll({
    where: { product_id: req.params.id },
    include: [{ model: db.User, as: 'changedByUser', attributes: ['id', 'name'] }],
    order: [['created_at', 'DESC']],
  });
  res.json({ priceHistory: history });
});

module.exports = { list, get, lookup, posSearch, create, update, priceHistory };
