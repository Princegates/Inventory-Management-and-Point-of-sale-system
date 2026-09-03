import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiErrorMessage } from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setResult(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="card w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <h1 className="text-lg font-semibold text-slate-900">Forgot Password</h1>
          <p className="text-sm text-slate-500 mt-1">We'll send you a link to reset it</p>
        </div>

        {!result ? (
          <form onSubmit={submit} className="space-y-4">
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
            <div>
              <label className="label">Email</label>
              <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
              If an account exists for that email, a reset link has been sent.
            </div>
            {result.emailSent === false && result.resetToken && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 space-y-1">
                <p className="font-medium">Email sending isn't configured on this server.</p>
                <p>For local testing, use this link directly:</p>
                <Link className="text-indigo-600 underline break-all" to={`/reset-password?token=${result.resetToken}`}>
                  /reset-password?token={result.resetToken}
                </Link>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-sm text-slate-500 mt-4">
          <Link to="/login" className="text-indigo-600 hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
