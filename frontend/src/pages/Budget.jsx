import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Trash2, Pencil, X, GripVertical, Target,
  PiggyBank, ChevronRight, Check,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../lib/api.js';
import { formatPHP, formatDate } from '../lib/utils.js';
import { useMonth } from '../lib/MonthContext.jsx';
import ColorPicker from '../components/ColorPicker.jsx';
import { useSurplus } from '../lib/SurplusContext.jsx';
import SurplusModal from '../components/SurplusModal.jsx';
import EditTransactionModal from '../components/EditTransactionModal.jsx';

// ── Thin progress bar (h-1) ───────────────────────────────────────────────────
function ThinBar({ value, max, color = 'bg-brand-500' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = value > max && max > 0;
  return (
    <div className="h-1 rounded-full bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-400' : color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Section card wrapper (zero padding, rows inside) ─────────────────────────
function SectionCard({ title, right, children }) {
  return (
    <div className="card !p-0 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-900/40">
        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">{title}</span>
        {right && <div className="flex items-center gap-2">{right}</div>}
      </div>
      {children}
    </div>
  );
}

// ── Inline payment form (used in debt rows) ───────────────────────────────────
function InlinePayForm({ defaultAmount, onSave, onCancel }) {
  const [form, setForm] = useState({
    amount: defaultAmount ? String(defaultAmount) : '',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  return (
    <form
      onSubmit={e => { e.preventDefault(); onSave(form); }}
      className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900/40 border-t border-neutral-100 dark:border-neutral-700 space-y-2"
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Amount (₱)</label>
          <input className="input" type="number" min="0" step="0.01"
            value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="0.00" required />
        </div>
        <div>
          <label className="label">Date</label>
          <input className="input" type="date"
            value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
        </div>
      </div>
      <input className="input" value={form.notes}
        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
        placeholder="Notes (optional)" />
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 text-xs">Cancel</button>
        <button type="submit" className="btn-primary flex-1 text-xs">Save payment</button>
      </div>
    </form>
  );
}

// ── Inline goal contribution form ─────────────────────────────────────────────
function InlineContribForm({ goal, onSave, onCancel }) {
  const [form, setForm] = useState({ amount: '', date: new Date().toISOString().slice(0, 10) });
  return (
    <form
      onSubmit={e => { e.preventDefault(); onSave(form); }}
      className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900/40 border-t border-neutral-100 dark:border-neutral-700 space-y-2"
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Amount (₱)</label>
          <input className="input" type="number" min="0" step="0.01"
            value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="0.00" required autoFocus />
        </div>
        <div>
          <label className="label">Date</label>
          <input className="input" type="date"
            value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 text-xs">Cancel</button>
        <button type="submit" className="btn-primary flex-1 text-xs">Save</button>
      </div>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Budget() {
  const { month } = useMonth();
  const surplusCtx = useSurplus();

  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [debtPayments, setDebtPayments] = useState([]);
  const [goals, setGoals] = useState([]);
  const [goalContributions, setGoalContributions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddTx, setShowAddTx] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [editCatId, setEditCatId] = useState(null);
  const [showAddCat, setShowAddCat] = useState(false);
  const [payingDebtId, setPayingDebtId] = useState(null);
  const [contributingGoalId, setContributingGoalId] = useState(null);
  const [showSurplus, setShowSurplus] = useState(false);

  const [txForm, setTxForm] = useState({
    categoryId: '', amount: '', description: '',
    date: new Date().toISOString().slice(0, 10),
  });
  const [catForm, setCatForm] = useState({
    name: '', monthlyAllocation: '', icon: '', color: '#6366f1',
  });

  const dragItem = useRef(null);
  const dragOver = useRef(null);

  async function load() {
    setLoading(true);
    const [cats, txs, ds, gs, contribs] = await Promise.all([
      api.get('/budget/categories'),
      api.get('/transactions', { params: { month } }),
      api.get('/debts'),
      api.get('/goals'),
      api.get('/goals/contributions', { params: { month } }),
    ]);

    const activeDebts = ds.data.filter(d => d.status === 'ACTIVE');
    const [y, m] = month.split('-').map(Number);
    const start = new Date(y, m - 1, 1).toISOString();
    const end = new Date(y, m, 1).toISOString();

    const payments = await Promise.all(
      activeDebts.map(d =>
        api.get(`/debts/${d.id}/payments`).then(r =>
          r.data
            .filter(p => p.date >= start && p.date < end)
            .map(p => ({ ...p, debtId: d.id }))
        )
      )
    );

    setCategories(cats.data);
    setTransactions(txs.data);
    setDebts(activeDebts);
    setDebtPayments(payments.flat());
    setGoals(gs.data.filter(g => !g.targetAmount || Number(g.currentAmount) < Number(g.targetAmount)));
    setGoalContributions(contribs.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [month]);

  // ── Transaction CRUD ──────────────────────────────────────────────────────
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

  // ── Category CRUD ─────────────────────────────────────────────────────────
  async function saveCategory(e) {
    e.preventDefault();
    if (editCatId) {
      await api.put(`/budget/categories/${editCatId}`, catForm);
      setEditCatId(null);
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

  function startEditCat(cat) {
    setEditCatId(cat.id);
    setShowAddCat(false);
    setCatForm({ name: cat.name, monthlyAllocation: cat.monthlyAllocation, icon: cat.icon || '', color: cat.color || '#6366f1' });
  }

  // ── Drag-and-drop ─────────────────────────────────────────────────────────
  function onDragStart(i) { dragItem.current = i; }
  function onDragEnter(i) {
    dragOver.current = i;
    if (dragItem.current === i) return;
    setCategories(prev => {
      const next = [...prev];
      const dragged = next.splice(dragItem.current, 1)[0];
      next.splice(i, 0, dragged);
      dragItem.current = i;
      return next;
    });
  }
  async function onDragEnd() {
    dragItem.current = null;
    dragOver.current = null;
    await api.put('/budget/categories/reorder', {
      order: categories.map((c, i) => ({ id: c.id, sortOrder: i })),
    });
  }

  // ── Debt payment ──────────────────────────────────────────────────────────
  async function logDebtPayment(debtId, form) {
    await api.post(`/debts/${debtId}/payment`, form);
    setPayingDebtId(null);
    load();
  }

  // ── Goal contribution ─────────────────────────────────────────────────────
  async function logGoalContrib(goalId, form) {
    await api.post(`/goals/${goalId}/contribution`, form);
    setContributingGoalId(null);
    load();
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  const spendingByCat = categories.map(cat => ({
    ...cat,
    spent: transactions
      .filter(t => t.categoryId === cat.id)
      .reduce((s, t) => s + Number(t.amount), 0),
  }));

  const totalExpenses   = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const totalDebtPaid   = debtPayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalAllocated  = categories.reduce((s, c) => s + Number(c.monthlyAllocation), 0);
  const totalDebtMin    = debts.reduce((s, d) => s + Number(d.minPayment), 0);
  const totalGoalTarget = goals.reduce((s, g) => s + Number(g.monthlyTarget || 0), 0);
  const totalGoalContrib = goalContributions.reduce((s, c) => s + Number(c.amount), 0);

  const chartData = spendingByCat
    .filter(c => Number(c.monthlyAllocation) > 0 || c.spent > 0)
    .map(c => ({
      name: `${c.icon || ''} ${c.name}`.trim(),
      Budgeted: Number(c.monthlyAllocation),
      Spent: c.spent,
    }));

  const { plan = [], hasPlan } = surplusCtx;

  if (loading) return <div className="flex items-center justify-center h-64 text-neutral-400">Loading…</div>;

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Budget</h1>
        <p className="text-sm text-neutral-400 dark:text-neutral-400">Your monthly financial plan</p>
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => setShowSurplus(true)}
            className="btn-secondary"
          >
            <Target size={15} /> Unbudgeted
          </button>
          <button onClick={() => { setShowAddTx(s => !s); }} className="btn-primary">
            <Plus size={15} /> Log expense
          </button>
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Expenses',
            value: `${formatPHP(totalExpenses)}`,
            sub: `of ${formatPHP(totalAllocated)} budgeted`,
            over: totalAllocated > 0 && totalExpenses > totalAllocated,
          },
          {
            label: 'Debt payments',
            value: formatPHP(totalDebtPaid),
            sub: `of ${formatPHP(totalDebtMin)} minimum`,
            color: 'text-brand-600 dark:text-brand-400',
          },
          {
            label: 'Goal contributions',
            value: formatPHP(totalGoalContrib),
            sub: totalGoalTarget > 0 ? `of ${formatPHP(totalGoalTarget)} target` : 'no monthly targets set',
            color: 'text-emerald-600 dark:text-emerald-400',
          },
          {
            label: 'Total out',
            value: formatPHP(totalExpenses + totalDebtPaid + totalGoalContrib),
            sub: 'this month',
          },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-card px-3 py-2.5">
            <p className="text-xs text-neutral-400 dark:text-neutral-400 mb-0.5">{s.label}</p>
            <p className={`text-sm font-bold truncate ${s.over ? 'text-red-500' : s.color ?? 'text-neutral-800 dark:text-neutral-100'}`}>
              {s.value}
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Log expense form ── */}
      {showAddTx && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 text-sm">Log an expense</h2>
            <button onClick={() => setShowAddTx(false)} className="p-1 rounded text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"><X size={15} /></button>
          </div>
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
                <input className="input" type="number" min="0" step="0.01" value={txForm.amount}
                  onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Description</label>
                <input className="input" value={txForm.description}
                  onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Grocery run" />
              </div>
              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={txForm.date}
                  onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} required />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAddTx(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1">Save expense</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Bar chart ── */}
      {chartData.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-3 text-sm">Expenses: Budgeted vs. Spent</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-100 dark:text-neutral-800" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => formatPHP(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Budgeted" fill="#D1D5DB" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Spent" fill="#F97316" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Debt Payments ── */}
      <SectionCard
        title="Debt Payments"
        right={
          <span className="text-xs text-neutral-400">
            {formatPHP(totalDebtPaid)} <span className="text-neutral-300 dark:text-neutral-600">/</span> {formatPHP(totalDebtMin)} min
          </span>
        }
      >
        {debts.length === 0 ? (
          <p className="px-4 py-4 text-sm text-neutral-400">
            No active debts. <Link to="/debts" className="text-brand-600 hover:underline">Add one here.</Link>
          </p>
        ) : debts.map(debt => {
          const paid = debtPayments.filter(p => p.debtId === debt.id).reduce((s, p) => s + Number(p.amount), 0);
          const min = Number(debt.minPayment);
          const planItem = plan.find(a => a.debtId === debt.id);
          const planned = planItem ? Number(planItem.amount) : null;
          const isPlanned = planned !== null;
          const pct = min > 0 ? Math.min(100, (paid / min) * 100) : 0;
          const isPaying = payingDebtId === debt.id;
          return (
            <div key={debt.id} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
              <div className="px-4 py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{debt.name}</span>
                    {isPlanned && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${paid >= planned ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500'}`}>
                        {paid >= planned ? <><Check size={10} className="inline" /> plan done</> : `₱${Number(planned).toLocaleString()} planned`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                    Min {formatPHP(min)} · Balance {formatPHP(debt.currentBalance)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{formatPHP(paid)}</p>
                  <p className="text-xs text-neutral-400">/ {formatPHP(min)}</p>
                </div>
                <button
                  onClick={() => setPayingDebtId(isPaying ? null : debt.id)}
                  className="btn-secondary text-xs py-1 px-2.5 shrink-0"
                >
                  {isPaying ? <X size={12} /> : <Plus size={12} />}
                  {isPaying ? 'Cancel' : 'Pay'}
                </button>
              </div>
              <div className="px-4 pb-2.5">
                <ThinBar value={paid} max={min} />
              </div>
              {isPaying && (
                <InlinePayForm
                  defaultAmount={planned ?? min}
                  onSave={form => logDebtPayment(debt.id, form)}
                  onCancel={() => setPayingDebtId(null)}
                />
              )}
            </div>
          );
        })}
      </SectionCard>

      {/* ── Expense Categories ── */}
      <SectionCard
        title="Expense Categories"
        right={
          <button
            onClick={() => { setShowAddCat(s => !s); setEditCatId(null); }}
            className="btn-secondary text-xs py-1 px-2.5"
          >
            <Plus size={12} /> Add
          </button>
        }
      >
        {/* Add category inline form */}
        {showAddCat && (
          <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/40">
            <form onSubmit={saveCategory} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Name</label>
                  <input className="input" value={catForm.name}
                    onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
                </div>
                <div>
                  <label className="label">Budget (₱/mo)</label>
                  <input className="input" type="number" min="0" step="0.01" value={catForm.monthlyAllocation}
                    onChange={e => setCatForm(f => ({ ...f, monthlyAllocation: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="label">Icon</label>
                <input className="input w-24" value={catForm.icon}
                  onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))} placeholder="🛒" maxLength={2} />
              </div>
              <div>
                <label className="label">Color</label>
                <ColorPicker value={catForm.color} onChange={color => setCatForm(f => ({ ...f, color }))} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowAddCat(false)} className="btn-secondary flex-1 text-xs">Cancel</button>
                <button type="submit" className="btn-primary flex-1 text-xs">Save</button>
              </div>
            </form>
          </div>
        )}

        {spendingByCat.length === 0 && !showAddCat && (
          <p className="px-4 py-4 text-sm text-neutral-400">No categories yet.</p>
        )}

        {spendingByCat.map((cat, index) => {
          const isEditing = editCatId === cat.id;
          const over = cat.spent > Number(cat.monthlyAllocation) && Number(cat.monthlyAllocation) > 0;
          return (
            <div
              key={cat.id}
              className="border-b border-neutral-100 dark:border-neutral-800 last:border-0"
              draggable
              onDragStart={() => onDragStart(index)}
              onDragEnter={() => onDragEnter(index)}
              onDragEnd={onDragEnd}
              onDragOver={e => e.preventDefault()}
            >
              {isEditing ? (
                <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900/40">
                  <form onSubmit={saveCategory} className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Edit — {cat.name}</span>
                      <button type="button" onClick={() => setEditCatId(null)}
                        className="p-1 rounded text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                        <X size={13} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="label">Name</label>
                        <input className="input" value={catForm.name}
                          onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} required />
                      </div>
                      <div>
                        <label className="label">Budget (₱/mo)</label>
                        <input className="input" type="number" min="0" step="0.01" value={catForm.monthlyAllocation}
                          onChange={e => setCatForm(f => ({ ...f, monthlyAllocation: e.target.value }))} required />
                      </div>
                    </div>
                    <div>
                      <label className="label">Icon</label>
                      <input className="input w-24" value={catForm.icon}
                        onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))} placeholder="🛒" maxLength={2} />
                    </div>
                    <div>
                      <label className="label">Color</label>
                      <ColorPicker value={catForm.color} onChange={color => setCatForm(f => ({ ...f, color }))} />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditCatId(null)} className="btn-secondary flex-1 text-xs">Cancel</button>
                      <button type="submit" className="btn-primary flex-1 text-xs">Save</button>
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  <div className="px-4 py-2.5 flex items-center gap-2">
                    <GripVertical size={14} className="text-neutral-300 dark:text-neutral-600 cursor-grab shrink-0" />
                    <span className="text-base shrink-0">{cat.icon || '📦'}</span>
                    <span className="flex-1 text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{cat.name}</span>
                    <span className={`text-sm font-semibold shrink-0 ${over ? 'text-red-500' : 'text-neutral-700 dark:text-neutral-200'}`}>
                      {formatPHP(cat.spent)}
                      <span className="text-xs font-normal text-neutral-400 dark:text-neutral-500"> / {formatPHP(cat.monthlyAllocation)}</span>
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => startEditCat(cat)}
                        className="p-1 rounded text-neutral-300 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteCategory(cat.id)}
                        className="p-1 rounded text-neutral-300 dark:text-neutral-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="px-4 pb-2.5">
                    <ThinBar value={cat.spent} max={Number(cat.monthlyAllocation)} />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </SectionCard>

      {/* ── Goals ── */}
      {goals.length > 0 && (
        <SectionCard
          title="Goals"
          right={
            <Link to="/goals" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              View all <ChevronRight size={12} />
            </Link>
          }
        >
          {goals.map(goal => {
            const monthly = Number(goal.monthlyTarget || 0);
            const contrib = goalContributions
              .filter(c => c.goalId === goal.id)
              .reduce((s, c) => s + Number(c.amount), 0);
            const isContributing = contributingGoalId === goal.id;
            return (
              <div key={goal.id} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                <div className="px-4 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{goal.name}</span>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                      {formatPHP(goal.currentAmount)} saved
                      {goal.targetAmount ? ` · ${formatPHP(goal.targetAmount)} goal` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatPHP(contrib)}</p>
                    <p className="text-xs text-neutral-400">{monthly > 0 ? `/ ${formatPHP(monthly)} target` : 'this month'}</p>
                  </div>
                  <button
                    onClick={() => setContributingGoalId(isContributing ? null : goal.id)}
                    className="btn-secondary text-xs py-1 px-2.5 shrink-0"
                  >
                    {isContributing ? <X size={12} /> : <PiggyBank size={12} />}
                    {isContributing ? 'Cancel' : 'Add'}
                  </button>
                </div>
                {monthly > 0 && (
                  <div className="px-4 pb-2.5">
                    <ThinBar value={contrib} max={monthly} color="bg-emerald-500" />
                  </div>
                )}
                {isContributing && (
                  <InlineContribForm
                    goal={goal}
                    onSave={form => logGoalContrib(goal.id, form)}
                    onCancel={() => setContributingGoalId(null)}
                  />
                )}
              </div>
            );
          })}
        </SectionCard>
      )}

      {/* ── Surplus Plan ── */}
      <SectionCard
        title="Surplus Plan"
        right={
          <button
            onClick={() => setShowSurplus(true)}
            className="text-xs text-brand-600 hover:underline flex items-center gap-1"
          >
            {hasPlan ? 'Edit plan' : 'Create plan'} <ChevronRight size={12} />
          </button>
        }
      >
        {!hasPlan ? (
          <div className="px-4 py-5 text-center">
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-3">
              No plan for this month yet. Use Unbudgeted to decide where your surplus goes.
            </p>
            <button onClick={() => setShowSurplus(true)} className="btn-secondary text-sm">
              <Target size={14} /> Open Unbudgeted
            </button>
          </div>
        ) : (
          plan.map(item => {
            const paid = debtPayments
              .filter(p => p.debtId === item.debtId)
              .reduce((s, p) => s + Number(p.amount), 0);
            const planned = Number(item.amount);
            const done = paid >= planned;
            return (
              <div key={item.debtId} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                <div className="px-4 py-2.5 flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-green-100 dark:bg-green-900/30' : 'bg-neutral-100 dark:bg-neutral-700'}`}>
                    {done
                      ? <Check size={11} className="text-green-600 dark:text-green-400" />
                      : <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />}
                  </div>
                  <span className={`flex-1 text-sm font-medium truncate ${done ? 'text-neutral-400 dark:text-neutral-500' : 'text-neutral-800 dark:text-neutral-100'}`}>
                    {item.name}
                  </span>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{formatPHP(paid)}</p>
                    <p className="text-xs text-neutral-400">/ {formatPHP(planned)} planned</p>
                  </div>
                  {!done && (
                    <button
                      onClick={() => setPayingDebtId(payingDebtId === item.debtId ? null : item.debtId)}
                      className="btn-secondary text-xs py-1 px-2.5 shrink-0"
                    >
                      Pay
                    </button>
                  )}
                </div>
                <div className="px-4 pb-2.5">
                  <ThinBar value={paid} max={planned} color="bg-brand-500" />
                </div>
                {payingDebtId === item.debtId && (
                  <InlinePayForm
                    defaultAmount={planned - paid}
                    onSave={form => logDebtPayment(item.debtId, form)}
                    onCancel={() => setPayingDebtId(null)}
                  />
                )}
              </div>
            );
          })
        )}
      </SectionCard>

      {/* ── Transactions list ── */}
      {transactions.length > 0 && (
        <SectionCard title={`Expenses this month (${transactions.length})`}>
          {transactions.map(tx => (
            <div key={tx.id} className="px-4 py-2.5 flex items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
              <span className="text-base shrink-0">{tx.category?.icon || '📦'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-800 dark:text-neutral-100 truncate">
                  {tx.description || tx.category?.name || 'Expense'}
                </p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  {formatDate(tx.date)} · {tx.category?.name || 'Uncategorized'}
                </p>
              </div>
              <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100 shrink-0">{formatPHP(tx.amount)}</span>
              <button onClick={() => setEditingTx(tx)}
                className="p-1.5 rounded-lg text-neutral-300 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                <Pencil size={13} />
              </button>
              <button onClick={() => deleteTx(tx.id)}
                className="p-1.5 rounded-lg text-neutral-300 dark:text-neutral-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </SectionCard>
      )}

      {editingTx && (
        <EditTransactionModal
          tx={editingTx}
          categories={categories}
          onSave={editTransaction}
          onClose={() => setEditingTx(null)}
        />
      )}

      {showSurplus && (
        <SurplusModal
          month={month}
          onClose={() => {
            setShowSurplus(false);
            surplusCtx.refresh();
          }}
        />
      )}
    </div>
  );
}
