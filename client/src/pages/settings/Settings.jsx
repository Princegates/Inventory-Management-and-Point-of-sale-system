import { useEffect, useRef, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import PageHeader from '../../components/PageHeader';
import { useSettings } from '../../context/SettingsContext';
import { COLOR_SKINS, applyColorSkin } from '../../utils/colorSkins';

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
  const { color_skin: persistedSkin, refresh } = useSettings();
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const savedSkinRef = useRef(persistedSkin);

  useEffect(() => {
    (async () => {
      const { data } = await api.get('/settings');
      setForm(data.settings);
      savedSkinRef.current = data.settings.color_skin;
      setLoading(false);
    })();
  }, []);

  // Revert an unsaved swatch preview back to the persisted skin when leaving this page.
  useEffect(() => () => applyColorSkin(savedSkinRef.current), []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const { data } = await api.put('/settings', form);
      setForm(data.settings);
      savedSkinRef.current = data.settings.color_skin;
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const pickSkin = (key) => {
    setForm({ ...form, color_skin: key });
    applyColorSkin(key); // instant preview - persists once "Save Settings" is clicked
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

        <div>
          <label className="label">Colour Skin</label>
          <div className="grid grid-cols-5 gap-3">
            {COLOR_SKINS.map((skin) => (
              <button
                key={skin.key}
                type="button"
                onClick={() => pickSkin(skin.key)}
                title={skin.name}
                className={`flex flex-col items-center gap-1.5 rounded-md border px-2 py-2 transition-colors ${form.color_skin === skin.key ? 'border-[var(--brand-600)] bg-[var(--brand-50)]' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <span
                  className="w-6 h-6 rounded-full border border-black/10 shadow-sm"
                  style={{ backgroundColor: skin.swatch }}
                />
                <span className="text-[11px] text-slate-600 leading-tight text-center">{skin.name}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">Sets the accent colour used for buttons, links and highlights across the whole app. Preview updates immediately; click Save to make it permanent for everyone.</p>
        </div>

        <div className="flex justify-end pt-2">
          <button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
        </div>
      </form>
    </div>
  );
}
