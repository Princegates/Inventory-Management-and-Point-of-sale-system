// Ten selectable brand colour skins for the app. Every button, active nav link, focus ring
// and accent badge is styled with the CSS custom properties in styles/index.css (--brand-50
// ... --brand-700), so switching skins here repaints the whole app without touching a single
// component.
export const COLOR_SKINS = [
  { key: 'indigo', name: 'Indigo', swatch: '#4f46e5', vars: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', glow: '99, 102, 241' } },
  { key: 'blue', name: 'Ocean Blue', swatch: '#2563eb', vars: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', glow: '59, 130, 246' } },
  { key: 'emerald', name: 'Emerald', swatch: '#059669', vars: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', glow: '16, 185, 129' } },
  { key: 'rose', name: 'Rose', swatch: '#e11d48', vars: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', glow: '244, 63, 94' } },
  { key: 'amber', name: 'Amber', swatch: '#d97706', vars: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', glow: '245, 158, 11' } },
  { key: 'violet', name: 'Violet', swatch: '#7c3aed', vars: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', glow: '139, 92, 246' } },
  { key: 'teal', name: 'Teal', swatch: '#0d9488', vars: { 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', glow: '20, 184, 166' } },
  { key: 'pink', name: 'Pink', swatch: '#db2777', vars: { 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', glow: '236, 72, 153' } },
  { key: 'orange', name: 'Orange', swatch: '#ea580c', vars: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', glow: '249, 115, 22' } },
  { key: 'cyan', name: 'Cyan', swatch: '#0891b2', vars: { 50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', glow: '6, 182, 212' } },
];

export const DEFAULT_COLOR_SKIN = 'indigo';

export function applyColorSkin(key) {
  const skin = COLOR_SKINS.find((s) => s.key === key) || COLOR_SKINS[0];
  const root = document.documentElement.style;
  root.setProperty('--brand-50', skin.vars[50]);
  root.setProperty('--brand-100', skin.vars[100]);
  root.setProperty('--brand-200', skin.vars[200]);
  root.setProperty('--brand-400', skin.vars[400]);
  root.setProperty('--brand-500', skin.vars[500]);
  root.setProperty('--brand-600', skin.vars[600]);
  root.setProperty('--brand-700', skin.vars[700]);
  root.setProperty('--brand-glow', skin.vars.glow);
}
