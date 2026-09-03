module.exports = (sequelize, DataTypes) => {
  const GoodsReceipt = sequelize.define('GoodsReceipt', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    receipt_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    purchase_order_id: { type: DataTypes.INTEGER, allowNull: true },
    location_id: { type: DataTypes.INTEGER, allowNull: false },
    received_by: { type: DataTypes.INTEGER, allowNull: false },
    received_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    notes: { type: DataTypes.TEXT },
  }, { tableName: 'goods_receipts', updatedAt: false });
  return GoodsReceipt;
};
