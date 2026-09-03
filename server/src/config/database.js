require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'ims_pos',
  process.env.DB_USER || 'ims_pos',
  process.env.DB_PASSWORD || 'ims_pos',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    define: {
      underscored: true,
    },
  }
);

module.exports = sequelize;
