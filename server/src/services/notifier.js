const db = require('../models');

// In-app notifications (SRS section 49). Email/SMS delivery is listed as a future integration
// in the SRS (section 61) - notifications are persisted here and surfaced via the API/dashboard.
async function notify({ userId = null, type, message, referenceType = null, referenceId = null }, transaction) {
  return db.Notification.create({
    user_id: userId,
    type,
    message,
    reference_type: referenceType,
    reference_id: referenceId,
  }, { transaction });
}

async function notifyLowStock(product, location, quantity, transaction) {
  return notify({
    type: 'low_stock',
    message: `Low Stock Alert: ${product.name} has ${quantity} unit(s) remaining at ${location.name}. Reorder level is ${product.reorder_level}.`,
    referenceType: 'product',
    referenceId: product.id,
  }, transaction);
}

async function notifyOutOfStock(product, location, transaction) {
  return notify({
    type: 'out_of_stock',
    message: `${product.name} is now out of stock at ${location.name}.`,
    referenceType: 'product',
    referenceId: product.id,
  }, transaction);
}

/** Checks reorder/out-of-stock thresholds after a stock-decreasing movement and raises alerts. */
async function checkStockThresholds(product, location, newBalance, transaction) {
  if (newBalance <= 0) {
    await notifyOutOfStock(product, location, transaction);
  } else if (product.reorder_level > 0 && newBalance <= product.reorder_level) {
    await notifyLowStock(product, location, newBalance, transaction);
  }
}

module.exports = { notify, notifyLowStock, notifyOutOfStock, checkStockThresholds };
