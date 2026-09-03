// The central inventory engine (SRS sections 9, 10, 54, 55, 69).
//
// No module in this codebase should ever write to the `inventory` table directly. Every stock
// mutation - purchases, sales, transfers, adjustments, returns, stock counts - must call
// `applyMovement` (or `applyMovements` for multi-line documents) inside a Sequelize transaction.
// That is what guarantees:
//   - every movement produces exactly one immutable ledger row (inventory_transactions)
//   - concurrent sales/transfers can never drive quantity below zero (SRS section 46)
//   - `current stock` is always derivable and reconcilable against ledger history (section 10)

const db = require('../models');
const { Inventory, InventoryTransaction } = db;

class InsufficientStockError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'InsufficientStockError';
    this.statusCode = 409;
    this.details = details;
  }
}

/**
 * Apply a single signed inventory movement for a product at a location.
 *
 * @param {object} params
 * @param {number} params.productId
 * @param {number} params.locationId
 * @param {string} params.type - one of the InventoryTransaction `type` enum values
 * @param {number} params.quantity - signed delta (positive = stock in, negative = stock out)
 * @param {string} [params.referenceType]
 * @param {number} [params.referenceId]
 * @param {string} [params.referenceNumber]
 * @param {number} [params.userId]
 * @param {string} [params.reason]
 * @param {boolean} [params.allowNegative=false] - explicit manager override (must be audited by caller)
 * @param {import('sequelize').Transaction} transaction - REQUIRED, all-or-nothing with the rest of the operation
 */
async function applyMovement(params, transaction) {
  const {
    productId, locationId, type, quantity,
    referenceType = null, referenceId = null, referenceNumber = null,
    userId = null, reason = null, allowNegative = false,
  } = params;

  if (!transaction) {
    throw new Error('applyMovement must be called within a database transaction');
  }
  if (!Number.isInteger(quantity) || quantity === 0) {
    throw new Error('applyMovement quantity must be a non-zero integer');
  }

  // Row-level lock: guarantees correctness under concurrent POS terminals hitting the same
  // product/location simultaneously (SRS section 46 - "handled at the database/transaction
  // level rather than relying solely on the user interface").
  let inventoryRow = await Inventory.findOne({
    where: { product_id: productId, location_id: locationId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!inventoryRow) {
    inventoryRow = await Inventory.create(
      { product_id: productId, location_id: locationId, quantity: 0 },
      { transaction }
    );
  }

  const previousBalance = inventoryRow.quantity;
  const newBalance = previousBalance + quantity;

  if (newBalance < 0 && !allowNegative) {
    throw new InsufficientStockError(
      `Insufficient stock. Only ${previousBalance} unit(s) available.`,
      { productId, locationId, available: previousBalance, requested: -quantity }
    );
  }

  inventoryRow.quantity = newBalance;
  await inventoryRow.save({ transaction });

  const ledgerEntry = await InventoryTransaction.create({
    product_id: productId,
    location_id: locationId,
    type,
    quantity,
    previous_balance: previousBalance,
    new_balance: newBalance,
    reference_type: referenceType,
    reference_id: referenceId,
    reference_number: referenceNumber,
    user_id: userId,
    reason,
  }, { transaction });

  return { inventory: inventoryRow, ledgerEntry };
}

async function applyMovements(movements, transaction) {
  const results = [];
  for (const movement of movements) {
    results.push(await applyMovement(movement, transaction));
  }
  return results;
}

/** Move stock out of `locationId` into that location's in-transit bucket (transfer issue). */
async function issueToTransit({ productId, locationId, quantity, referenceType, referenceId, referenceNumber, userId }, transaction) {
  const result = await applyMovement({
    productId, locationId, quantity: -quantity, type: 'transfer_out',
    referenceType, referenceId, referenceNumber, userId, reason: 'Stock transfer issued',
  }, transaction);

  await Inventory.increment('quantity_in_transit', {
    by: quantity,
    where: { product_id: productId, location_id: locationId },
    transaction,
  });

  return result;
}

/** Clear the source's in-transit bucket and land the stock at the destination (transfer receipt). */
async function receiveFromTransit({ productId, sourceLocationId, destinationLocationId, quantity, referenceType, referenceId, referenceNumber, userId }, transaction) {
  await Inventory.decrement('quantity_in_transit', {
    by: quantity,
    where: { product_id: productId, location_id: sourceLocationId },
    transaction,
  });

  return applyMovement({
    productId, locationId: destinationLocationId, quantity, type: 'transfer_in',
    referenceType, referenceId, referenceNumber, userId, reason: 'Stock transfer received',
  }, transaction);
}

/** Reverse an in-transit issue without it ever reaching the destination (transfer cancelled). */
async function cancelTransit({ productId, locationId, quantity, referenceType, referenceId, referenceNumber, userId }, transaction) {
  await Inventory.decrement('quantity_in_transit', {
    by: quantity,
    where: { product_id: productId, location_id: locationId },
    transaction,
  });

  return applyMovement({
    productId, locationId, quantity, type: 'transfer_cancelled',
    referenceType, referenceId, referenceNumber, userId, reason: 'Stock transfer cancelled',
  }, transaction);
}

/**
 * Moves units into the non-sellable "damaged" bucket without touching available quantity -
 * used when a customer return is inspected and found unsalable (SRS section 26: "For damaged
 * returns: Available Inventory: No increase. Damaged Inventory: +1"). Still writes a ledger
 * row (zero delta on the available-quantity column) so the movement stays traceable.
 */
async function moveToDamaged({ productId, locationId, quantity, referenceType, referenceId, referenceNumber, userId, reason }, transaction) {
  if (!transaction) throw new Error('moveToDamaged must be called within a database transaction');
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('moveToDamaged quantity must be a positive integer');

  let inventoryRow = await Inventory.findOne({
    where: { product_id: productId, location_id: locationId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!inventoryRow) {
    inventoryRow = await Inventory.create({ product_id: productId, location_id: locationId, quantity: 0 }, { transaction });
  }

  inventoryRow.quantity_damaged += quantity;
  await inventoryRow.save({ transaction });

  const ledgerEntry = await InventoryTransaction.create({
    product_id: productId,
    location_id: locationId,
    type: 'damaged',
    quantity: 0,
    previous_balance: inventoryRow.quantity,
    new_balance: inventoryRow.quantity,
    reference_type: referenceType,
    reference_id: referenceId,
    reference_number: referenceNumber,
    user_id: userId,
    reason,
  }, { transaction });

  return { inventory: inventoryRow, ledgerEntry };
}

async function getBalance(productId, locationId, transaction) {
  const row = await Inventory.findOne({ where: { product_id: productId, location_id: locationId }, transaction });
  return row ? row.quantity : 0;
}

module.exports = {
  InsufficientStockError,
  applyMovement,
  applyMovements,
  issueToTransit,
  receiveFromTransit,
  cancelTransit,
  moveToDamaged,
  getBalance,
};
