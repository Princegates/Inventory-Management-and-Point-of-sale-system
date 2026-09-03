require('dotenv').config();
const { Sequelize } = require('sequelize');

// Hosted Postgres providers (Supabase, Render, Railway, ...) issue a single connection string
// and require SSL; local/dev Postgres typically does neither. DATABASE_URL takes priority when
// present so the same codebase works unmodified against either.
const useSsl = process.env.DB_SSL === 'true' || !!process.env.DATABASE_URL;

const commonOptions = {
  dialect: 'postgres',
  logging: false,
  define: { underscored: true },
  dialectOptions: useSsl
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
};

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, commonOptions)
  : new Sequelize(
      process.env.DB_NAME || 'ims_pos',
      process.env.DB_USER || 'ims_pos',
      process.env.DB_PASSWORD || 'ims_pos',
      {
        ...commonOptions,
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
      }
    );

module.exports = sequelize;
