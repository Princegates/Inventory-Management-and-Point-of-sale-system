module.exports = (sequelize, DataTypes) => {
  const Return = sequelize.define('Return', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    return_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    sale_id: { type: DataTypes.INTEGER, allowNull: false },
    processed_by: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.ENUM('completed', 'cancelled'), defaultValue: 'completed' },
    refund_total: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    reason: { type: DataTypes.STRING, allowNull: true },
  }, { tableName: 'returns' });
  return Return;
};
