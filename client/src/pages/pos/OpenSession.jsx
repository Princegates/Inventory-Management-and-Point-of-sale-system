import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function OpenSession({ onOpened }) {
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState('');
  const [terminalId, setTerminalId] = useState('POS-01');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const list = user?.hasGlobalLocationAccess
      ? api.get('/locations', { params: { type: 'shop' } })
      : Promise.resolve({ data: { locations: user.locations.filter((l) => l.type === 'shop' || l.type === 'branch') } });
    list.then((r) => setLocations(r.data.locations));
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/cashier-sessions/open', { locationId, terminalId, openingBalance: Number(openingBalance) });
      onOpened();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-16">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Open POS Session</h2>
        <p className="text-sm text-slate-500 mb-4">Start your shift by opening a cashier session.</p>
        <form onSubmit={submit} className="space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          <div>
            <label className="label">Shop</label>
            <select required className="input" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">Select shop</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Terminal ID</label>
            <input className="input" value={terminalId} onChange={(e) => setTerminalId(e.target.value)} />
          </div>
          <div>
            <label className="label">Opening Cash Balance</label>
            <input type="number" step="0.01" className="input" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
          </div>
          <button disabled={loading} className="btn-primary w-full">{loading ? 'Opening...' : 'Open Session'}</button>
        </form>
      </div>
    </div>
  );
}
