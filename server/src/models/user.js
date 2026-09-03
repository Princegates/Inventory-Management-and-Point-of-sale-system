module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    role_id: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.ENUM('active', 'disabled'), defaultValue: 'active' },
    has_global_location_access: { type: DataTypes.BOOLEAN, defaultValue: false },
    reset_token: { type: DataTypes.STRING, allowNull: true },
    reset_token_expires: { type: DataTypes.DATE, allowNull: true },
    last_login_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'users',
    defaultScope: {
      attributes: { exclude: ['password_hash', 'reset_token', 'reset_token_expires'] },
    },
    scopes: {
      withPassword: { attributes: {} },
    },
  });
  return User;
};
