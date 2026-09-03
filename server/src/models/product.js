module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sku: { type: DataTypes.STRING, allowNull: false, unique: true },
    barcode: { type: DataTypes.STRING, allowNull: true, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    category_id: { type: DataTypes.INTEGER, allowNull: true },
    subcategory_id: { type: DataTypes.INTEGER, allowNull: true },
    brand_id: { type: DataTypes.INTEGER, allowNull: true },
    unit_id: { type: DataTypes.INTEGER, allowNull: true },
    supplier_id: { type: DataTypes.INTEGER, allowNull: true },
    purchase_price: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    selling_price: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    wholesale_price: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    min_selling_price: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    tax_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    reorder_level: { type: DataTypes.INTEGER, defaultValue: 0 },
    min_stock_level: { type: DataTypes.INTEGER, defaultValue: 0 },
    max_stock_level: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.ENUM('active', 'inactive', 'discontinued'), defaultValue: 'active' },
    image_url: { type: DataTypes.STRING, allowNull: true },
    track_expiry: { type: DataTypes.BOOLEAN, defaultValue: false },
    track_batch: { type: DataTypes.BOOLEAN, defaultValue: false },
    allow_backorder: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, {
    tableName: 'products',
    indexes: [{ fields: ['name'] }],
  });
  return Product;
};
