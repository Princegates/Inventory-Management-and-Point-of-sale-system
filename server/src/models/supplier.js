module.exports = (sequelize, DataTypes) => {
  const Supplier = sequelize.define('Supplier', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    contact_person: { type: DataTypes.STRING },
    phone: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    address: { type: DataTypes.STRING },
    tax_info: { type: DataTypes.STRING },
    payment_terms: { type: DataTypes.STRING },
    status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
    notes: { type: DataTypes.TEXT },
  }, { tableName: 'suppliers' });
  return Supplier;
};
