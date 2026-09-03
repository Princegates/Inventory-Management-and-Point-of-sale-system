import { useEffect, useState } from 'react';
import api from '../../api/client';
import PageHeader from '../../components/PageHeader';
import { formatDateTime } from '../../utils/format';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get('/audit-logs', { params: { pageSize: 100 } }).then((r) => setLogs(r.data.auditLogs));
  }, []);

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Read-only trail of sensitive actions across the system" />
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Date</th><th>User</th><th>Action</th><th>Entity</th><th>Reference</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{formatDateTime(l.createdAt)}</td>
                <td>{l.user?.name || 'System'}</td>
                <td className="font-medium text-slate-800">{l.action}</td>
                <td>{l.entity_type ? `${l.entity_type} #${l.entity_id}` : '-'}</td>
                <td>{l.reference_transaction || '-'}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-6">No audit entries yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
