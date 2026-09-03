module.exports = (sequelize, DataTypes) => {
  const SaleItem = sequelize.define('SaleItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sale_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    quantity_returned: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    unit_price: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    unit_cost: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    discount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    tax: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    total: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  }, { tableName: 'sale_items', timestamps: false });
  return SaleItem;
};
