module.exports = (sequelize, DataTypes) => {
  const Inventory = sequelize.define('Inventory', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    location_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    quantity_in_transit: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    quantity_damaged: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  }, {
    tableName: 'inventory',
    indexes: [{ unique: true, fields: ['product_id', 'location_id'] }],
  });
  return Inventory;
};
