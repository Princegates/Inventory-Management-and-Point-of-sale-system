require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map((o) => o.trim());
app.use(cors({ origin: allowedOrigins.includes('*') ? true : allowedOrigins }));
app.use(express.json({ limit: '2mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// One-time setup for hosts with no shell/SSH access (e.g. shared cPanel hosting): visiting this
// URL once creates the default roles/permissions and admin user, same as `node src/seed.js`.
// Inert unless SEED_KEY is set, so it's safe to leave the code in place - just don't leave
// SEED_KEY set in the environment once you've used it.
if (process.env.SEED_KEY) {
  app.get('/api/run-seed', async (req, res, next) => {
    if (req.query.key !== process.env.SEED_KEY) return res.status(404).json({ error: 'Not found' });
    try {
      const seed = require('./seed');
      const result = await seed();
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  });

  // Same idea, for importing the real Zyente Tech catalog (categories + products + opening
  // stock) - same key as run-seed, since both are only ever needed during initial setup.
  app.get('/api/run-catalog-import', async (req, res, next) => {
    if (req.query.key !== process.env.SEED_KEY) return res.status(404).json({ error: 'Not found' });
    try {
      const importCatalog = require('./seedZyenteTech');
      const result = await importCatalog();
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  });

  // Same idea again, for the one-off relocation of opening stock from Shop 1 to Main Warehouse
  // (a real completed Stock Transfer, not a silent balance rewrite - see
  // relocateStockToWarehouse.js). Safe to trigger more than once: once stock is at the
  // warehouse, a second run finds nothing left at the shop and does nothing.
  app.get('/api/run-relocate-to-warehouse', async (req, res, next) => {
    if (req.query.key !== process.env.SEED_KEY) return res.status(404).json({ error: 'Not found' });
    try {
      const relocate = require('./relocateStockToWarehouse');
      const result = await relocate();
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  });
}

app.use('/api', routes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

module.exports = app;
