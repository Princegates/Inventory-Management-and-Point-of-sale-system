module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    action: { type: DataTypes.STRING, allowNull: false },
    entity_type: { type: DataTypes.STRING, allowNull: true },
    entity_id: { type: DataTypes.INTEGER, allowNull: true },
    previous_value: { type: DataTypes.JSONB, allowNull: true },
    new_value: { type: DataTypes.JSONB, allowNull: true },
    reference_transaction: { type: DataTypes.STRING, allowNull: true },
    ip_address: { type: DataTypes.STRING, allowNull: true },
  }, { tableName: 'audit_logs', updatedAt: false });
  return AuditLog;
};
