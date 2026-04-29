import { useEffect, useState } from 'react';
import { Trash2, Pencil, CreditCard, ShoppingBag, Plus, Target, Wallet, TrendingUp } from 'lucide-react';
import api from '../lib/api.js';
import { formatPHP, formatDate } from '../lib/utils.js';
import { useMonth } from '../lib/MonthContext.jsx';
import EditTransactionModal from '../components/EditTransactionModal.jsx';

const PM_TYPE_LABELS = { CREDIT_CARD: 'Credit Card', CASH: 'Cash', BANK_ACCOUNT: 'Bank / Debit', E_WALLET: 'E-Wallet' };

export default function Transactions() {
  const { month } = useMonth();
  const [transactions, setTransactions] = useState([]);
  const [debtPayments, setDebtPayments] = useState([]);
  const [goalContributions, setGoalContributions] = useState([]);
  const [incomeEntries, setIncomeEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [debts, setDebts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTx, setEditingTx] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [newEntry, setNewEntry] = useState({ type: 'expense', categoryId: '', debtId: '', goalId: '', paymentMethodId: '', description: '', date: new Date().toISOString().slice(0, 10), amount: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [txs, cats, ds, gs, pms, income] = await Promise.all([
      api.get('/transactions', { params: { month } }),
      api.get('/budget/categories'),
      api.get('/debts'),
      api.get('/goals'),
      api.get('/payment-methods'),
      api.get('/income', { params: { month } }),
    ]);

    const [y, m] = month.split('-').map(Number);
    const start = new Date(y, m - 1, 1).toISOString();
    const end = new Date(y, m, 1).toISOString();

    const payments = await Promise.all(
      ds.data.map(d =>
        api.get(`/debts/${d.id}/payments`).then(r =>
          r.data
            .filter(p => p.date >= start && p.date < end)
            .map(p => ({ ...p, debtName: d.name, debtId: d.id, _type: 'payment' }))
        )
      )
    );

    const contribsRes = await api.get('/goals/contributions', { params: { month } });

    setTransactions(txs.data.map(t => ({ ...t, _type: 'expense' })));
    setDebtPayments(payments.flat());
    setGoalContributions(contribsRes.data.map(c => ({ ...c, _type: 'goal' })));
    setIncomeEntries(income.data.map(e => ({ ...e, _type: 'income' })));
    setCategories(cats.data);
    setDebts(ds.data);
    setGoals(gs.data);
    setPaymentMethods(pms.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [month]);

  async function editTx(id, form) {
    await api.put(`/transactions/${id}`, form);
    load();
  }

  async function deleteTx(id) {
    if (!confirm('Delete this expense?')) return;
    await api.delete(`/transactions/${id}`);
    load();
  }

  async function deletePayment(entry) {
    if (!confirm('Delete this debt payment? The balance will be reversed.')) return;
    await api.delete(`/debts/${entry.debtId}/payments/${entry.id}`);
    load();
  }

  async function submitNewEntry(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (newEntry.type === 'expense') {
        await api.post('/transactions', {
          categoryId: newEntry.categoryId || null,
          paymentMethodId: newEntry.paymentMethodId || null,
          amount: newEntry.amount,
          description: newEntry.description,
          date: newEntry.date,
        });
      } else if (newEntry.type === 'payment') {
        await api.post(`/debts/${newEntry.debtId}/payment`, {
          amount: newEntry.amount,
          date: newEntry.date,
          notes: newEntry.description,
        });
      } else if (newEntry.type === 'goal') {
        await api.post(`/goals/${newEntry.goalId}/contribution`, {
          amount: newEntry.amount,
          date: newEntry.date,
          notes: newEntry.description,
        });
      }
      setNewEntry({ type: 'expense', categoryId: '', debtId: '', goalId: '', paymentMethodId: '', description: '', date: new Date().toISOString().slice(0, 10), amount: '' });
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  const allEntries = [...transactions, ...debtPayments, ...goalContributions, ...incomeEntries]
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const filtered =
    filter === 'expenses' ? transactions :
    filter === 'payments' ? debtPayments :
    filter === 'goals'    ? goalContributions :
    filter === 'income'   ? incomeEntries :
    allEntries;

  const totalExpenses   = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const totalPayments   = debtPayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalGoals      = goalContributions.reduce((s, c) => s + Number(c.amount), 0);
  const totalIncome     = incomeEntries.reduce((s, e) => s + Number(e.amountPhp), 0);

  function entryBadge(entry, size = 11) {
    if (entry._type === 'income') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300">
          <TrendingUp size={size} />
          {entry.type === 'REGULAR' ? 'Regular' : 'Other'}
        </span>
      );
    }
    if (entry._type === 'expense') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
          <ShoppingBag size={size} />
          {entry.category?.name || 'Expense'}
        </span>
      );
    }
    if (entry._type === 'payment') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300">
          <CreditCard size={size} />
          {entry.debtName}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
        <Target size={size} />
        {entry.goal?.name || 'Goal'}
      </span>
    );
  }

  function entryDescription(entry) {
    if (entry._type === 'income')  return entry.description || (entry.type === 'REGULAR' ? 'Regular income' : 'Commission');
    if (entry._type === 'expense') return entry.description || entry.category?.name || 'Expense';
    if (entry._type === 'payment') return entry.notes || 'Debt payment';
    return entry.notes || 'Goal contribution';
  }

  function entryAmount(entry) {
    if (entry._type === 'income') return `+${formatPHP(entry.amountPhp)}`;
    return formatPHP(entry.amount);
  }

  function entryAmountClass(entry) {
    if (entry._type === 'income')  return 'text-green-600 dark:text-green-400';
    if (entry._type === 'payment') return 'text-brand-600 dark:text-brand-400';
    if (entry._type === 'goal')    return 'text-emerald-600 dark:text-emerald-400';
    return 'text-neutral-800 dark:text-neutral-100';
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-neutral-400">Loading…</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Transactions</h1>
        <p className="text-sm text-neutral-400 dark:text-neutral-400">
          <span className="text-green-600 dark:text-green-400">+{formatPHP(totalIncome)}</span>
          {' · '}
          {formatPHP(totalExpenses)} expenses
          {' · '}
          {formatPHP(totalPayments)} debt payments
          {totalGoals > 0 && <> · {formatPHP(totalGoals)} goal savings</>}
        </p>
        <button
          onClick={() => { setShowForm(s => !s); setNewEntry({ type: 'expense', categoryId: '', debtId: '', goalId: '', paymentMethodId: '', description: '', date: new Date().toISOString().slice(0, 10), amount: '' }); }}
          className="btn-primary mt-3"
        >
          <Plus size={15} /> Add entry
        </button>
      </div>

      {/* Add entry form */}
      {showForm && (
        <div className="card">
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-4">New entry</h2>
          <form onSubmit={submitNewEntry} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Type</label>
                <select
                  className="input"
                  value={newEntry.type}
                  onChange={e => setNewEntry(r => ({ ...r, type: e.target.value, categoryId: '', debtId: '', goalId: '', paymentMethodId: '' }))}
                >
                  <option value="expense">Expense</option>
                  <option value="payment">Debt Payment</option>
                  <option value="goal">Goal Contribution</option>
                </select>
              </div>
              <div>
                {newEntry.type === 'expense' ? (
                  <>
                    <label className="label">Category</label>
                    <select className="input" value={newEntry.categoryId} onChange={e => setNewEntry(r => ({ ...r, categoryId: e.target.value }))}>
                      <option value="" disabled>Select a category</option>
                      <option value="">— No category —</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                  </>
                ) : newEntry.type === 'payment' ? (
                  <>
                    <label className="label">Debt</label>
                    <select className="input" value={newEntry.debtId} onChange={e => setNewEntry(r => ({ ...r, debtId: e.target.value }))} required>
                      <option value="" disabled>Select a debt</option>
                      {debts.filter(d => d.status === 'ACTIVE').map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </>
                ) : (
                  <>
                    <label className="label">Goal</label>
                    <select className="input" value={newEntry.goalId} onChange={e => setNewEntry(r => ({ ...r, goalId: e.target.value }))} required>
                      <option value="" disabled>Select a goal</option>
                      {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </>
                )}
              </div>
            </div>

            {/* Paid with — expenses only */}
            {newEntry.type === 'expense' && paymentMethods.length > 0 && (
              <div>
                <label className="label">Paid with <span className="text-neutral-400 font-normal normal-case">(optional)</span></label>
                <select className="input" value={newEntry.paymentMethodId} onChange={e => setNewEntry(r => ({ ...r, paymentMethodId: e.target.value }))}>
                  <option value="">— Not specified —</option>
                  {paymentMethods.map(pm => (
                    <option key={pm.id} value={pm.id}>{pm.name} ({PM_TYPE_LABELS[pm.type] ?? pm.type})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Amount (₱)</label>
                <input
                  className="input"
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={newEntry.amount}
                  onChange={e => setNewEntry(r => ({ ...r, amount: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={newEntry.date} onChange={e => setNewEntry(r => ({ ...r, date: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <input className="input"
                placeholder={newEntry.type === 'expense' ? 'e.g. Grocery run' : newEntry.type === 'goal' ? 'e.g. Monthly contribution' : 'e.g. Extra payment'}
                value={newEntry.description}
                onChange={e => setNewEntry(r => ({ ...r, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          ['all', 'All'],
          ['income', 'Income'],
          ['expenses', 'Expenses'],
          ['payments', 'Debt Payments'],
          ['goals', 'Goal Savings'],
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
              filter === val
                ? 'bg-brand-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Mobile list */}
      <div className="sm:hidden card p-0 divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 dark:text-neutral-500">
            <p className="text-sm font-medium">No entries yet</p>
            <p className="text-xs mt-1">Use "+ Add entry" above to log a transaction.</p>
          </div>
        ) : filtered.map(entry => (
          <div key={`${entry._type}-${entry.id}`} className="px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              {entryBadge(entry, 11)}
              <span className={`text-sm font-semibold shrink-0 ${entryAmountClass(entry)}`}>
                {entryAmount(entry)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 mt-1">
              <p className="text-sm text-neutral-800 dark:text-neutral-100 truncate">{entryDescription(entry)}</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-400 shrink-0">{formatDate(entry.date)}</p>
            </div>
            {entry._type === 'expense' && entry.paymentMethod && (
              <p className="text-xs text-neutral-400 dark:text-neutral-400 mt-0.5">via {entry.paymentMethod.name}</p>
            )}
            {(entry._type === 'expense' || entry._type === 'payment') && (
              <div className="flex items-center gap-2 mt-2">
                {entry._type === 'expense' && (
                  <button onClick={() => setEditingTx(entry)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                    <Pencil size={14} /> Edit
                  </button>
                )}
                <button
                  onClick={() => entry._type === 'expense' ? deleteTx(entry.id) : deletePayment(entry)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-neutral-500 dark:text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100 dark:border-neutral-700">
              <th className="text-left text-xs font-medium text-neutral-400 dark:text-neutral-400 px-4 py-3 w-40">Type</th>
              <th className="text-left text-xs font-medium text-neutral-400 dark:text-neutral-400 px-4 py-3">Description</th>
              <th className="text-left text-xs font-medium text-neutral-400 dark:text-neutral-400 px-4 py-3 w-28">Paid with</th>
              <th className="text-left text-xs font-medium text-neutral-400 dark:text-neutral-400 px-4 py-3 w-32">Date</th>
              <th className="text-right text-xs font-medium text-neutral-400 dark:text-neutral-400 px-4 py-3 w-32">Amount</th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-neutral-400 dark:text-neutral-500">
                  <p className="text-sm font-medium">No entries yet</p>
                  <p className="text-xs mt-1">Use "+ Add entry" above to log a transaction.</p>
                </td>
              </tr>
            ) : filtered.map(entry => (
              <tr key={`${entry._type}-${entry.id}`} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                <td className="px-4 py-4 w-40">{entryBadge(entry, 12)}</td>
                <td className="px-4 py-4">
                  <p className="text-sm text-neutral-800 dark:text-neutral-100">{entryDescription(entry)}</p>
                </td>
                <td className="px-4 py-4 w-28">
                  {entry._type === 'expense' && entry.paymentMethod && (
                    <p className="text-xs text-neutral-400 dark:text-neutral-400">{entry.paymentMethod.name}</p>
                  )}
                </td>
                <td className="px-4 py-4 w-32">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{formatDate(entry.date)}</p>
                </td>
                <td className="px-4 py-4 text-right w-32">
                  <span className={`text-sm font-semibold ${entryAmountClass(entry)}`}>
                    {entryAmount(entry)}
                  </span>
                </td>
                <td className="px-4 py-4 w-16">
                  {(entry._type === 'expense' || entry._type === 'payment') && (
                    <div className="flex items-center justify-end gap-1">
                      {entry._type === 'expense' && (
                        <button onClick={() => setEditingTx(entry)} className="p-1.5 rounded-lg text-neutral-300 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                          <Pencil size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => entry._type === 'expense' ? deleteTx(entry.id) : deletePayment(entry)}
                        className="p-1.5 rounded-lg text-neutral-300 dark:text-neutral-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingTx && (
        <EditTransactionModal
          tx={editingTx}
          categories={categories}
          onSave={editTx}
          onClose={() => setEditingTx(null)}
        />
      )}
    </div>
  );
}
