module.exports = (sequelize, DataTypes) => {
  const Location = sequelize.define('Location', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false, unique: true },
    type: { type: DataTypes.ENUM('warehouse', 'shop', 'branch', 'distribution_centre'), allowNull: false },
    address: { type: DataTypes.STRING },
    phone: { type: DataTypes.STRING },
    status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
  }, { tableName: 'locations' });
  return Location;
};
