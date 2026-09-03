// One-off correction: moves ALL current stock at "Shop 1" to "Main Warehouse", as a single
// completed Stock Transfer (not a silent balance rewrite) - so it shows up properly in Stock
// Transfers history and the inventory ledger, exactly as if it had gone through
// request -> approve -> issue -> receive via the app.
//
// Reads whatever is actually at Shop 1 right now, so it picks up everything regardless of
// which seed script(s) put it there. Safe to re-run: once stock is at the warehouse, a second
// run finds nothing left at the shop and does nothing.
//
// Usage: node src/relocateStockToWarehouse.js
require('dotenv').config();
const sequelize = require('./config/database');
const db = require('./models');
const inventoryEngine = require('./services/inventoryEngine');
const { GENERATORS } = require('./services/numberGenerator');

async function run() {
  await sequelize.authenticate();

  const shop = await db.Location.findOne({ where: { code: 'SHOP-01' } });
  const warehouse = await db.Location.findOne({ where: { code: 'WH-MAIN' } });
  if (!shop || !warehouse) {
    throw new Error('Expected locations SHOP-01 ("Shop 1") and WH-MAIN ("Main Warehouse") to exist - run `npm run seed` first.');
  }

  const adminUser = await db.User.findOne({ where: { has_global_location_access: true } });

  const stockAtShop = await db.Inventory.findAll({
    where: { location_id: shop.id },
    include: [{ model: db.Product, as: 'product' }],
  });
  const items = stockAtShop.filter((row) => row.quantity > 0);

  if (items.length === 0) {
    console.log('Nothing to move - no stock currently at Shop 1.'); // eslint-disable-line no-console
    process.exit(0);
  }

  const totalUnits = items.reduce((s, row) => s + row.quantity, 0);

  const result = await sequelize.transaction(async (t) => {
    const transferNumber = await GENERATORS.transfer(t);
    const transfer = await db.StockTransfer.create({
      transfer_number: transferNumber,
      source_location_id: shop.id,
      destination_location_id: warehouse.id,
      status: 'requested',
      requested_by: adminUser ? adminUser.id : null,
      notes: 'Bulk relocation - moving opening stock from shop to warehouse (relocateStockToWarehouse.js)',
    }, { transaction: t });

    await db.StockTransferItem.bulkCreate(
      items.map((row) => ({ stock_transfer_id: transfer.id, product_id: row.product_id, quantity: row.quantity })),
      { transaction: t }
    );

    transfer.status = 'approved';
    transfer.approved_by = adminUser ? adminUser.id : null;
    await transfer.save({ transaction: t });

    for (const row of items) {
      await inventoryEngine.issueToTransit({
        productId: row.product_id, locationId: shop.id, quantity: row.quantity,
        referenceType: 'stock_transfer', referenceId: transfer.id, referenceNumber: transferNumber,
        userId: adminUser ? adminUser.id : null,
      }, t);
    }
    transfer.status = 'in_transit';
    transfer.issued_by = adminUser ? adminUser.id : null;
    transfer.issued_at = new Date();
    await transfer.save({ transaction: t });

    for (const row of items) {
      await inventoryEngine.receiveFromTransit({
        productId: row.product_id, sourceLocationId: shop.id, destinationLocationId: warehouse.id, quantity: row.quantity,
        referenceType: 'stock_transfer', referenceId: transfer.id, referenceNumber: transferNumber,
        userId: adminUser ? adminUser.id : null,
      }, t);
    }
    transfer.status = 'completed';
    transfer.received_by = adminUser ? adminUser.id : null;
    transfer.received_at = new Date();
    await transfer.save({ transaction: t });

    return transfer;
  });

  console.log(`Transfer ${result.transfer_number} completed: ${items.length} product(s), ${totalUnits} total units.`); // eslint-disable-line no-console
  console.log(`Moved from ${shop.name} -> ${warehouse.name}.`); // eslint-disable-line no-console
  console.log('View it under Stock Transfers in the app.'); // eslint-disable-line no-console
  process.exit(0);
}

run().catch((err) => {
  console.error('Relocation failed:', err); // eslint-disable-line no-console
  process.exit(1);
});
