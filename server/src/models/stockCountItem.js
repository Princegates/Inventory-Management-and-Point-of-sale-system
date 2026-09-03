module.exports = (sequelize, DataTypes) => {
  const StockCountItem = sequelize.define('StockCountItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    stock_count_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    system_quantity: { type: DataTypes.INTEGER, allowNull: false },
    physical_quantity: { type: DataTypes.INTEGER, allowNull: true },
    difference: { type: DataTypes.INTEGER, allowNull: true },
    reason: { type: DataTypes.STRING, allowNull: true },
  }, { tableName: 'stock_count_items', timestamps: false });
  return StockCountItem;
};
