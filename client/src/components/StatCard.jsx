export default function StatCard({ label, value, sub, tone = 'default' }) {
  const toneClass = {
    default: 'text-slate-900',
    danger: 'text-red-600',
    warning: 'text-amber-600',
    success: 'text-emerald-600',
  }[tone];

  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${toneClass}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}
