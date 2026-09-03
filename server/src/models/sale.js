module.exports = (sequelize, DataTypes) => {
  const Sale = sequelize.define('Sale', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sale_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    receipt_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    location_id: { type: DataTypes.INTEGER, allowNull: false },
    terminal_id: { type: DataTypes.STRING, allowNull: true },
    cashier_id: { type: DataTypes.INTEGER, allowNull: false },
    cashier_session_id: { type: DataTypes.INTEGER, allowNull: true },
    customer_id: { type: DataTypes.INTEGER, allowNull: true },
    subtotal: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    discount_total: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    tax_total: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    total: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    cost_total: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    amount_received: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    change_due: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.ENUM('completed', 'voided'), defaultValue: 'completed' },
    voided_by: { type: DataTypes.INTEGER, allowNull: true },
    voided_at: { type: DataTypes.DATE, allowNull: true },
    void_reason: { type: DataTypes.STRING, allowNull: true },
  }, { tableName: 'sales' });
  return Sale;
};
