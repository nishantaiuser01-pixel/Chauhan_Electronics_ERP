import { useApi } from '../hooks/useApi';
import { useState, useEffect } from 'react';
import { Users, AlertCircle } from 'lucide-react';

interface Customer {
  customer_id: number;
  name: string;
  phone: string;
  tier: string;
  current_balance: number;
  credit_limit: number;
}

export default function Customers() {
  const { call } = useApi();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    call<{ success: boolean; customers: Customer[] }>('/api/customers')
      .then(d => setCustomers(d.customers ?? []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex h-full items-center justify-center text-amber-400 font-mono animate-pulse text-sm">
      LOADING CUSTOMERS...
    </div>
  );

  if (error) return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-red-400 font-mono text-sm px-8 text-center">
      <AlertCircle size={24} />
      <span>{error}</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-zinc-400">Customers</h2>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-800">
        {customers.map(c => (
          <div key={c.customer_id} className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
              <Users size={16} className="text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-100 truncate">{c.name}</p>
              <p className="text-xs text-zinc-500 font-mono">{c.tier} · {c.phone}</p>
            </div>
            {c.current_balance > 0 && (
              <span className="text-xs text-red-400 font-mono font-bold shrink-0">
                ₹{(c.current_balance / 100).toFixed(0)} due
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
