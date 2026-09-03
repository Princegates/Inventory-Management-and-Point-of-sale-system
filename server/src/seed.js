require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('./config/database');
const db = require('./models');
const { PERMISSIONS, ROLE_PERMISSIONS, ROLE_DISCOUNT_LIMIT } = require('./utils/permissions');

async function seed() {
  await sequelize.authenticate();
  await sequelize.sync();

  // Permissions
  const permissionRecords = {};
  for (const code of Object.values(PERMISSIONS)) {
    const [perm] = await db.Permission.findOrCreate({ where: { code }, defaults: { code } });
    permissionRecords[code] = perm;
  }
  console.log(`Permissions ready: ${Object.keys(permissionRecords).length}`); // eslint-disable-line no-console

  // Roles + role_permissions
  const roleRecords = {};
  for (const [roleName, codes] of Object.entries(ROLE_PERMISSIONS)) {
    const [role] = await db.Role.findOrCreate({
      where: { name: roleName },
      defaults: { name: roleName, is_system: true, max_discount_percent: ROLE_DISCOUNT_LIMIT[roleName] ?? 0 },
    });
    await role.setPermissions(codes.map((c) => permissionRecords[c].id));
    roleRecords[roleName] = role;
  }
  console.log(`Roles ready: ${Object.keys(roleRecords).length}`); // eslint-disable-line no-console

  // Default locations (SRS section 5 example: Main Warehouse + shops)
  const [mainWarehouse] = await db.Location.findOrCreate({
    where: { code: 'WH-MAIN' },
    defaults: { name: 'Main Warehouse', code: 'WH-MAIN', type: 'warehouse', status: 'active' },
  });
  const [shop1] = await db.Location.findOrCreate({
    where: { code: 'SHOP-01' },
    defaults: { name: 'Shop 1', code: 'SHOP-01', type: 'shop', status: 'active' },
  });

  // Default units
  for (const u of [{ name: 'Piece', abbreviation: 'pc' }, { name: 'Box', abbreviation: 'box' }, { name: 'Kilogram', abbreviation: 'kg' }, { name: 'Litre', abbreviation: 'L' }]) {
    await db.Unit.findOrCreate({ where: { name: u.name }, defaults: u });
  }

  // Default admin user
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
  const [admin, created] = await db.User.findOrCreate({
    where: { email: adminEmail },
    defaults: {
      name: 'System Administrator', email: adminEmail,
      password_hash: await bcrypt.hash(adminPassword, 10),
      role_id: roleRecords['Super Administrator'].id,
      has_global_location_access: true,
      status: 'active',
    },
  });
  if (!created) {
    // Re-running the seed (e.g. via /api/run-seed on a host with no shell access) should be
    // able to reset a forgotten/mistyped admin password, not just silently leave it unchanged.
    admin.password_hash = await bcrypt.hash(adminPassword, 10);
    admin.role_id = roleRecords['Super Administrator'].id;
    admin.has_global_location_access = true;
    admin.status = 'active';
    await admin.save();
  }
  await admin.setLocations([mainWarehouse.id, shop1.id]);

  console.log('---'); // eslint-disable-line no-console
  console.log(`Seed complete. Admin login: ${adminEmail} / ${adminPassword}`); // eslint-disable-line no-console
  return { adminEmail, adminPasswordSet: true };
}

module.exports = seed;

// Only run immediately (and exit the process) when invoked directly as `node src/seed.js` -
// app.js also imports this module to expose it over HTTP for hosts with no shell access, and
// process.exit() there would kill the whole running server.
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err); // eslint-disable-line no-console
      process.exit(1);
    });
}
