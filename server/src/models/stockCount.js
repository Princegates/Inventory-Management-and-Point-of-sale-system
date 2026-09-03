module.exports = (sequelize, DataTypes) => {
  const StockCount = sequelize.define('StockCount', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    count_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    location_id: { type: DataTypes.INTEGER, allowNull: false },
    counted_by: { type: DataTypes.INTEGER, allowNull: false },
    approved_by: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.ENUM('draft', 'submitted', 'approved', 'cancelled'), defaultValue: 'draft' },
    notes: { type: DataTypes.TEXT },
  }, { tableName: 'stock_counts' });
  return StockCount;
};
