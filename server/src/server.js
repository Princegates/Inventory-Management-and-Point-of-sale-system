const app = require('./app');
const sequelize = require('./config/database');

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.sync(); // creates any missing tables/columns; use proper migrations for production schema changes
    console.log('Database connected and synchronized.'); // eslint-disable-line no-console
    app.listen(PORT, () => console.log(`API server listening on port ${PORT}`)); // eslint-disable-line no-console
  } catch (err) {
    console.error('Failed to start server:', err); // eslint-disable-line no-console
    process.exit(1);
  }
}

start();
