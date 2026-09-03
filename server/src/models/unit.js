module.exports = (sequelize, DataTypes) => {
  const Unit = sequelize.define('Unit', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    abbreviation: { type: DataTypes.STRING, allowNull: false },
  }, { tableName: 'units', timestamps: false });
  return Unit;
};
