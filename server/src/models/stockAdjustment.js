module.exports = (sequelize, DataTypes) => {
  const StockAdjustment = sequelize.define('StockAdjustment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    adjustment_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    location_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false }, // positive = increase, negative = decrease
    reason: {
      type: DataTypes.ENUM('damaged', 'theft_loss', 'counting_error', 'expired', 'data_correction', 'opening_balance', 'other'),
      allowNull: false,
    },
    notes: { type: DataTypes.STRING },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: 'stock_adjustments', updatedAt: false });
  return StockAdjustment;
};
