module.exports = (sequelize, DataTypes) => {
  const PriceHistory = sequelize.define('PriceHistory', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    price_type: { type: DataTypes.ENUM('purchase_price', 'selling_price', 'wholesale_price'), allowNull: false },
    old_price: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    new_price: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    changed_by: { type: DataTypes.INTEGER, allowNull: false },
    reason: { type: DataTypes.STRING, allowNull: true },
  }, { tableName: 'price_history', updatedAt: false });
  return PriceHistory;
};
