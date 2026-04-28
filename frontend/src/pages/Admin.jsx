import { useEffect, useState } from 'react';
import { Users, LayoutDashboard, CreditCard, Wallet, Target, ShieldCheck } from 'lucide-react';
import api from '../lib/api.js';

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-brand-600 dark:text-brand-400" />
      </div>
      <div>
        <p className="text-xs text-neutral-400 dark:text-neutral-500">{label}</p>
        <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{value}</p>
      </div>
    </div>
  );
}

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/users').then(r => {
      setUsers(r.data);
      setLoading(false);
    });
  }, []);

  const totals = users.reduce(
    (acc, u) => ({
      transactions: acc.transactions + u._count.transactions,
      debts: acc.debts + u._count.debts,
      income: acc.income + u._count.income,
      goals: acc.goals + u._count.goals,
    }),
    { transactions: 0, debts: 0, income: 0, goals: 0 }
  );

  if (loading) return <div className="flex items-center justify-center h-64 text-neutral-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Admin</h1>
        <p className="text-sm text-neutral-400">{users.length} registered {users.length === 1 ? 'user' : 'users'}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Users" value={users.length} />
        <StatCard icon={LayoutDashboard} label="Transactions" value={totals.transactions} />
        <StatCard icon={CreditCard} label="Debts" value={totals.debts} />
        <StatCard icon={Wallet} label="Income entries" value={totals.income} />
      </div>

      <div className="card overflow-hidden p-0">
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-100">Users</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 text-left">
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 dark:text-neutral-500">Name</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 dark:text-neutral-500">Email</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 dark:text-neutral-500 text-right">Tx</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 dark:text-neutral-500 text-right">Debts</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 dark:text-neutral-500 text-right">Income</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 dark:text-neutral-500 text-right">Goals</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 dark:text-neutral-500">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-neutral-50 dark:border-neutral-800/60 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-800 dark:text-neutral-100">{u.name}</span>
                      {u.isAdmin && (
                        <ShieldCheck size={13} className="text-brand-500 shrink-0" />
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-neutral-500 dark:text-neutral-400">{u.email}</td>
                  <td className="px-5 py-3.5 text-neutral-700 dark:text-neutral-300 text-right tabular-nums">{u._count.transactions}</td>
                  <td className="px-5 py-3.5 text-neutral-700 dark:text-neutral-300 text-right tabular-nums">{u._count.debts}</td>
                  <td className="px-5 py-3.5 text-neutral-700 dark:text-neutral-300 text-right tabular-nums">{u._count.income}</td>
                  <td className="px-5 py-3.5 text-neutral-700 dark:text-neutral-300 text-right tabular-nums">{u._count.goals}</td>
                  <td className="px-5 py-3.5 text-neutral-400 dark:text-neutral-500 text-xs">
                    {new Date(u.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
