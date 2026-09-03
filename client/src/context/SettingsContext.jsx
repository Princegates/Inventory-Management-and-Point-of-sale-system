import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { setCurrencySymbol } from '../utils/format';
import { applyColorSkin, DEFAULT_COLOR_SKIN } from '../utils/colorSkins';

const SettingsContext = createContext(null);

const DEFAULTS = {
  business_name: 'SunZan',
  business_tagline: 'Mobile Phone Accessories · Inventory & Point of Sale',
  currency_symbol: 'GH₵',
  currency_code: 'GHS',
  color_skin: DEFAULT_COLOR_SKIN,
};

// Fetches the public subset of business settings (no auth required) so the Landing page,
// receipts, and money formatting everywhere reflect the admin-configured business identity
// instead of hardcoded values.
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/settings/public');
      setSettings({ ...DEFAULTS, ...data.settings });
      setCurrencySymbol(data.settings.currency_symbol);
      applyColorSkin(data.settings.color_skin);
    } catch {
      setCurrencySymbol(DEFAULTS.currency_symbol);
      applyColorSkin(DEFAULTS.color_skin);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const value = useMemo(() => ({ ...settings, loading, refresh: load }), [settings, loading, load]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
