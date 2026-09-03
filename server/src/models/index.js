const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const db = { sequelize };

const modelFiles = [
  'user', 'role', 'permission',
  'location',
  'category', 'brand', 'unit',
  'supplier', 'customer',
  'product',
  'inventory', 'inventoryTransaction',
  'purchaseOrder', 'purchaseOrderItem',
  'goodsReceipt', 'goodsReceiptItem',
  'stockTransfer', 'stockTransferItem',
  'stockCount', 'stockCountItem',
  'stockAdjustment',
  'sale', 'saleItem',
  'payment',
  'return', 'returnItem',
  'cashierSession',
  'priceHistory',
  'notification',
  'auditLog',
  'systemSetting',
];

for (const file of modelFiles) {
  const model = require(`./${file}`)(sequelize, DataTypes);
  db[model.name] = model;
}

// ---- Associations ----

// Auth / RBAC
db.Role.belongsToMany(db.Permission, { through: 'role_permissions', as: 'permissions', timestamps: false });
db.Permission.belongsToMany(db.Role, { through: 'role_permissions', as: 'roles', timestamps: false });

db.Role.hasMany(db.User, { foreignKey: 'role_id', as: 'users' });
db.User.belongsTo(db.Role, { foreignKey: 'role_id', as: 'role' });

db.User.belongsToMany(db.Location, { through: 'user_locations', as: 'locations', timestamps: false });
db.Location.belongsToMany(db.User, { through: 'user_locations', as: 'users', timestamps: false });

// Catalog
db.Category.hasMany(db.Category, { foreignKey: 'parent_id', as: 'subcategories' });
db.Category.belongsTo(db.Category, { foreignKey: 'parent_id', as: 'parent' });

db.Product.belongsTo(db.Category, { foreignKey: 'category_id', as: 'category' });
db.Product.belongsTo(db.Category, { foreignKey: 'subcategory_id', as: 'subcategory' });
db.Product.belongsTo(db.Brand, { foreignKey: 'brand_id', as: 'brand' });
db.Product.belongsTo(db.Unit, { foreignKey: 'unit_id', as: 'unit' });
db.Product.belongsTo(db.Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
db.Product.hasMany(db.PriceHistory, { foreignKey: 'product_id', as: 'priceHistory' });

// Inventory
db.Product.hasMany(db.Inventory, { foreignKey: 'product_id', as: 'inventory' });
db.Inventory.belongsTo(db.Product, { foreignKey: 'product_id', as: 'product' });
db.Location.hasMany(db.Inventory, { foreignKey: 'location_id', as: 'inventory' });
db.Inventory.belongsTo(db.Location, { foreignKey: 'location_id', as: 'location' });

db.Product.hasMany(db.InventoryTransaction, { foreignKey: 'product_id', as: 'transactions' });
db.InventoryTransaction.belongsTo(db.Product, { foreignKey: 'product_id', as: 'product' });
db.Location.hasMany(db.InventoryTransaction, { foreignKey: 'location_id', as: 'transactions' });
db.InventoryTransaction.belongsTo(db.Location, { foreignKey: 'location_id', as: 'location' });
db.InventoryTransaction.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });

