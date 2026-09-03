const db = require('../models');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { logAudit } = require('../services/auditLogger');

// Business-identity settings (SRS section 60), stored as key/value rows in system_settings.
// Kept separate from the numbering-sequence counters that numberGenerator.js also stores there.
const DEFAULTS = {
  business_name: 'SunZan',
  business_tagline: 'Mobile Phone Accessories · Inventory & Point of Sale',
  business_address: '',
  business_phone: '',
  business_email: '',
  currency_symbol: 'GH₵',
  currency_code: 'GHS',
};

const EDITABLE_KEYS = Object.keys(DEFAULTS);
// Subset exposed without authentication, for the public landing page.
const PUBLIC_KEYS = ['business_name', 'business_tagline', 'currency_symbol', 'currency_code'];

async function readSettings(keys) {
  const rows = await db.SystemSetting.findAll({ where: { key: keys } });
  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  const settings = {};
  for (const key of keys) {
    const stored = byKey.get(key);
    settings[key] = stored !== undefined && stored !== null ? stored : DEFAULTS[key];
  }
  return settings;
}

const getPublic = catchAsync(async (req, res) => {
  const settings = await readSettings(PUBLIC_KEYS);
  res.json({ settings });
});

const getAll = catchAsync(async (req, res) => {
  const settings = await readSettings(EDITABLE_KEYS);
  res.json({ settings });
});

const update = catchAsync(async (req, res) => {
  const entries = Object.entries(req.body || {}).filter(([key]) => EDITABLE_KEYS.includes(key));
  if (!entries.length) throw new ApiError(400, 'No valid settings fields provided');

  const before = await readSettings(EDITABLE_KEYS);
  for (const [key, value] of entries) {
    await db.SystemSetting.upsert({ key, value: value === null || value === undefined ? '' : String(value) });
  }
  const after = await readSettings(EDITABLE_KEYS);

  await logAudit({ userId: req.user.id, action: 'UPDATE_SETTINGS', entityType: 'system_setting', previousValue: before, newValue: after });
  res.json({ settings: after });
});

module.exports = { getPublic, getAll, update };
