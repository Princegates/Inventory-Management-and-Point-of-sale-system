module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sale_id: { type: DataTypes.INTEGER, allowNull: false },
    method: { type: DataTypes.ENUM('cash', 'mobile_money', 'card', 'bank_transfer', 'other'), allowNull: false },
    amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    reference: { type: DataTypes.STRING, allowNull: true },
  }, { tableName: 'payments', updatedAt: false });
  return Payment;
};
