module.exports = (sequelize, DataTypes) => {
  const CashierSession = sequelize.define('CashierSession', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    session_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    cashier_id: { type: DataTypes.INTEGER, allowNull: false },
    location_id: { type: DataTypes.INTEGER, allowNull: false },
    terminal_id: { type: DataTypes.STRING, allowNull: true },
    opening_balance: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    expected_cash: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    actual_cash: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    variance: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    status: { type: DataTypes.ENUM('open', 'closed'), defaultValue: 'open' },
    opened_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    closed_at: { type: DataTypes.DATE, allowNull: true },
    notes: { type: DataTypes.STRING },
  }, { tableName: 'cashier_sessions', updatedAt: false });
  return CashierSession;
};
