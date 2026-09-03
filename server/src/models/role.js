module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.STRING },
    max_discount_percent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    is_system: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, { tableName: 'roles' });
  return Role;
};
