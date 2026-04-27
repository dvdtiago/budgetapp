import { useEffect, useState } from 'react';
import { Trash2, Pencil, X, CreditCard, ShoppingBag, Plus, Check } from 'lucide-react';
import api from '../lib/api.js';
import { formatPHP, formatDate } from '../lib/utils.js';
import { useMonth } from '../lib/MonthContext.jsx';

function EditTransactionModal({ tx, categories, onSave, onClose }) {
  const [form, setForm] = useState({
    categoryId: tx.categoryId || '',
    amount: String(tx.amount),
    description: tx.description || '',
    date: tx.date ? new Date(tx.date).toISOString().slice(0, 10) : '',
  });

  async function submit(e) {
    e.preventDefault();
    await onSave(tx.id, form);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 dark:bg-black/50 px-4 pb-4 sm:pb-0">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">Edit transaction</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
              <option value="">— No category —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount (₱)</label>
              <input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Save changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Transactions() {
  const { month } = useMonth();
  const [transactions, setTransactions] = useState([]);
  const [debtPayments, setDebtPayments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTx, setEditingTx] = useState(null);
  const [filter, setFilter] = useState('all');
  const [addingRow, setAddingRow] = useState(false);
  const [newRow, setNewRow] = useState({ type: 'expense', categoryId: '', debtId: '', description: '', date: new Date().toISOString().slice(0, 10), amount: '' });
  const [savingRow, setSavingRow] = useState(false);

  async function load() {
    setLoading(true);
    const [txs, cats, ds] = await Promise.all([
      api.get('/transactions', { params: { month } }),
      api.get('/budget/categories'),
      api.get('/debts'),
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

    setTransactions(txs.data.map(t => ({ ...t, _type: 'expense' })));
    setDebtPayments(payments.flat());
    setCategories(cats.data);
    setDebts(ds.data);
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

  async function saveNewRow(e) {
    e.preventDefault();
    setSavingRow(true);
    try {
      if (newRow.type === 'expense') {
        await api.post('/transactions', {
          categoryId: newRow.categoryId || null,
          amount: newRow.amount,
          description: newRow.description,
          date: newRow.date,
        });
      } else {
        await api.post(`/debts/${newRow.debtId}/payment`, {
          amount: newRow.amount,
          date: newRow.date,
          notes: newRow.description,
        });
      }
      setNewRow({ type: 'expense', categoryId: '', debtId: '', description: '', date: new Date().toISOString().slice(0, 10), amount: '' });
      setAddingRow(false);
      load();
    } finally {
      setSavingRow(false);
    }
  }

  const allEntries = [
    ...transactions,
    ...debtPayments,
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const filtered = filter === 'expenses' ? transactions
    : filter === 'payments' ? debtPayments
    : allEntries;

  const totalExpenses = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const totalPayments = debtPayments.reduce((s, p) => s + Number(p.amount), 0);

  if (loading) return <div className="flex items-center justify-center h-64 text-neutral-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Transactions</h1>
        <p className="text-sm text-neutral-400 dark:text-neutral-500">All expenses and debt payments in one view</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">Expenses</p>
          <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{formatPHP(totalExpenses)}</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">{transactions.length} entries</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">Debt payments</p>
          <p className="text-lg font-bold text-brand-600">{formatPHP(totalPayments)}</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">{debtPayments.length} entries</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">Total out</p>
          <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{formatPHP(totalExpenses + totalPayments)}</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">{allEntries.length} entries</p>
        </div>
      </div>

      {/* Filter tabs + add button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {[['all', 'All'], ['expenses', 'Expenses'], ['payments', 'Debt Payments']].map(([val, label]) => (
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
        <button
          onClick={() => { setAddingRow(true); setNewRow({ type: 'expense', categoryId: '', debtId: '', description: '', date: new Date().toISOString().slice(0, 10), amount: '' }); }}
          className="btn-primary text-sm"
        >
          <Plus size={14} /> Add entry
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">📋</p>
          <p className="font-medium text-neutral-800 dark:text-neutral-100">No entries yet</p>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">Log expenses on the Budget page or payments on the Debts page.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-700">
                <th className="text-left text-xs font-medium text-neutral-400 dark:text-neutral-500 px-4 py-3">Type</th>
                <th className="text-left text-xs font-medium text-neutral-400 dark:text-neutral-500 px-4 py-3">Description</th>
                <th className="text-left text-xs font-medium text-neutral-400 dark:text-neutral-500 px-4 py-3 hidden sm:table-cell">Date</th>
                <th className="text-right text-xs font-medium text-neutral-400 dark:text-neutral-500 px-4 py-3">Amount</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {addingRow && (
                <tr className="border-b border-brand-100 dark:border-brand-900/40 bg-brand-50/50 dark:bg-brand-900/10">
                  <td className="px-3 py-2">
                    <select
                      className="input py-1 text-xs"
                      value={newRow.type}
                      onChange={e => setNewRow(r => ({ ...r, type: e.target.value, categoryId: '', debtId: '' }))}
                    >
                      <option value="expense">Expense</option>
                      <option value="payment">Debt Payment</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    {newRow.type === 'expense' ? (
                      <select className="input py-1 text-xs" value={newRow.categoryId} onChange={e => setNewRow(r => ({ ...r, categoryId: e.target.value }))}>
                        <option value="">— Category —</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                      </select>
                    ) : (
                      <select className="input py-1 text-xs" value={newRow.debtId} onChange={e => setNewRow(r => ({ ...r, debtId: e.target.value }))} required>
                        <option value="">— Debt —</option>
                        {debts.filter(d => d.status === 'ACTIVE').map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-2 hidden sm:table-cell">
                    <input className="input py-1 text-xs" type="date" value={newRow.date} onChange={e => setNewRow(r => ({ ...r, date: e.target.value }))} required />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input className="input py-1 text-xs text-right w-28" type="number" min="0" step="0.01" placeholder="0.00" value={newRow.amount} onChange={e => setNewRow(r => ({ ...r, amount: e.target.value }))} required />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={saveNewRow}
                        disabled={savingRow || !newRow.amount || (newRow.type === 'payment' && !newRow.debtId)}
                        className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-40"
                      >
                        <Check size={14} />
                      </button>
                      <button onClick={() => setAddingRow(false)} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map(entry => (
                <tr key={`${entry._type}-${entry.id}`} className="border-b border-neutral-50 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="px-4 py-3">
                    {entry._type === 'expense' ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                        <ShoppingBag size={11} />
                        {entry.category?.name || 'Expense'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300">
                        <CreditCard size={11} />
                        {entry.debtName}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-neutral-800 dark:text-neutral-100 truncate max-w-[160px]">
                      {entry._type === 'expense'
                        ? (entry.description || entry.category?.name || 'Expense')
                        : (entry.notes || 'Debt payment')}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-sm text-neutral-400 dark:text-neutral-500">{formatDate(entry.date)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-semibold ${entry._type === 'payment' ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-800 dark:text-neutral-100'}`}>
                      {formatPHP(entry.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {entry._type === 'expense' && (
                        <button onClick={() => setEditingTx(entry)} className="p-1.5 rounded-lg text-neutral-300 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                          <Pencil size={13} />
                        </button>
                      )}
                      {entry._type === 'expense' && (
                        <button onClick={() => deleteTx(entry.id)} className="p-1.5 rounded-lg text-neutral-300 dark:text-neutral-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
