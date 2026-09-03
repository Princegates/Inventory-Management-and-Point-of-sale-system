// Set once at startup by SettingsContext, so every existing formatMoney() call site picks up
// the business's configured currency symbol without needing to be touched individually.
let currencySymbol = '';

export function setCurrencySymbol(symbol) {
  currencySymbol = symbol || '';
}

export function formatMoney(value) {
  const n = Number(value ?? 0);
  const formatted = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currencySymbol ? `${currencySymbol} ${formatted}` : formatted;
}

export function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}
