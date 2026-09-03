// Populates the catalog with a realistic phone-accessories shop example (categories, brands,
// suppliers, ~35 products) and credits opening stock directly into the seeded "Shop 1" location
// so the POS has something to sell immediately. Safe to re-run: products are matched by SKU and
// opening stock is only credited once per product/location (skipped if stock already exists).
//
// Usage: run `npm run seed` first (creates roles/permissions/locations/admin), then:
//   node src/seedPhoneAccessories.js
require('dotenv').config();
const sequelize = require('./config/database');
const db = require('./models');
const inventoryEngine = require('./services/inventoryEngine');

const CATEGORIES = [
  'Phone Cases', 'Screen Protectors', 'Chargers & Cables', 'Power Banks',
  'Earphones & Headphones', 'Car Accessories', 'Other Accessories',
];

const BRANDS = ['Anker', 'Baseus', 'Oraimo', 'Apple', 'Samsung', 'Generic'];

const SUPPLIERS = [
  { name: 'Accra Accessories Wholesale', contact_person: 'Mr. Mensah', phone: '0244000001', payment_terms: 'Cash on delivery' },
  { name: 'China Direct Imports Ltd', contact_person: 'Sales Desk', phone: '0244000002', payment_terms: '30-day credit' },
];

// category, brand, supplier are matched by name to the records created above.
const PRODUCTS = [
  // Phone Cases
  { sku: 'CASE-IP13-CLR', name: 'iPhone 13 Clear Case', category: 'Phone Cases', brand: 'Generic', purchasePrice: 12, sellingPrice: 30, reorderLevel: 10, openingQty: 25 },
  { sku: 'CASE-IP14-CLR', name: 'iPhone 14 Clear Case', category: 'Phone Cases', brand: 'Generic', purchasePrice: 12, sellingPrice: 30, reorderLevel: 10, openingQty: 25 },
  { sku: 'CASE-IP15-CLR', name: 'iPhone 15 Clear Case', category: 'Phone Cases', brand: 'Generic', purchasePrice: 15, sellingPrice: 35, reorderLevel: 10, openingQty: 25 },
  { sku: 'CASE-IP15-LTH', name: 'iPhone 15 Leather Case', category: 'Phone Cases', brand: 'Apple', purchasePrice: 40, sellingPrice: 90, reorderLevel: 5, openingQty: 10 },
  { sku: 'CASE-S23-CLR', name: 'Samsung S23 Clear Case', category: 'Phone Cases', brand: 'Generic', purchasePrice: 12, sellingPrice: 30, reorderLevel: 10, openingQty: 20 },
  { sku: 'CASE-S24-CLR', name: 'Samsung S24 Clear Case', category: 'Phone Cases', brand: 'Generic', purchasePrice: 12, sellingPrice: 30, reorderLevel: 10, openingQty: 20 },
  { sku: 'CASE-UNIV-RUG', name: 'Universal Rugged Case (Assorted)', category: 'Phone Cases', brand: 'Generic', purchasePrice: 18, sellingPrice: 45, reorderLevel: 15, openingQty: 30 },

  // Screen Protectors
  { sku: 'SP-IP13-TG', name: 'iPhone 13 Tempered Glass', category: 'Screen Protectors', brand: 'Generic', purchasePrice: 4, sellingPrice: 18, reorderLevel: 15, openingQty: 30 },
  { sku: 'SP-IP14-TG', name: 'iPhone 14 Tempered Glass', category: 'Screen Protectors', brand: 'Generic', purchasePrice: 4, sellingPrice: 18, reorderLevel: 15, openingQty: 30 },
  { sku: 'SP-IP15-TG', name: 'iPhone 15 Tempered Glass', category: 'Screen Protectors', brand: 'Generic', purchasePrice: 5, sellingPrice: 20, reorderLevel: 15, openingQty: 30 },
  { sku: 'SP-S23-TG', name: 'Samsung S23 Tempered Glass', category: 'Screen Protectors', brand: 'Generic', purchasePrice: 5, sellingPrice: 20, reorderLevel: 15, openingQty: 25 },
  { sku: 'SP-S24-TG', name: 'Samsung S24 Tempered Glass', category: 'Screen Protectors', brand: 'Generic', purchasePrice: 5, sellingPrice: 20, reorderLevel: 15, openingQty: 25 },
  { sku: 'SP-PRIVACY-UNIV', name: 'Universal Privacy Screen Protector', category: 'Screen Protectors', brand: 'Generic', purchasePrice: 8, sellingPrice: 28, reorderLevel: 8, openingQty: 15 },

  // Chargers & Cables
  { sku: 'CHG-TYPEC-20W', name: '20W Type-C Fast Charger', category: 'Chargers & Cables', brand: 'Baseus', purchasePrice: 25, sellingPrice: 60, reorderLevel: 8, openingQty: 20 },
  { sku: 'CHG-TYPEC-65W', name: '65W Type-C GaN Fast Charger', category: 'Chargers & Cables', brand: 'Anker', purchasePrice: 60, sellingPrice: 140, reorderLevel: 4, openingQty: 8 },
  { sku: 'CHG-WIRELESS-15W', name: '15W Wireless Charging Pad', category: 'Chargers & Cables', brand: 'Anker', purchasePrice: 35, sellingPrice: 90, reorderLevel: 5, openingQty: 10 },
  { sku: 'CBL-TYPEC-1M', name: 'Type-C Cable 1m', category: 'Chargers & Cables', brand: 'Baseus', purchasePrice: 8, sellingPrice: 25, reorderLevel: 20, openingQty: 40 },
  { sku: 'CBL-TYPEC-2M', name: 'Type-C Cable 2m', category: 'Chargers & Cables', brand: 'Baseus', purchasePrice: 12, sellingPrice: 35, reorderLevel: 15, openingQty: 25 },
  { sku: 'CBL-LGHT-1M', name: 'Lightning Cable 1m', category: 'Chargers & Cables', brand: 'Apple', purchasePrice: 15, sellingPrice: 40, reorderLevel: 15, openingQty: 25 },
  { sku: 'CBL-MICRO-1M', name: 'Micro-USB Cable 1m', category: 'Chargers & Cables', brand: 'Generic', purchasePrice: 6, sellingPrice: 20, reorderLevel: 15, openingQty: 20 },

  // Power Banks
  { sku: 'PB-10000', name: '10,000mAh Power Bank', category: 'Power Banks', brand: 'Oraimo', purchasePrice: 45, sellingPrice: 100, reorderLevel: 5, openingQty: 12 },
  { sku: 'PB-20000', name: '20,000mAh Power Bank', category: 'Power Banks', brand: 'Oraimo', purchasePrice: 75, sellingPrice: 170, reorderLevel: 4, openingQty: 8 },
  { sku: 'PB-10000-FAST', name: '10,000mAh Fast-Charge Power Bank', category: 'Power Banks', brand: 'Anker', purchasePrice: 90, sellingPrice: 200, reorderLevel: 3, openingQty: 6 },

  // Earphones & Headphones
  { sku: 'EAR-TWS-01', name: 'Wireless Earbuds (TWS)', category: 'Earphones & Headphones', brand: 'Oraimo', purchasePrice: 30, sellingPrice: 80, reorderLevel: 6, openingQty: 15 },
  { sku: 'EAR-TWS-PRO', name: 'Wireless Earbuds Pro (ANC)', category: 'Earphones & Headphones', brand: 'Anker', purchasePrice: 70, sellingPrice: 160, reorderLevel: 4, openingQty: 8 },
  { sku: 'EAR-WIRED-35', name: 'Wired Earphones 3.5mm', category: 'Earphones & Headphones', brand: 'Generic', purchasePrice: 5, sellingPrice: 15, reorderLevel: 15, openingQty: 25 },
  { sku: 'HEAD-BT-OVER', name: 'Bluetooth Over-Ear Headphones', category: 'Earphones & Headphones', brand: 'Baseus', purchasePrice: 55, sellingPrice: 130, reorderLevel: 4, openingQty: 8 },

  // Car Accessories
  { sku: 'CAR-MOUNT-VENT', name: 'Car Vent Phone Mount', category: 'Car Accessories', brand: 'Baseus', purchasePrice: 15, sellingPrice: 40, reorderLevel: 6, openingQty: 12 },
  { sku: 'CAR-CHG-DUAL', name: 'Dual-Port Car Charger', category: 'Car Accessories', brand: 'Anker', purchasePrice: 18, sellingPrice: 45, reorderLevel: 6, openingQty: 12 },
  { sku: 'CAR-FM-TRANS', name: 'Bluetooth FM Transmitter', category: 'Car Accessories', brand: 'Generic', purchasePrice: 25, sellingPrice: 65, reorderLevel: 4, openingQty: 8 },

  // Other Accessories
  { sku: 'POP-SOCKET', name: 'Pop Socket Grip', category: 'Other Accessories', brand: 'Generic', purchasePrice: 4, sellingPrice: 15, reorderLevel: 15, openingQty: 30 },
  { sku: 'RING-HOLDER', name: 'Phone Ring Holder/Stand', category: 'Other Accessories', brand: 'Generic', purchasePrice: 4, sellingPrice: 15, reorderLevel: 15, openingQty: 25 },
  { sku: 'CLEAN-KIT', name: 'Screen Cleaning Kit', category: 'Other Accessories', brand: 'Generic', purchasePrice: 6, sellingPrice: 20, reorderLevel: 10, openingQty: 15 },
  { sku: 'SIM-EJECT', name: 'SIM Eject Tool (Pack of 5)', category: 'Other Accessories', brand: 'Generic', purchasePrice: 2, sellingPrice: 10, reorderLevel: 10, openingQty: 20 },
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

  const brandRecords = {};
  for (const name of BRANDS) {
    const [brand] = await db.Brand.findOrCreate({ where: { name } });
    brandRecords[name] = brand;
  }

  for (const s of SUPPLIERS) {
    await db.Supplier.findOrCreate({ where: { name: s.name }, defaults: s });
  }

  let created = 0, stocked = 0, skippedStock = 0;

  for (const p of PRODUCTS) {
    const [product] = await db.Product.findOrCreate({
      where: { sku: p.sku },
      defaults: {
        sku: p.sku,
        name: p.name,
        category_id: categoryRecords[p.category].id,
        brand_id: brandRecords[p.brand].id,
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
        referenceType: 'seed_script', referenceNumber: 'SEED-PHONE-ACCESSORIES',
        userId: adminUser ? adminUser.id : null, reason: 'Initial catalog seed - phone accessories case study',
      }, t);
    });
    stocked += 1;
  }

  console.log(`Categories: ${CATEGORIES.length}, Brands: ${BRANDS.length}, Suppliers: ${SUPPLIERS.length}`); // eslint-disable-line no-console
  console.log(`Products created/matched: ${created}. Opening stock credited: ${stocked}. Already stocked (skipped): ${skippedStock}.`); // eslint-disable-line no-console
  console.log(`All stock was credited into: ${shop.name} (${shop.code}).`); // eslint-disable-line no-console
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err); // eslint-disable-line no-console
  process.exit(1);
});
