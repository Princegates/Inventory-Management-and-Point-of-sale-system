import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', end: true },
  { to: '/pos', label: 'Point of Sale', permission: 'CREATE_SALE' },
  { to: '/sales', label: 'Sales', permission: ['CREATE_SALE', 'VIEW_REPORTS'] },
  { to: '/products', label: 'Products', permission: 'VIEW_PRODUCTS' },
  { to: '/categories', label: 'Categories', permission: 'MANAGE_CATEGORIES' },
  { to: '/brands', label: 'Brands', permission: 'MANAGE_CATEGORIES' },
  { to: '/suppliers', label: 'Suppliers', permission: 'MANAGE_SUPPLIERS' },
  { to: '/customers', label: 'Customers', permission: 'MANAGE_CUSTOMERS' },
  { to: '/inventory', label: 'Inventory', permission: 'VIEW_INVENTORY' },
  { to: '/purchase-orders', label: 'Purchase Orders', permission: 'CREATE_PURCHASE' },
  { to: '/goods-receipts', label: 'Goods Receiving', permission: 'RECEIVE_STOCK' },
  { to: '/transfers', label: 'Stock Transfers', permission: 'REQUEST_TRANSFER' },
  { to: '/stock-counts', label: 'Stock Counts', permission: 'CONDUCT_STOCK_COUNT' },
  { to: '/adjustments', label: 'Stock Adjustments', permission: 'ADJUST_INVENTORY' },
  { to: '/reports', label: 'Reports', permission: 'VIEW_REPORTS' },
  { to: '/locations', label: 'Locations', permission: 'MANAGE_LOCATIONS' },
  { to: '/users', label: 'Users & Roles', permission: 'MANAGE_USERS' },
  { to: '/audit-log', label: 'Audit Log', permission: 'VIEW_AUDIT_LOG' },
  { to: '/settings', label: 'Business Settings', permission: 'MANAGE_SYSTEM_SETTINGS' },
];

export default function Layout() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const items = NAV.filter((item) => !item.permission || hasPermission(...(Array.isArray(item.permission) ? item.permission : [item.permission])));

  return (
    <div className="flex h-screen bg-slate-100">
      <aside className="w-60 shrink-0 bg-slate-900 text-slate-200 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-800">
          <p className="font-semibold text-white text-sm leading-tight">Anknovate</p>
          <p className="text-xs text-slate-400">Inventory &amp; POS System</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm rounded-md mx-2 my-0.5 ${isActive ? 'bg-[var(--brand-600)] text-white' : 'text-slate-300 hover:bg-slate-800'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
          <div />
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-medium text-slate-800">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.role?.name}</p>
            </div>
            <button
              className="btn-secondary text-xs"
              onClick={async () => { await logout(); navigate('/login'); }}
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