// Purchasing
db.Supplier.hasMany(db.PurchaseOrder, { foreignKey: 'supplier_id', as: 'purchaseOrders' });
db.PurchaseOrder.belongsTo(db.Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
db.PurchaseOrder.belongsTo(db.Location, { foreignKey: 'location_id', as: 'location' });
db.PurchaseOrder.belongsTo(db.User, { foreignKey: 'created_by', as: 'creator' });
db.PurchaseOrder.belongsTo(db.User, { foreignKey: 'approved_by', as: 'approver' });
db.PurchaseOrder.hasMany(db.PurchaseOrderItem, { foreignKey: 'purchase_order_id', as: 'items', onDelete: 'CASCADE' });
db.PurchaseOrderItem.belongsTo(db.PurchaseOrder, { foreignKey: 'purchase_order_id', as: 'purchaseOrder' });
db.PurchaseOrderItem.belongsTo(db.Product, { foreignKey: 'product_id', as: 'product' });

db.PurchaseOrder.hasMany(db.GoodsReceipt, { foreignKey: 'purchase_order_id', as: 'goodsReceipts' });
db.GoodsReceipt.belongsTo(db.PurchaseOrder, { foreignKey: 'purchase_order_id', as: 'purchaseOrder' });
db.GoodsReceipt.belongsTo(db.Location, { foreignKey: 'location_id', as: 'location' });
db.GoodsReceipt.belongsTo(db.User, { foreignKey: 'received_by', as: 'receiver' });
db.GoodsReceipt.hasMany(db.GoodsReceiptItem, { foreignKey: 'goods_receipt_id', as: 'items', onDelete: 'CASCADE' });
db.GoodsReceiptItem.belongsTo(db.GoodsReceipt, { foreignKey: 'goods_receipt_id', as: 'goodsReceipt' });
db.GoodsReceiptItem.belongsTo(db.Product, { foreignKey: 'product_id', as: 'product' });

// Transfers
db.StockTransfer.belongsTo(db.Location, { foreignKey: 'source_location_id', as: 'sourceLocation' });
db.StockTransfer.belongsTo(db.Location, { foreignKey: 'destination_location_id', as: 'destinationLocation' });
db.StockTransfer.belongsTo(db.User, { foreignKey: 'requested_by', as: 'requester' });
db.StockTransfer.belongsTo(db.User, { foreignKey: 'approved_by', as: 'approver' });
db.StockTransfer.belongsTo(db.User, { foreignKey: 'issued_by', as: 'issuer' });
db.StockTransfer.belongsTo(db.User, { foreignKey: 'received_by', as: 'receiver' });
db.StockTransfer.hasMany(db.StockTransferItem, { foreignKey: 'stock_transfer_id', as: 'items', onDelete: 'CASCADE' });
db.StockTransferItem.belongsTo(db.StockTransfer, { foreignKey: 'stock_transfer_id', as: 'stockTransfer' });
db.StockTransferItem.belongsTo(db.Product, { foreignKey: 'product_id', as: 'product' });

// Stock counts / adjustments
db.StockCount.belongsTo(db.Location, { foreignKey: 'location_id', as: 'location' });
db.StockCount.belongsTo(db.User, { foreignKey: 'counted_by', as: 'counter' });
db.StockCount.belongsTo(db.User, { foreignKey: 'approved_by', as: 'approver' });
db.StockCount.hasMany(db.StockCountItem, { foreignKey: 'stock_count_id', as: 'items', onDelete: 'CASCADE' });
db.StockCountItem.belongsTo(db.StockCount, { foreignKey: 'stock_count_id', as: 'stockCount' });
db.StockCountItem.belongsTo(db.Product, { foreignKey: 'product_id', as: 'product' });

db.StockAdjustment.belongsTo(db.Product, { foreignKey: 'product_id', as: 'product' });
db.StockAdjustment.belongsTo(db.Location, { foreignKey: 'location_id', as: 'location' });
db.StockAdjustment.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });

// POS / Sales
db.Sale.belongsTo(db.Location, { foreignKey: 'location_id', as: 'location' });
db.Sale.belongsTo(db.User, { foreignKey: 'cashier_id', as: 'cashier' });
db.Sale.belongsTo(db.Customer, { foreignKey: 'customer_id', as: 'customer' });
db.Sale.belongsTo(db.CashierSession, { foreignKey: 'cashier_session_id', as: 'cashierSession' });
db.Sale.belongsTo(db.User, { foreignKey: 'voided_by', as: 'voider' });
db.Sale.hasMany(db.SaleItem, { foreignKey: 'sale_id', as: 'items', onDelete: 'CASCADE' });
db.SaleItem.belongsTo(db.Sale, { foreignKey: 'sale_id', as: 'sale' });
db.SaleItem.belongsTo(db.Product, { foreignKey: 'product_id', as: 'product' });
db.Sale.hasMany(db.Payment, { foreignKey: 'sale_id', as: 'payments', onDelete: 'CASCADE' });
db.Payment.belongsTo(db.Sale, { foreignKey: 'sale_id', as: 'sale' });

db.Customer.hasMany(db.Sale, { foreignKey: 'customer_id', as: 'sales' });

// Returns
db.Return.belongsTo(db.Sale, { foreignKey: 'sale_id', as: 'sale' });
db.Return.belongsTo(db.User, { foreignKey: 'processed_by', as: 'processor' });
db.Return.hasMany(db.ReturnItem, { foreignKey: 'return_id', as: 'items', onDelete: 'CASCADE' });
db.ReturnItem.belongsTo(db.Return, { foreignKey: 'return_id', as: 'return' });
db.ReturnItem.belongsTo(db.SaleItem, { foreignKey: 'sale_item_id', as: 'saleItem' });
db.ReturnItem.belongsTo(db.Product, { foreignKey: 'product_id', as: 'product' });

// Cashier sessions
db.CashierSession.belongsTo(db.User, { foreignKey: 'cashier_id', as: 'cashier' });
db.CashierSession.belongsTo(db.Location, { foreignKey: 'location_id', as: 'location' });
db.CashierSession.hasMany(db.Sale, { foreignKey: 'cashier_session_id', as: 'sales' });

// Price history / notifications / audit
db.PriceHistory.belongsTo(db.Product, { foreignKey: 'product_id', as: 'product' });
db.PriceHistory.belongsTo(db.User, { foreignKey: 'changed_by', as: 'changedByUser' });

db.Notification.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });

db.AuditLog.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });

module.exports = db;
