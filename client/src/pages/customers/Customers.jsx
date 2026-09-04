import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';

const empty = { name: '', phone: '', email: '', address: '' };
const emptyEmailForm = { subject: '', message: '' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const [emailCustomer, setEmailCustomer] = useState(null);
  const [emailForm, setEmailForm] = useState(emptyEmailForm);
  const [emailError, setEmailError] = useState('');
  const [emailResult, setEmailResult] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const load = async (query = '') => {
    const { data } = await api.get('/customers', { params: { q: query } });
    setCustomers(data.customers);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/customers', form);
      setForm(empty);
      setModalOpen(false);
      load(q);
    } catch (err) { setError(apiErrorMessage(err)); }
  };

  const openEmailModal = (customer) => {
    setEmailCustomer(customer);
    setEmailForm(emptyEmailForm);
    setEmailError('');
    setEmailResult(null);
  };

  const submitEmail = async (e) => {
    e.preventDefault();
    setEmailError('');
    setEmailResult(null);
    setSendingEmail(true);
    try {
      const { data } = await api.post(`/customers/${emailCustomer.id}/send-email`, emailForm);
      setEmailForm(emptyEmailForm);
      setEmailResult(data.emailSent ? 'sent' : 'not-configured');
    } catch (err) { setEmailError(apiErrorMessage(err)); }
    finally { setSendingEmail(false); }
  };

  return (
    <div>
      <PageHeader title="Customers" subtitle="Customer records (optional for cash sales)" actions={<button className="btn-primary" onClick={() => setModalOpen(true)}>+ New Customer</button>} />

      <form onSubmit={(e) => { e.preventDefault(); load(q); }} className="flex gap-2 mb-4">
        <input className="input max-w-xs" placeholder="Search by name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-secondary">Search</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Loyalty Points</th><th></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="font-medium text-slate-800">{c.name}</td>
                <td>{c.phone || '-'}</td>
                <td>{c.email || '-'}</td>
                <td>{c.loyalty_points}</td>
                <td className="text-right">
                  <button
                    className="btn-secondary text-xs"
                    disabled={!c.email}
                    title={c.email ? 'Send this customer an email' : 'No email address on file'}
                    onClick={() => openEmailModal(c)}
                  >
                    Email
                  </button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-6">No customers found</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} title="New Customer" onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          <div><label className="label">Name</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label className="label">Email</label><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label">Address</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary">Save</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!emailCustomer} title={`Email ${emailCustomer?.name || ''}`} onClose={() => setEmailCustomer(null)}>
        <form onSubmit={submitEmail} className="space-y-3">
          {emailError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{emailError}</div>}
          {emailResult === 'sent' && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">Email sent to {emailCustomer?.email}.</div>}
          {emailResult === 'not-configured' && <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">Message logged, but email sending isn't configured on this server yet (no RESEND_API_KEY) - it wasn't actually delivered.</div>}
          <p className="text-xs text-slate-400">To: {emailCustomer?.email}</p>
          <div><label className="label">Subject</label><input required className="input" value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} /></div>
          <div>
            <label className="label">Message</label>
            <textarea required rows={6} className="input" value={emailForm.message} onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setEmailCustomer(null)}>Close</button>
            <button className="btn-primary" disabled={sendingEmail}>{sendingEmail ? 'Sending...' : 'Send'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
