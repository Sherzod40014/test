import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@erp/shared-ui-kit';
import { createCustomer, listCustomers } from '@erp/shared-api-client';
import type { Customer } from '@erp/shared-api-client';

const PAGE = 1;
const PAGE_SIZE = 25;

export function CustomersPage() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fetchCustomers = () => {
    setIsLoading(true);
    setError('');
    return listCustomers(PAGE, PAGE_SIZE)
      .then(({ data }) => setCustomers(data))
      .catch(() => setError('Failed to load customers'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);
    try {
      await createCustomer({
        name,
        phone: phone || undefined,
        contactPerson: contactPerson || undefined,
      });
      setName('');
      setPhone('');
      setContactPerson('');
      await fetchCustomers();
    } catch {
      setSubmitError('Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{t('nav.customers')}</h2>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          marginBottom: 24,
          padding: 16,
          borderRadius: 8,
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
        }}
      >
        <div>
          <label htmlFor="customerName" style={{ display: 'block', marginBottom: 4 }}>
            Name
          </label>
          <input
            id="customerName"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
          />
        </div>
        <div>
          <label htmlFor="customerPhone" style={{ display: 'block', marginBottom: 4 }}>
            Phone
          </label>
          <input
            id="customerPhone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
          />
        </div>
        <div>
          <label htmlFor="customerContactPerson" style={{ display: 'block', marginBottom: 4 }}>
            Contact person
          </label>
          <input
            id="customerContactPerson"
            value={contactPerson}
            onChange={(event) => setContactPerson(event.target.value)}
            style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
          />
        </div>
        <Button type="submit" disabled={isSubmitting} style={{ minHeight: 40, padding: '8px 20px' }}>
          {isSubmitting ? '…' : 'Add customer'}
        </Button>
        {submitError && (
          <p role="alert" style={{ color: '#dc2626', margin: 0, width: '100%' }}>
            {submitError}
          </p>
        )}
      </form>

      {isLoading && <p>...</p>}
      {!isLoading && error && <p style={{ color: '#dc2626' }}>{error}</p>}
      {!isLoading && !error && customers.length === 0 && <p>No customers found.</p>}

      {!isLoading && !error && customers.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '8px 12px' }}>GS Code</th>
              <th style={{ padding: '8px 12px' }}>Name</th>
              <th style={{ padding: '8px 12px' }}>Phone</th>
              <th style={{ padding: '8px 12px' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{customer.gsCode}</td>
                <td style={{ padding: '8px 12px' }}>{customer.name}</td>
                <td style={{ padding: '8px 12px' }}>{customer.phone || '—'}</td>
                <td style={{ padding: '8px 12px' }}>
                  {new Date(customer.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default CustomersPage;
