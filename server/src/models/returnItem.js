module.exports = (sequelize, DataTypes) => {
  const ReturnItem = sequelize.define('ReturnItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    return_id: { type: DataTypes.INTEGER, allowNull: false },
    sale_item_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    condition: { type: DataTypes.ENUM('resalable', 'damaged'), allowNull: false, defaultValue: 'resalable' },
    refund_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  }, { tableName: 'return_items', timestamps: false });
  return ReturnItem;
};
