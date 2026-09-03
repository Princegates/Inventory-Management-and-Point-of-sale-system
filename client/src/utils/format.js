export function formatMoney(value) {
  const n = Number(value ?? 0);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}
