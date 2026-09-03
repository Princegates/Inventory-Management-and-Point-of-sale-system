module.exports = (sequelize, DataTypes) => {
  const PurchaseOrderItem = sequelize.define('PurchaseOrderItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    purchase_order_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    quantity_received: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    unit_cost: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    total_cost: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  }, { tableName: 'purchase_order_items', timestamps: false });
  return PurchaseOrderItem;
};
