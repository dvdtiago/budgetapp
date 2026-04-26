import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../lib/api.js';
import { formatPHP, formatDate } from '../lib/utils.js';
import { useMonth } from '../lib/MonthContext.jsx';

function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = value > max && max > 0;
  return (
    <div className="progress-track">
      <div className={over ? 'progress-fill-red' : 'progress-fill'} style={{ width: `${pct}%` }} />
    </div>
  );
}

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

export default function Budget() {
  const { month } = useMonth();
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [debtPayments, setDebtPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddTx, setShowAddTx] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [editCat, setEditCat] = useState(null);
  const [showAddCat, setShowAddCat] = useState(false);
  const [payingDebtId, setPayingDebtId] = useState(null);
  const [txForm, setTxForm] = useState({ categoryId: '', amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
  const [catForm, setCatForm] = useState({ name: '', monthlyAllocation: '', icon: '', color: '#6366f1' });
  const [debtPayForm, setDebtPayForm] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });

  async function load() {
    setLoading(true);
    const [cats, txs, ds] = await Promise.all([
      api.get('/budget/categories'),
      api.get('/transactions', { params: { month } }),
      api.get('/debts'),
    ]);

    const activeDebts = ds.data.filter(d => d.status === 'ACTIVE');
    const [y, m] = month.split('-').map(Number);
    const start = new Date(y, m - 1, 1).toISOString();
    const end = new Date(y, m, 1).toISOString();

    const payments = await Promise.all(
      activeDebts.map(d => api.get(`/debts/${d.id}/payments`).then(r =>
        r.data.filter(p => p.date >= start && p.date < end).map(p => ({ ...p, debtName: d.name, debtId: d.id }))
      ))
    );

    setCategories(cats.data);
    setTransactions(txs.data);
    setDebts(activeDebts);
    setDebtPayments(payments.flat());
    setLoading(false);
  }

  useEffect(() => { load(); }, [month]);

  async function addTransaction(e) {
    e.preventDefault();
    await api.post('/transactions', txForm);
    setTxForm({ categoryId: '', amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
    setShowAddTx(false);
    load();
  }

  async function editTransaction(id, form) {
    await api.put(`/transactions/${id}`, form);
    load();
  }

  async function deleteTx(id) {
    if (!confirm('Delete this expense?')) return;
    await api.delete(`/transactions/${id}`);
    load();
  }

  async function saveCategory(e) {
    e.preventDefault();
    if (editCat) {
      await api.put(`/budget/categories/${editCat.id}`, catForm);
      setEditCat(null);
    } else {
      await api.post('/budget/categories', catForm);
      setShowAddCat(false);
    }
    setCatForm({ name: '', monthlyAllocation: '', icon: '', color: '#6366f1' });
    load();
  }

  async function deleteCategory(id) {
    if (!confirm('Delete this category? Transactions will be uncategorized.')) return;
    await api.delete(`/budget/categories/${id}`);
    load();
  }

  async function logDebtPayment(debtId, e) {
    e.preventDefault();
    await api.post(`/debts/${debtId}/payment`, debtPayForm);
    setDebtPayForm({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });
    setPayingDebtId(null);
    load();
  }

  function startEdit(cat) {
    setEditCat(cat);
    setCatForm({ name: cat.name, monthlyAllocation: cat.monthlyAllocation, icon: cat.icon || '', color: cat.color || '#6366f1' });
  }

  const spendingByCat = categories.map(cat => ({
    ...cat,
    spent: transactions.filter(t => t.categoryId === cat.id).reduce((s, t) => s + Number(t.amount), 0),
  }));

  const totalExpenses = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const totalDebtPaid = debtPayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalAllocated = categories.reduce((s, c) => s + Number(c.monthlyAllocation), 0);
  const totalDebtMin = debts.reduce((s, d) => s + Number(d.minPayment), 0);
  const totalBudgeted = totalAllocated + totalDebtMin;

  const chartData = spendingByCat
    .filter(c => Number(c.monthlyAllocation) > 0 || c.spent > 0)
    .map(c => ({ name: `${c.icon || ''} ${c.name}`.trim(), Budgeted: Number(c.monthlyAllocation), Spent: c.spent }));

  if (loading) return <div className="flex items-center justify-center h-64 text-neutral-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Budget</h1>
          <p className="text-sm text-neutral-400 dark:text-neutral-500">Expenses and debt payments in one place</p>
        </div>
        <button onClick={() => setShowAddTx(s => !s)} className="btn-primary">
          <Plus size={15} /> Log expense
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card text-center">
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">Total budgeted</p>
          <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{formatPHP(totalBudgeted)}</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">expenses + min payments</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">Expenses spent</p>
          <p className={`text-lg font-bold ${totalExpenses > totalAllocated ? 'text-red-500' : 'text-neutral-800 dark:text-neutral-100'}`}>{formatPHP(totalExpenses)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">Debt payments made</p>
          <p className="text-lg font-bold text-brand-600">{formatPHP(totalDebtPaid)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">Total out</p>
          <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{formatPHP(totalExpenses + totalDebtPaid)}</p>
        </div>
      </div>

      {/* Log expense form */}
      {showAddTx && (
        <div className="card">
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-4">Log an expense</h2>
          <form onSubmit={addTransaction} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Category</label>
                <select className="input" value={txForm.categoryId} onChange={e => setTxForm(f => ({ ...f, categoryId: e.target.value }))}>
                  <option value="">— No category —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Amount (₱)</label>
                <input className="input" type="number" min="0" step="0.01" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Description (optional)</label>
                <input className="input" value={txForm.description} onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Grocery run" />
              </div>
              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} required />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAddTx(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1">Save expense</button>
            </div>
          </form>
        </div>
      )}

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-4">Expenses: Budgeted vs. Spent</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E2" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => formatPHP(v)} />
              <Legend />
              <Bar dataKey="Budgeted" fill="#FDE4C8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Spent" fill="#E07030" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── DEBT PAYMENTS SECTION ── */}
      <section>
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">Debt Payments</h2>
        <div className="space-y-3">
          {debts.map(debt => {
            const paid = debtPayments.filter(p => p.debtId === debt.id).reduce((s, p) => s + Number(p.amount), 0);
            const min = Number(debt.minPayment);
            const pct = min > 0 ? Math.min(100, (paid / min) * 100) : 0;
            return (
              <div key={debt.id} className="card">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-neutral-800 dark:text-neutral-100">{debt.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-neutral-400 dark:text-neutral-500">{formatPHP(paid)} / {formatPHP(min)}</span>
                        <button
                          onClick={() => setPayingDebtId(payingDebtId === debt.id ? null : debt.id)}
                          className="btn-secondary text-xs py-1"
                        >
                          <Plus size={12} /> Log payment
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                      Min. payment: {formatPHP(min)} · Balance: {formatPHP(debt.currentBalance)} · {(Number(debt.interestRate) * 100).toFixed(2)}% p.a.
                    </p>
                  </div>
                </div>
                <ProgressBar value={paid} max={min} />

                {payingDebtId === debt.id && (
                  <form onSubmit={e => logDebtPayment(debt.id, e)} className="mt-3 space-y-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Amount (₱)</label>
                        <input className="input" type="number" min="0" step="0.01" value={debtPayForm.amount} onChange={e => setDebtPayForm(f => ({ ...f, amount: e.target.value }))} placeholder={String(min)} required />
                      </div>
                      <div>
                        <label className="label">Date</label>
                        <input className="input" type="date" value={debtPayForm.date} onChange={e => setDebtPayForm(f => ({ ...f, date: e.target.value }))} required />
                      </div>
                    </div>
                    <div>
                      <label className="label">Notes (optional)</label>
                      <input className="input" value={debtPayForm.notes} onChange={e => setDebtPayForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Minimum payment" />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setPayingDebtId(null)} className="btn-secondary flex-1">Cancel</button>
                      <button type="submit" className="btn-primary flex-1">Save payment</button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
          {debts.length === 0 && (
            <p className="text-sm text-neutral-400 dark:text-neutral-500">No active debts. <Link to="/debts" className="text-brand-600 hover:underline">Add one here.</Link></p>
          )}
        </div>
      </section>

      {/* ── EXPENSE CATEGORIES SECTION ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Expense Categories</h2>
          <button onClick={() => { setShowAddCat(s => !s); setEditCat(null); }} className="btn-secondary text-xs">
            <Plus size={13} /> Add category
          </button>
        </div>

        {(showAddCat || editCat) && (
          <div className="card mb-3">
            <h3 className="font-medium text-neutral-800 dark:text-neutral-100 mb-3">{editCat ? 'Edit category' : 'New category'}</h3>
            <form onSubmit={saveCategory} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Name</label>
                  <input className="input" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Monthly budget (₱)</label>
                  <input className="input" type="number" min="0" step="0.01" value={catForm.monthlyAllocation} onChange={e => setCatForm(f => ({ ...f, monthlyAllocation: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Icon (emoji)</label>
                  <input className="input" value={catForm.icon} onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))} placeholder="🛒" maxLength={2} />
                </div>
                <div>
                  <label className="label">Color</label>
                  <input className="input" type="color" value={catForm.color} onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowAddCat(false); setEditCat(null); }} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Save</button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {spendingByCat.map(cat => (
            <div key={cat.id} className="card">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">{cat.icon || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-neutral-800 dark:text-neutral-100">{cat.name}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(cat)} className="p-1 rounded text-neutral-300 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteCategory(cat.id)} className="p-1 rounded text-neutral-300 dark:text-neutral-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                    <span>{formatPHP(cat.spent)} spent</span>
                    <span>of {formatPHP(cat.monthlyAllocation)}</span>
                  </div>
                </div>
              </div>
              <ProgressBar value={cat.spent} max={Number(cat.monthlyAllocation)} />
            </div>
          ))}
        </div>
      </section>

      {/* ── TRANSACTIONS LIST ── */}
      {transactions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">All expenses this month</h2>
          <div className="space-y-2">
            {transactions.map(tx => (
              <div key={tx.id} className="card flex items-center gap-3 py-3">
                <span className="text-base">{tx.category?.icon || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-800 dark:text-neutral-100 truncate">{tx.description || tx.category?.name || 'Expense'}</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">{formatDate(tx.date)} · {tx.category?.name || 'Uncategorized'}</p>
                </div>
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100 shrink-0">{formatPHP(tx.amount)}</span>
                <button onClick={() => setEditingTx(tx)} className="p-1.5 rounded-lg text-neutral-300 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                  <Pencil size={14} />
                </button>
                <button onClick={() => deleteTx(tx.id)} className="p-1.5 rounded-lg text-neutral-300 dark:text-neutral-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {editingTx && (
        <EditTransactionModal
          tx={editingTx}
          categories={categories}
          onSave={editTransaction}
          onClose={() => setEditingTx(null)}
        />
      )}
    </div>
  );
}
