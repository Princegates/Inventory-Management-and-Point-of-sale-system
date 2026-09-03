import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, permission }) {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex items-center justify-center h-screen text-slate-500">Loading...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (permission && !hasPermission(...(Array.isArray(permission) ? permission : [permission]))) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-2 text-slate-500">
        <p className="text-lg font-medium">Access denied</p>
        <p className="text-sm">You do not have permission to view this page.</p>
      </div>
    );
  }
  return children;
}
