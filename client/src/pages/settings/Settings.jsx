import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import PageHeader from '../../components/PageHeader';
import { useSettings } from '../../context/SettingsContext';

const FIELDS = [
  { key: 'business_name', label: 'Business Name', hint: 'Shown on receipts, the sign-in page and the landing page.' },
  { key: 'business_tagline', label: 'Tagline', hint: 'The short line shown under the business name on the landing page.' },
  { key: 'business_address', label: 'Address' },
  { key: 'business_phone', label: 'Phone' },
  { key: 'business_email', label: 'Email' },
  { key: 'currency_symbol', label: 'Currency Symbol', hint: 'Prefixed to every amount shown in the system, e.g. "GH₵" or "$".' },
  { key: 'currency_code', label: 'Currency Code', hint: 'e.g. GHS, USD, NGN.' },
];

export default function Settings() {
  const { refresh } = useSettings();
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await api.get('/settings');
      setForm(data.settings);
      setLoading(false);
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const { data } = await api.put('/settings', form);
      setForm(data.settings);
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div>
      <PageHeader title="Business Settings" subtitle="Business identity and currency used across receipts, the landing page and reports" />

      <form onSubmit={submit} className="card p-6 max-w-xl space-y-4">
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        {saved && !error && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">Settings saved.</div>}

        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="label">{f.label}</label>
            <input
              className="input"
              value={form[f.key] ?? ''}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
            {f.hint && <p className="text-xs text-slate-400 mt-1">{f.hint}</p>}
          </div>
        ))}

        <div className="flex justify-end pt-2">
          <button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
        </div>
      </form>
    </div>
  );
}
