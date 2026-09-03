module.exports = (sequelize, DataTypes) => {
  const StockTransfer = sequelize.define('StockTransfer', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    transfer_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    source_location_id: { type: DataTypes.INTEGER, allowNull: false },
    destination_location_id: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.ENUM('requested', 'approved', 'issued', 'in_transit', 'received', 'completed', 'cancelled'),
      defaultValue: 'requested',
    },
    requested_by: { type: DataTypes.INTEGER, allowNull: false },
    approved_by: { type: DataTypes.INTEGER, allowNull: true },
    issued_by: { type: DataTypes.INTEGER, allowNull: true },
    received_by: { type: DataTypes.INTEGER, allowNull: true },
    issued_at: { type: DataTypes.DATE, allowNull: true },
    received_at: { type: DataTypes.DATE, allowNull: true },
    notes: { type: DataTypes.TEXT },
  }, { tableName: 'stock_transfers' });
  return StockTransfer;
};
