import { useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import Modal from '../../components/Modal';
import { formatMoney } from '../../utils/format';

export default function CloseSessionModal({ session, open, onClose, onClosed }) {
  const [actualCash, setActualCash] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post(`/cashier-sessions/${session.id}/close`, { actualCash: Number(actualCash) });
      setResult(data.cashierSession);
    } catch (err) { setError(apiErrorMessage(err)); }
  };

  return (
    <Modal open={open} title="Close POS Session" onClose={onClose}>
      {!result ? (
        <form onSubmit={submit} className="space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          <p className="text-sm text-slate-500">Opening balance: {formatMoney(session.opening_balance)}</p>
          <div>
            <label className="label">Actual Cash Counted</label>
            <input required type="number" step="0.01" className="input" value={actualCash} onChange={(e) => setActualCash(e.target.value)} autoFocus />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary">Close Session</button>
          </div>
        </form>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Expected Cash</span><span>{formatMoney(result.expected_cash)}</span></div>
          <div className="flex justify-between"><span>Actual Cash</span><span>{formatMoney(result.actual_cash)}</span></div>
          <div className={`flex justify-between font-semibold ${Number(result.variance) === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            <span>Variance</span><span>{formatMoney(result.variance)}</span>
          </div>
          <button className="btn-primary w-full mt-3" onClick={onClosed}>Done</button>
        </div>
      )}
    </Modal>
  );
}
