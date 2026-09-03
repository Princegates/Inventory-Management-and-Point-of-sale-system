import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import api, { apiErrorMessage } from '../api/client';

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

const emptyPasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function Layout() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const items = NAV.filter((item) => !item.permission || hasPermission(...(Array.isArray(item.permission) ? item.permission : [item.permission])));

  const openPasswordModal = () => {
    setPasswordForm(emptyPasswordForm);
    setPasswordError('');
    setPasswordSaved(false);
    setPasswordModalOpen(true);
  };

  const submitPasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSaved(false);
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm(emptyPasswordForm);
      setPasswordSaved(true);
    } catch (err) {
      setPasswordError(apiErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-60 shrink-0 bg-slate-900 text-slate-200 flex flex-col transform transition-transform duration-200 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-4 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <p className="font-semibold text-white text-sm leading-tight">Anknovate</p>
            <p className="text-xs text-slate-400">Inventory &amp; POS System</p>
          </div>
          <button className="md:hidden text-slate-400 hover:text-white p-1" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
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
        <header className="min-h-14 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-4 py-2 shrink-0 gap-2">
          <button className="md:hidden text-slate-600 p-1" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right leading-tight hidden sm:block">
              <p className="text-sm font-medium text-slate-800">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.role?.name}</p>
            </div>
            <button className="btn-secondary text-xs whitespace-nowrap px-2 sm:px-3" onClick={openPasswordModal}>
              <span className="hidden sm:inline">Change Password</span>
              <span className="sm:hidden">Password</span>
            </button>
            <button
              className="btn-secondary text-xs whitespace-nowrap px-2 sm:px-3"
              onClick={async () => { await logout(); navigate('/login'); }}
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      <Modal open={passwordModalOpen} title="Change Password" onClose={() => setPasswordModalOpen(false)}>
        <form onSubmit={submitPasswordChange} className="space-y-3">
          {passwordError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{passwordError}</div>}
          {passwordSaved && !passwordError && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">Password changed.</div>}
          <div>
            <label className="label">Current Password</label>
            <input required type="password" className="input" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} />
          </div>
          <div>
            <label className="label">New Password</label>
            <input required type="password" minLength={8} className="input" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
            <p className="text-xs text-slate-400 mt-1">At least 8 characters.</p>
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input required type="password" minLength={8} className="input" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setPasswordModalOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={savingPassword}>{savingPassword ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
