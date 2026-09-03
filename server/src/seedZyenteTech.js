// Imports the real Zyente Tech catalog (from Zyente_Tech_Sales_Mgt_System.xlsx) into the
// system: 4 categories and 77 products, with opening stock credited directly into the seeded
// "Shop 1" location via the inventory engine.
//
// Source spreadsheet notes:
// - "Cost Price (RMB)" in the sheet is the supplier cost in Chinese Yuan; the sheet itself
//   converts this to GH¢ via `=RMB/6.63*12+0.4` (an RMB->USD rate, a USD->GHS rate, plus a
//   flat per-unit landed-cost allowance). That already-converted GH¢ figure is what's
//   imported as purchase_price below, since this system prices everything in one currency.
// - The Sales and Stock Movements sheets in the workbook were empty (template only, no
//   transactions recorded yet), so there is no sales/movement history to import - only the
//   product catalog and opening stock.
// - Every product's Reorder Level in the sheet was 50 - carried through as-is.
//
// Usage: run `npm run seed` first (creates roles/permissions/locations/admin), then:
//   node src/seedZyenteTech.js
require('dotenv').config();
const sequelize = require('./config/database');
const db = require('./models');
const inventoryEngine = require('./services/inventoryEngine');

const CATEGORIES = ['Accessory', 'Privacy Glass', 'AG Matte Glass', '9D Glass'];

