import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';

const empty = { name: '', email: '', password: '', roleId: '', locationIds: [], hasGlobalLocationAccess: false };

export default function Users() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role?.name === 'Super Administrator';
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: '', maxDiscountPercent: 0, permissionIds: [] });
  const [roleError, setRoleError] = useState('');
  const [permissions, setPermissions] = useState([]);

  const loadAll = async () => {
    const [u, r, l, p] = await Promise.all([
      api.get('/users'), api.get('/roles'), api.get('/locations'), api.get('/roles/permissions'),
    ]);
    setUsers(u.data.users); setRoles(r.data.roles); setLocations(l.data.locations); setPermissions(p.data.permissions);
  };
  useEffect(() => { loadAll(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setModalOpen(true); };
  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', roleId: u.role?.id || '', locationIds: u.locations.map((l) => l.id), hasGlobalLocationAccess: u.hasGlobalLocationAccess });
    setModalOpen(true);
  };

  const toggleLocation = (id) => {
    setForm((f) => ({ ...f, locationIds: f.locationIds.includes(id) ? f.locationIds.filter((x) => x !== id) : [...f.locationIds, id] }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form };
      if (editing && !payload.password) delete payload.password;
      if (editing) await api.put(`/users/${editing.id}`, payload);
      else await api.post('/users', payload);
      setModalOpen(false);
      loadAll();
    } catch (err) { setError(apiErrorMessage(err)); }
  };

  const toggleStatus = async (u) => {
    await api.post(`/users/${u.id}/${u.status === 'active' ? 'disable' : 'enable'}`);
    loadAll();
  };

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ name: '', maxDiscountPercent: 0, permissionIds: [] });
    setRoleError('');
    setRoleModalOpen(true);
  };

  const openEditRole = (r) => {
    // Backend enforces this too - this just avoids opening an edit form that would only 403 on
    // save for anyone who isn't a Super Administrator themselves.
    if (r.name === 'Super Administrator' && !isSuperAdmin) return;
    setEditingRole(r);
    setRoleForm({ name: r.name, maxDiscountPercent: r.max_discount_percent, permissionIds: r.permissions.map((p) => p.id) });
    setRoleError('');
    setRoleModalOpen(true);
  };

  const toggleRolePermission = (id) => {
    setRoleForm((f) => {
      const ids = new Set(f.permissionIds);
      if (ids.has(id)) ids.delete(id); else ids.add(id);
      return { ...f, permissionIds: [...ids] };
    });
  };

  const submitRole = async (e) => {
    e.preventDefault();
    setRoleError('');
    try {
      if (editingRole) await api.put(`/roles/${editingRole.id}`, roleForm);
      else await api.post('/roles', roleForm);
      setRoleModalOpen(false);
      loadAll();
    } catch (err) { setRoleError(apiErrorMessage(err)); }
  };

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        subtitle="Manage staff accounts, roles and location access"
        actions={tab === 'users' ? <button className="btn-primary" onClick={openCreate}>+ New User</button> : <button className="btn-primary" onClick={openCreateRole}>+ New Role</button>}
      />

      <div className="flex gap-2 mb-4">
        <button className={`btn-secondary ${tab === 'users' ? 'bg-slate-800 text-white' : ''}`} onClick={() => setTab('users')}>Users</button>
        <button className={`btn-secondary ${tab === 'roles' ? 'bg-slate-800 text-white' : ''}`} onClick={() => setTab('roles')}>Roles</button>
      </div>

      {tab === 'users' && (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Locations</th><th>Status</th><th></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium text-slate-800">{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role?.name}</td>
                  <td>{u.hasGlobalLocationAccess ? 'All locations' : u.locations.map((l) => l.name).join(', ') || '-'}</td>
                  <td><span className={`badge ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{u.status}</span></td>
                  <td className="space-x-2">
                    <button className="text-[var(--brand-600)] text-xs font-medium hover:underline" onClick={() => openEdit(u)}>Edit</button>
                    <button className="text-xs font-medium hover:underline text-slate-600" onClick={() => toggleStatus(u)}>{u.status === 'active' ? 'Disable' : 'Enable'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'roles' && (
        <div className="grid md:grid-cols-2 gap-4">
          {roles.map((r) => {
            const locked = r.name === 'Super Administrator' && !isSuperAdmin;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => openEditRole(r)}
                disabled={locked}
                className={`card p-4 text-left transition-all ${locked ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer'}`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-800">{r.name}</p>
                  <span className="text-xs text-slate-500">Max discount: {r.max_discount_percent}%</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {r.permissions.map((p) => <span key={p.id} className="badge bg-slate-100 text-slate-600 text-[10px]">{p.code}</span>)}
                </div>
                <span className="text-xs block mt-2 text-[var(--brand-600)]">
                  {locked ? 'Only a Super Administrator can edit this role' : 'Edit'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} title={editing ? 'Edit User' : 'New User'} onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          <div><label className="label">Name</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Email</label><input required type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label">{editing ? 'New Password (leave blank to keep)' : 'Password'}</label><input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} /></div>
          <div>
            <label className="label">Role</label>
            <select required className="input" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
              <option value="">Select role</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input type="checkbox" checked={form.hasGlobalLocationAccess} onChange={(e) => setForm({ ...form, hasGlobalLocationAccess: e.target.checked })} />
            Global access to all locations (Head Office)
          </label>
          {!form.hasGlobalLocationAccess && (
            <div>
              <label className="label">Assigned Locations</label>
              <div className="flex flex-wrap gap-2">
                {locations.map((l) => (
                  <label key={l.id} className={`badge cursor-pointer border ${form.locationIds.includes(l.id) ? 'bg-[var(--brand-600)] text-white border-[var(--brand-600)]' : 'bg-white text-slate-600 border-slate-300'}`}>
                    <input type="checkbox" className="hidden" checked={form.locationIds.includes(l.id)} onChange={() => toggleLocation(l.id)} />
                    {l.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary">Save</button>
          </div>
        </form>
      </Modal>

      <Modal open={roleModalOpen} title={editingRole ? `Edit ${editingRole.name}` : 'New Role'} onClose={() => setRoleModalOpen(false)}>
        <form onSubmit={submitRole} className="space-y-3">
          {roleError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{roleError}</div>}
          <div>
            <label className="label">Role Name</label>
            <input
              required
              disabled={editingRole?.name === 'Super Administrator'}
              className="input disabled:bg-slate-50 disabled:text-slate-400"
              value={roleForm.name}
              onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
            />
            {editingRole?.name === 'Super Administrator' && <p className="text-xs text-slate-400 mt-1">This role's name can't be changed.</p>}
          </div>
          <div><label className="label">Max Discount %</label><input type="number" className="input" value={roleForm.maxDiscountPercent} onChange={(e) => setRoleForm({ ...roleForm, maxDiscountPercent: e.target.value })} /></div>
          <div>
            <label className="label">Permissions</label>
            <div className="max-h-48 overflow-y-auto grid grid-cols-2 gap-1">
              {permissions.map((p) => (
                <label key={p.id} className="text-xs flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={roleForm.permissionIds.includes(p.id)}
                    onChange={() => toggleRolePermission(p.id)}
                  />
                  {p.code}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setRoleModalOpen(false)}>Cancel</button>
            <button className="btn-primary">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
