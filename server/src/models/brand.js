module.exports = (sequelize, DataTypes) => {
  const Brand = sequelize.define('Brand', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
  }, { tableName: 'brands' });
  return Brand;
};
