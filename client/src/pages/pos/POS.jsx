import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import OpenSession from './OpenSession';
import POSScreen from './POSScreen';

export default function POS() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = none open

  const loadSession = useCallback(async () => {
    const { data } = await api.get('/cashier-sessions/current');
    setSession(data.cashierSession);
  }, []);

  useEffect(() => { loadSession(); }, [loadSession]);

  if (session === undefined) return <p className="text-slate-500 text-sm">Loading POS...</p>;
  if (!session) return <OpenSession onOpened={loadSession} />;
  return <POSScreen session={session} onSessionClosed={loadSession} />;
}
