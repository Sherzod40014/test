import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listWarehouses } from '@erp/shared-api-client';
import type { Warehouse } from '@erp/shared-api-client';

export function WarehousesPage() {
  const { t } = useTranslation();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    listWarehouses()
      .then((data) => {
        if (!cancelled) {
          setWarehouses(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load warehouses');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{t('nav.warehouse')}</h2>

      {isLoading && <p>...</p>}
      {!isLoading && error && <p style={{ color: '#dc2626' }}>{error}</p>}
      {!isLoading && !error && warehouses.length === 0 && <p>No warehouses found.</p>}

      {!isLoading && !error && warehouses.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '8px 12px' }}>Code</th>
              <th style={{ padding: '8px 12px' }}>Name</th>
              <th style={{ padding: '8px 12px' }}>Country</th>
              <th style={{ padding: '8px 12px' }}>Timezone</th>
              <th style={{ padding: '8px 12px' }}>Active</th>
            </tr>
          </thead>
          <tbody>
            {warehouses.map((warehouse) => (
              <tr key={warehouse.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px' }}>{warehouse.code}</td>
                <td style={{ padding: '8px 12px' }}>{warehouse.name}</td>
                <td style={{ padding: '8px 12px' }}>{warehouse.country}</td>
                <td style={{ padding: '8px 12px' }}>{warehouse.timezone}</td>
                <td style={{ padding: '8px 12px' }}>{warehouse.isActive ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default WarehousesPage;