const PRODUCTS = [
  { sku: 'ZT001', name: 'MG-S20 SM', category: 'Accessory', purchasePrice: 34.79, sellingPrice: 50, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT002', name: 'AirPods 2', category: 'Accessory', purchasePrice: 43.84, sellingPrice: 60, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT003', name: 'AirPods 3', category: 'Accessory', purchasePrice: 47.46, sellingPrice: 60, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT004', name: 'AirPods 4', category: 'Accessory', purchasePrice: 49.27, sellingPrice: 70, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT005', name: 'AirPods Pro 2', category: 'Accessory', purchasePrice: 50.17, sellingPrice: 70, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT006', name: 'S8 UK Charger Set', category: 'Accessory', purchasePrice: 13.07, sellingPrice: 25, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT007', name: '6A', category: 'Accessory', purchasePrice: 8.0, sellingPrice: 14, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT008', name: 'PRO55', category: 'Accessory', purchasePrice: 15.78, sellingPrice: 22, openingQty: 1000, reorderLevel: 50 },
  { sku: 'ZT009', name: 'USB-17', category: 'Accessory', purchasePrice: 4.02, sellingPrice: 6, openingQty: 400, reorderLevel: 50 },
  { sku: 'ZT010', name: 'S10 HF', category: 'Accessory', purchasePrice: 7.64, sellingPrice: 11, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT011', name: 'N10 HF', category: 'Accessory', purchasePrice: 9.27, sellingPrice: 14, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT012', name: 'TC', category: 'Accessory', purchasePrice: 19.4, sellingPrice: 25, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT013', name: 'IP 6', category: 'Privacy Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 200, reorderLevel: 50 },
  { sku: 'ZT014', name: '7+/8+', category: 'Privacy Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 200, reorderLevel: 50 },
  { sku: 'ZT015', name: 'IP X/XS/11Pro', category: 'Privacy Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT016', name: 'IP XR/11', category: 'Privacy Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 800, reorderLevel: 50 },
  { sku: 'ZT017', name: 'Xsmax/11Promax', category: 'Privacy Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 600, reorderLevel: 50 },
  { sku: 'ZT018', name: 'IP 12/12Pro', category: 'Privacy Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT019', name: '12Promax', category: 'Privacy Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT020', name: 'IP 13/14/13Pro/16E/17E', category: 'Privacy Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 400, reorderLevel: 50 },
  { sku: 'ZT021', name: '13Promax', category: 'Privacy Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT022', name: '14Pro', category: 'Privacy Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT023', name: '14Promax', category: 'Privacy Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT024', name: '15Promax', category: 'Privacy Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT025', name: 'IP 15', category: 'Privacy Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT026', name: 'IP 16', category: 'Privacy Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT027', name: '16Promax', category: 'Privacy Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT028', name: 'IP 17', category: 'Privacy Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT029', name: '17Pro', category: 'Privacy Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT030', name: '17 Air', category: 'Privacy Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT031', name: '17Promax', category: 'Privacy Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 700, reorderLevel: 50 },
  { sku: 'ZT032', name: 'IP 6', category: 'AG Matte Glass', purchasePrice: 4.74, sellingPrice: 7, openingQty: 200, reorderLevel: 50 },
  { sku: 'ZT033', name: '7+/8+', category: 'AG Matte Glass', purchasePrice: 4.74, sellingPrice: 7, openingQty: 200, reorderLevel: 50 },
  { sku: 'ZT034', name: 'IP X/XS/11Pro', category: 'AG Matte Glass', purchasePrice: 4.74, sellingPrice: 7, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT035', name: 'IP XR/11', category: 'AG Matte Glass', purchasePrice: 4.74, sellingPrice: 7, openingQty: 800, reorderLevel: 50 },
  { sku: 'ZT036', name: 'Xsmax/11Promax', category: 'AG Matte Glass', purchasePrice: 4.74, sellingPrice: 7, openingQty: 600, reorderLevel: 50 },
  { sku: 'ZT037', name: 'IP 12/12Pro', category: 'AG Matte Glass', purchasePrice: 4.74, sellingPrice: 7, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT038', name: '12Promax', category: 'AG Matte Glass', purchasePrice: 4.74, sellingPrice: 7, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT039', name: 'IP 13/14/13Pro/16E/17E', category: 'AG Matte Glass', purchasePrice: 4.74, sellingPrice: 7, openingQty: 400, reorderLevel: 50 },
  { sku: 'ZT040', name: '13Promax', category: 'AG Matte Glass', purchasePrice: 4.74, sellingPrice: 7, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT041', name: '14Pro', category: 'AG Matte Glass', purchasePrice: 4.74, sellingPrice: 7, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT042', name: '14Promax', category: 'AG Matte Glass', purchasePrice: 4.74, sellingPrice: 7, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT043', name: '15Promax', category: 'AG Matte Glass', purchasePrice: 4.74, sellingPrice: 7, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT044', name: 'IP 15', category: 'AG Matte Glass', purchasePrice: 4.74, sellingPrice: 7, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT045', name: 'IP 16', category: 'AG Matte Glass', purchasePrice: 4.74, sellingPrice: 7, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT046', name: '16Promax', category: 'AG Matte Glass', purchasePrice: 4.74, sellingPrice: 7, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT047', name: 'IP 17', category: 'AG Matte Glass', purchasePrice: 4.74, sellingPrice: 7, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT048', name: '17Pro', category: 'AG Matte Glass', purchasePrice: 4.74, sellingPrice: 7, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT049', name: '17 Air', category: 'AG Matte Glass', purchasePrice: 4.74, sellingPrice: 7, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT050', name: '17Promax', category: 'AG Matte Glass', purchasePrice: 4.74, sellingPrice: 7, openingQty: 700, reorderLevel: 50 },
  { sku: 'ZT051', name: 'IP 6', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 200, reorderLevel: 50 },
  { sku: 'ZT052', name: '7+/8+', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 200, reorderLevel: 50 },
  { sku: 'ZT053', name: 'IP X/XS/11Pro', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT054', name: 'IP XR/11', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 800, reorderLevel: 50 },
  { sku: 'ZT055', name: 'Xsmax/11Promax', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 600, reorderLevel: 50 },
  { sku: 'ZT056', name: 'IP 12/12Pro', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT057', name: '12Promax', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT058', name: 'IP 13/14/13Pro/16E/17E', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 400, reorderLevel: 50 },
  { sku: 'ZT059', name: '13Promax', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT060', name: '14Pro', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT061', name: '14Promax', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT062', name: '15Promax', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT063', name: 'IP 15', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT064', name: 'IP 16', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT065', name: '16Promax', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT066', name: 'IP 17', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT067', name: '17Pro', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT068', name: '17 Air', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT069', name: '17Promax', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 700, reorderLevel: 50 },
  { sku: 'ZT070', name: 'SAM A17', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT071', name: 'SAM A16', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT072', name: 'SAM A57', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT073', name: 'SAM A07', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT074', name: 'SAM A05', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 400, reorderLevel: 50 },
  { sku: 'ZT075', name: 'Hot8', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 500, reorderLevel: 50 },
  { sku: 'ZT076', name: 'Hot9', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 300, reorderLevel: 50 },
  { sku: 'ZT077', name: 'Camon50F', category: '9D Glass', purchasePrice: 2.21, sellingPrice: 5, openingQty: 300, reorderLevel: 50 },
];

async function run() {
  await sequelize.authenticate();

  const shop = await db.Location.findOne({ where: { code: 'SHOP-01' } });
  if (!shop) {
    throw new Error('Location SHOP-01 ("Shop 1") not found - run `npm run seed` first to create the default roles, locations and admin user.');
  }
  const unit = await db.Unit.findOne({ where: { name: 'Piece' } });
  const adminUser = await db.User.findOne({ where: { has_global_location_access: true } });

  const categoryRecords = {};
  for (const name of CATEGORIES) {
    const [cat] = await db.Category.findOrCreate({ where: { name, parent_id: null } });
    categoryRecords[name] = cat;
  }

  let created = 0, stocked = 0, skippedStock = 0;

  for (const p of PRODUCTS) {
    const [product] = await db.Product.findOrCreate({
      where: { sku: p.sku },
      defaults: {
        sku: p.sku,
        name: p.name,
        category_id: categoryRecords[p.category].id,
        unit_id: unit ? unit.id : null,
        purchase_price: p.purchasePrice,
        selling_price: p.sellingPrice,
        reorder_level: p.reorderLevel,
        min_stock_level: Math.max(0, Math.round(p.reorderLevel / 2)),
        status: 'active',
      },
    });
    created += 1;

    const existingStock = await db.Inventory.findOne({ where: { product_id: product.id, location_id: shop.id } });
    if (existingStock && existingStock.quantity > 0) {
      skippedStock += 1;
      continue;
    }

    await sequelize.transaction(async (t) => {
      await inventoryEngine.applyMovement({
        productId: product.id, locationId: shop.id, quantity: p.openingQty, type: 'opening_balance',
        referenceType: 'seed_script', referenceNumber: 'SEED-ZYENTE-TECH',
        userId: adminUser ? adminUser.id : null, reason: 'Imported from Zyente_Tech_Sales_Mgt_System.xlsx',
      }, t);
    });
    stocked += 1;
  }

  const totalUnits = PRODUCTS.reduce((s, p) => s + p.openingQty, 0);
  console.log(`Categories: ${CATEGORIES.length}`); // eslint-disable-line no-console
  console.log(`Products created/matched: ${created} (${totalUnits} total opening units across the catalog).`); // eslint-disable-line no-console
  console.log(`Opening stock credited: ${stocked}. Already stocked (skipped): ${skippedStock}.`); // eslint-disable-line no-console
  console.log(`All stock was credited into: ${shop.name} (${shop.code}).`); // eslint-disable-line no-console
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err); // eslint-disable-line no-console
  process.exit(1);
});
