// Immutable ledger row - every stock movement in the system creates exactly one of these
// (SRS section 9: "Every inventory movement shall create an inventory transaction").
module.exports = (sequelize, DataTypes) => {
  const InventoryTransaction = sequelize.define('InventoryTransaction', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    location_id: { type: DataTypes.INTEGER, allowNull: false },
    type: {
      type: DataTypes.ENUM(
        'purchase_receipt', 'sale', 'sale_void', 'customer_return', 'supplier_return',
        'transfer_out', 'transfer_in', 'transfer_cancelled',
        'adjustment_increase', 'adjustment_decrease',
        'damaged', 'expired', 'stock_count_adjustment', 'opening_balance', 'other'
      ),
      allowNull: false,
    },
    quantity: { type: DataTypes.INTEGER, allowNull: false }, // signed delta applied to `quantity`
    previous_balance: { type: DataTypes.INTEGER, allowNull: false },
    new_balance: { type: DataTypes.INTEGER, allowNull: false },
    reference_type: { type: DataTypes.STRING, allowNull: true }, // e.g. 'sale', 'purchase_order', 'stock_transfer'
    reference_id: { type: DataTypes.INTEGER, allowNull: true },
    reference_number: { type: DataTypes.STRING, allowNull: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    reason: { type: DataTypes.STRING, allowNull: true },
  }, {
    tableName: 'inventory_transactions',
    updatedAt: false,
    indexes: [
      { fields: ['product_id', 'location_id'] },
      { fields: ['reference_type', 'reference_id'] },
    ],
  });
  return InventoryTransaction;
};
