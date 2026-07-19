import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { isAuthenticated } from '@erp/shared-api-client';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { WarehousesPage } from './pages/WarehousesPage';
import { CustomersPage } from './pages/CustomersPage';

// TODO(M2): promote this to a proper auth context/provider once more routes need shared
// authenticated state (current user, roles, etc.) beyond a simple boolean check.
function ProtectedRoute({ children }: { children: ReactElement }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="warehouses" replace />} />
        <Route path="warehouses" element={<WarehousesPage />} />
        <Route path="customers" element={<CustomersPage />} />
      </Route>
    </Routes>
  );
}

export default App;
