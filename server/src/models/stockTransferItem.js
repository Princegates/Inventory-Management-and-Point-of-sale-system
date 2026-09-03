module.exports = (sequelize, DataTypes) => {
  const StockTransferItem = sequelize.define('StockTransferItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    stock_transfer_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: 'stock_transfer_items', timestamps: false });
  return StockTransferItem;
};
