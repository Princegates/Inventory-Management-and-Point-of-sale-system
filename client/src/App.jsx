import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import Products from './pages/products/Products';
import Categories from './pages/categories/Categories';
import Suppliers from './pages/suppliers/Suppliers';
import Customers from './pages/customers/Customers';
import Locations from './pages/locations/Locations';
import Users from './pages/users/Users';
import Inventory from './pages/inventory/Inventory';
import PurchaseOrders from './pages/purchases/PurchaseOrders';
import GoodsReceipts from './pages/purchases/GoodsReceipts';
import Transfers from './pages/transfers/Transfers';
import StockCounts from './pages/stockcounts/StockCounts';
import Adjustments from './pages/adjustments/Adjustments';
import Sales from './pages/sales/Sales';
import Reports from './pages/reports/Reports';
import AuditLog from './pages/auditlog/AuditLog';
import POS from './pages/pos/POS';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/pos" element={<ProtectedRoute permission="CREATE_SALE"><POS /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute permission={['CREATE_SALE', 'VIEW_REPORTS']}><Sales /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute permission="VIEW_PRODUCTS"><Products /></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute permission="MANAGE_CATEGORIES"><Categories /></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute permission="MANAGE_SUPPLIERS"><Suppliers /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute permission="MANAGE_CUSTOMERS"><Customers /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute permission="VIEW_INVENTORY"><Inventory /></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<ProtectedRoute permission="CREATE_PURCHASE"><PurchaseOrders /></ProtectedRoute>} />
        <Route path="/goods-receipts" element={<ProtectedRoute permission="RECEIVE_STOCK"><GoodsReceipts /></ProtectedRoute>} />
        <Route path="/transfers" element={<ProtectedRoute permission="REQUEST_TRANSFER"><Transfers /></ProtectedRoute>} />
        <Route path="/stock-counts" element={<ProtectedRoute permission="CONDUCT_STOCK_COUNT"><StockCounts /></ProtectedRoute>} />
        <Route path="/adjustments" element={<ProtectedRoute permission="ADJUST_INVENTORY"><Adjustments /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute permission="VIEW_REPORTS"><Reports /></ProtectedRoute>} />
        <Route path="/locations" element={<ProtectedRoute permission="MANAGE_LOCATIONS"><Locations /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute permission="MANAGE_USERS"><Users /></ProtectedRoute>} />
        <Route path="/audit-log" element={<ProtectedRoute permission="VIEW_AUDIT_LOG"><AuditLog /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}
