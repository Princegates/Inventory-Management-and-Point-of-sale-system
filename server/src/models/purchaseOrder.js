module.exports = (sequelize, DataTypes) => {
  const PurchaseOrder = sequelize.define('PurchaseOrder', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    po_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    supplier_id: { type: DataTypes.INTEGER, allowNull: false },
    location_id: { type: DataTypes.INTEGER, allowNull: false }, // receiving warehouse
    order_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
    expected_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: {
      type: DataTypes.ENUM('draft', 'submitted', 'approved', 'partially_received', 'fully_received', 'cancelled', 'closed'),
      defaultValue: 'draft',
    },
    notes: { type: DataTypes.TEXT },
    created_by: { type: DataTypes.INTEGER, allowNull: false },
    approved_by: { type: DataTypes.INTEGER, allowNull: true },
    total_cost: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  }, { tableName: 'purchase_orders' });
  return PurchaseOrder;
};
