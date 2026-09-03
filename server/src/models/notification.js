module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true }, // null = broadcast to all users with VIEW_INVENTORY etc.
    type: {
      type: DataTypes.ENUM(
        'low_stock', 'out_of_stock', 'expiring_soon', 'expired', 'pending_transfer', 'transfer_received',
        'purchase_order_approval', 'stock_discrepancy', 'large_discount', 'voided_transaction', 'large_refund'
      ),
      allowNull: false,
    },
    message: { type: DataTypes.STRING, allowNull: false },
    reference_type: { type: DataTypes.STRING, allowNull: true },
    reference_id: { type: DataTypes.INTEGER, allowNull: true },
    is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, { tableName: 'notifications', updatedAt: false });
  return Notification;
};
