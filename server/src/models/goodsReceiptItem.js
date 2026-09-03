module.exports = (sequelize, DataTypes) => {
  const GoodsReceiptItem = sequelize.define('GoodsReceiptItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    goods_receipt_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    ordered_quantity: { type: DataTypes.INTEGER, allowNull: true },
    received_quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, // good, accepted units
    damaged_quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    missing_quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    unit_cost: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    batch_number: { type: DataTypes.STRING, allowNull: true },
    expiry_date: { type: DataTypes.DATEONLY, allowNull: true },
  }, { tableName: 'goods_receipt_items', timestamps: false });
  return GoodsReceiptItem;
};
