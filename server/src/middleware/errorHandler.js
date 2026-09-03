const { InsufficientStockError } = require('../services/inventoryEngine');

module.exports = function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof InsufficientStockError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ error: 'A record with this value already exists.', details: err.errors?.map((e) => e.message) });
  }

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({ error: 'Validation error', details: err.errors?.map((e) => e.message) });
  }

  const statusCode = err.statusCode || 500;
  if (statusCode === 500) {
    console.error(err); // eslint-disable-line no-console
  }
  res.status(statusCode).json({ error: err.message || 'Internal server error', details: err.details });
};
