const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

// Atomically increments a named counter in system_settings and returns the new value.
// Using a single upsert statement (rather than SELECT ... FOR UPDATE) keeps this safe under
// concurrent access from multiple POS terminals (SRS section 45/46) without holding row locks
// for longer than the single statement.
async function nextSequence(key, transaction) {
  const [row] = await sequelize.query(
    `INSERT INTO system_settings (key, value)
     VALUES (:key, '1')
     ON CONFLICT (key) DO UPDATE SET value = (system_settings.value::bigint + 1)::text
     RETURNING value`,
    { replacements: { key }, transaction, type: QueryTypes.SELECT }
  );
  return Number(row.value);
}

function pad(num, size = 6) {
  return String(num).padStart(size, '0');
}

function todayCompact() {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}`;
}

const GENERATORS = {
  sale: async (t) => `SALE-${todayCompact()}-${pad(await nextSequence('seq_sale', t))}`,
  receipt: async (t) => `RCT-${todayCompact()}-${pad(await nextSequence('seq_receipt', t))}`,
  purchaseOrder: async (t) => `PO-${todayCompact()}-${pad(await nextSequence('seq_po', t))}`,
  goodsReceipt: async (t) => `GR-${todayCompact()}-${pad(await nextSequence('seq_gr', t))}`,
  transfer: async (t) => `TRF-${todayCompact()}-${pad(await nextSequence('seq_transfer', t))}`,
  stockCount: async (t) => `SC-${todayCompact()}-${pad(await nextSequence('seq_count', t))}`,
  adjustment: async (t) => `ADJ-${todayCompact()}-${pad(await nextSequence('seq_adjustment', t))}`,
  return: async (t) => `RET-${todayCompact()}-${pad(await nextSequence('seq_return', t))}`,
  cashierSession: async (t) => `CS-${todayCompact()}-${pad(await nextSequence('seq_session', t))}`,
};

module.exports = { nextSequence, GENERATORS };
