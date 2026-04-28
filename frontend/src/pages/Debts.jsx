import { useEffect, useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Trash2, Zap, Calendar, X, Pencil, RefreshCw, Check } from 'lucide-react';
import api from '../lib/api.js';
import { formatPHP, formatDate, formatPercent, debtTypeLabel, debtStatusColor } from '../lib/utils.js';
import { useSurplus } from '../lib/SurplusContext.jsx';

const DEBT_TYPES = ['CREDIT_CARD', 'LOAN', 'MORTGAGE'];

function ProgressBar({ percent, color = 'bg-brand-600' }) {
  return (
    <div className="w-full bg-neutral-100 dark:bg-neutral-700 rounded-full h-1.5">
      <div className={`${color} h-1.5 rounded-full`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

const BALANCE_HINTS = {
  CREDIT_CARD: { current: 'Outstanding amount currently owed on this card', original: 'Your total credit limit' },
  LOAN:        { current: 'Remaining loan balance to be paid', original: 'Original loan amount when taken out' },
  MORTGAGE:    { current: 'Outstanding mortgage balance', original: 'Original mortgage amount' },
};

function DebtForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    name: '', provider: '', type: 'CREDIT_CARD', status: 'ACTIVE',
    currentBalance: '', originalBalance: '', interestRate: '', minPayment: '',
    plannedStartDate: '', clearDate: '',
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const hints = BALANCE_HINTS[form.type] || BALANCE_HINTS.LOAN;
  const isCC = form.type === 'CREDIT_CARD';

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        interestRate: Number(form.interestRate) / 100,
        currentBalance: Number(form.currentBalance),
        originalBalance: Number(form.originalBalance),
        minPayment: Number(form.minPayment),
        clearDate: form.clearDate || null,
        plannedStartDate: form.plannedStartDate || null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Debt name</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. BDO Credit Card" required />
        </div>
        <div>
          <label className="label">Provider</label>
          <input className="input" value={form.provider} onChange={e => set('provider', e.target.value)} placeholder="e.g. BDO" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
            {DEBT_TYPES.map(t => <option key={t} value={t}>{debtTypeLabel(t)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="ACTIVE">Active</option>
            <option value="PLANNED">Planned (upcoming)</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Current balance (₱)</label>
          <input className="input" type="number" min="0" step="0.01" value={form.currentBalance} onChange={e => set('currentBalance', e.target.value)} required />
          <p className="text-xs text-neutral-400 dark:text-neutral-400 mt-1">{hints.current}</p>
        </div>
        <div>
          <label className="label">Original balance (₱)</label>
          <input className="input" type="number" min="0" step="0.01" value={form.originalBalance} onChange={e => set('originalBalance', e.target.value)} required />
          <p className="text-xs text-neutral-400 dark:text-neutral-400 mt-1">{hints.original}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Interest rate (% per year)</label>
          <input className="input" type="number" min="0" step="0.01" value={form.interestRate} onChange={e => set('interestRate', e.target.value)} placeholder="e.g. 24" required />
          <p className="text-xs text-neutral-400 dark:text-neutral-400 mt-1">The yearly % your bank charges. Check your latest statement.</p>
        </div>
        <div>
          <label className="label">{isCC ? 'Minimum payment (₱)' : 'Monthly payment (₱)'}</label>
          <input className="input" type="number" min="0" step="0.01" value={form.minPayment} onChange={e => set('minPayment', e.target.value)} required />
          <p className="text-xs text-neutral-400 dark:text-neutral-400 mt-1">{isCC ? 'Smallest amount you must pay each month to avoid penalties.' : 'Fixed monthly repayment amount.'}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Target clear date (optional)</label>
          <input className="input" type="date" value={form.clearDate} onChange={e => set('clearDate', e.target.value)} />
          <p className="text-xs text-neutral-400 dark:text-neutral-400 mt-1">Personal deadline to pay off this debt</p>
        </div>
        {form.status === 'PLANNED' && (
          <div>
            <label className="label">Planned start date</label>
            <input className="input" type="date" value={form.plannedStartDate} onChange={e => set('plannedStartDate', e.target.value)} />
          </div>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save debt'}</button>
      </div>
    </form>
  );
}

function PaymentForm({ debt, onSave, onCancel, defaultAmount }) {
  const [form, setForm] = useState({ amount: defaultAmount ? String(defaultAmount) : '', date: new Date().toISOString().slice(0, 10), notes: '' });

  async function submit(e) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <form onSubmit={submit} className="space-y-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 mt-3">
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Log a payment for {debt.name}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Amount (₱)</label>
          <input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder={String(debt.minPayment)} required />
        </div>
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
        </div>
      </div>
      <div>
        <label className="label">Notes (optional)</label>
        <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Monthly minimum" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" className="btn-primary flex-1">Log payment</button>
      </div>
    </form>
  );
}

function BalanceUpdateForm({ debt, onSave, onCancel }) {
  const [form, setForm] = useState({ newBalance: '', date: new Date().toISOString().slice(0, 10), notes: '' });
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  const diff = form.newBalance !== '' ? Number(form.newBalance) - Number(debt.currentBalance) : null;

  return (
    <form onSubmit={submit} className="space-y-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mt-3">
      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Sync balance from statement</p>
      <p className="text-xs text-amber-700 dark:text-amber-400">
        Current balance: <strong>{formatPHP(debt.currentBalance)}</strong>. Enter the balance shown on your statement to correct for interest and fees.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">New balance (₱)</label>
          <input className="input" type="number" min="0" step="0.01" value={form.newBalance} onChange={e => setForm(f => ({ ...f, newBalance: e.target.value }))} placeholder="0.00" required autoFocus />
          {diff !== null && (
            <p className={`text-xs mt-1 ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-600 dark:text-green-400' : 'text-neutral-400'}`}>
              {diff > 0 ? `↑ ${formatPHP(diff)} (interest / fees)` : diff < 0 ? `↓ ${formatPHP(Math.abs(diff))} reduction` : 'No change'}
            </p>
          )}
        </div>
        <div>
          <label className="label">Statement date</label>
          <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
        </div>
      </div>
      <div>
        <label className="label">Notes (optional)</label>
        <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. April statement" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Update balance'}</button>
      </div>
    </form>
  );
}

function AmortizationTable({ debtId }) {
  const [entries, setEntries] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    api.get(`/debts/${debtId}/amortization`).then(r => setEntries(r.data));
  }, [debtId]);

  async function generate() {
    setGenerating(true);
    try {
      const r = await api.post(`/debts/${debtId}/amortization/generate`, { startDate });
      setEntries(r.data);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mt-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4">
      <div className="mb-3">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Payoff Timeline</p>
        <div className="flex items-center gap-2">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input w-auto text-xs flex-1" />
          <button onClick={generate} disabled={generating} className="btn-primary text-xs shrink-0">
            <Zap size={13} />
            {generating ? 'Generating…' : entries?.length ? 'Regenerate' : 'Generate'}
          </button>
        </div>
      </div>
      {entries && entries.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-neutral-400 dark:text-neutral-500 border-b border-neutral-200 dark:border-neutral-700">
                <th className="text-left py-1.5 pr-3">#</th>
                <th className="text-left py-1.5 pr-3">Date</th>
                <th className="text-right py-1.5 pr-3">Payment</th>
                <th className="text-right py-1.5 pr-3">Principal</th>
                <th className="text-right py-1.5 pr-3">Interest</th>
                <th className="text-right py-1.5">Balance</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 24).map(e => (
                <tr key={e.id} className="border-b border-neutral-100 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400">
                  <td className="py-1.5 pr-3">{e.paymentNumber}</td>
                  <td className="py-1.5 pr-3">{formatDate(e.paymentDate)}</td>
                  <td className="py-1.5 pr-3 text-right">{formatPHP(e.paymentAmount)}</td>
                  <td className="py-1.5 pr-3 text-right text-green-600 dark:text-green-400">{formatPHP(e.principal)}</td>
                  <td className="py-1.5 pr-3 text-right text-red-400 dark:text-red-400">{formatPHP(e.interest)}</td>
                  <td className="py-1.5 text-right font-medium text-neutral-700 dark:text-neutral-300">{formatPHP(e.remainingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length > 24 && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 text-center">Showing first 24 of {entries.length} payments</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-neutral-400 dark:text-neutral-500">No plan yet. Click "Generate" to see how your balance drops each month as you make payments.</p>
      )}
    </div>
  );
}

function AdjustmentHistory({ debtId }) {
  const [adjustments, setAdjustments] = useState(null);

  useEffect(() => {
    api.get(`/debts/${debtId}/balance-adjustments`).then(r => setAdjustments(r.data));
  }, [debtId]);

  if (!adjustments || adjustments.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
      <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide mb-2">Balance adjustment history</p>
      <div className="space-y-1.5">
        {adjustments.map(a => {
          const diff = Number(a.newBalance) - Number(a.previousBalance);
          return (
            <div key={a.id} className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
              <span>{formatDate(a.date)}{a.notes ? ` · ${a.notes}` : ''}</span>
              <span className={diff > 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}>
                {formatPHP(a.previousBalance)} → {formatPHP(a.newBalance)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DebtCard({ debt, onDelete, onPayment, onBalanceUpdate, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showBalanceUpdate, setShowBalanceUpdate] = useState(false);
  const { plan } = useSurplus();
  const planItem = plan.find(a => a.debtId === debt.id);
  const plannedAmount = planItem ? Number(planItem.amount) : null;

  const percent = Number(debt.originalBalance) > 0
    ? ((Number(debt.originalBalance) - Number(debt.currentBalance)) / Number(debt.originalBalance)) * 100
    : 0;

  async function handlePayment(form) {
    await onPayment(debt.id, form);
    setShowPayment(false);
  }

  async function handleBalanceUpdate(form) {
    await onBalanceUpdate(debt.id, form);
    setShowBalanceUpdate(false);
  }

  const isCC = debt.type === 'CREDIT_CARD';

  return (
    <div className="card">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-neutral-800 dark:text-neutral-100">{debt.name}</span>
            {debt.provider && <span className="text-xs text-neutral-400 dark:text-neutral-400">{debt.provider}</span>}
            <span className={`badge ${debtStatusColor(debt.status)}`}>{debt.status === 'PAID_OFF' ? 'Paid off' : debt.status === 'PLANNED' ? 'Planned' : debtTypeLabel(debt.type)}</span>
            <span className="badge bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">{(Number(debt.interestRate) * 100).toFixed(2)}% per year</span>
            {plannedAmount && (
              <span className="badge bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                <Check size={10} /> {formatPHP(plannedAmount)} planned
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{formatPHP(debt.currentBalance)}</span>
            <span className="text-xs text-neutral-400 dark:text-neutral-400">of {formatPHP(debt.originalBalance)} · {formatPercent(percent)} paid</span>
          </div>
          <div className="mt-2">
            <ProgressBar percent={percent} color={debt.status === 'PAID_OFF' ? 'bg-green-500' : 'bg-brand-600'} />
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-400 mt-1.5">
            {debt.type === 'CREDIT_CARD' ? 'Min. payment' : 'Monthly payment'}: {formatPHP(debt.minPayment)}
          </p>
          {debt.status === 'PLANNED' && debt.plannedStartDate && (
            <p className="text-xs text-amber-500 mt-0.5 flex items-center gap-1">
              <Calendar size={11} /> Starts {formatDate(debt.plannedStartDate)}
            </p>
          )}
          {debt.clearDate && (
            <p className="text-xs text-brand-500 dark:text-brand-400 mt-0.5 flex items-center gap-1">
              <Calendar size={11} /> Target clear: {formatDate(debt.clearDate)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
          {debt.status !== 'PAID_OFF' && (
            <button onClick={() => { setShowPayment(s => !s); setShowBalanceUpdate(false); }} className="btn-secondary text-xs">Pay</button>
          )}
          {isCC && debt.status !== 'PAID_OFF' && (
            <button
              onClick={() => { setShowBalanceUpdate(s => !s); setShowPayment(false); }}
              className="btn-secondary text-xs"
              title="Sync balance from your statement"
            >
              <RefreshCw size={12} /> Sync
            </button>
          )}
          <button onClick={() => onEdit(debt)} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700">
            <Pencil size={15} />
          </button>
          <button onClick={() => setExpanded(s => !s)} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button onClick={() => onDelete(debt.id)} className="p-1.5 rounded-lg text-neutral-300 dark:text-neutral-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {showPayment && <PaymentForm debt={debt} onSave={handlePayment} onCancel={() => setShowPayment(false)} defaultAmount={plannedAmount ?? Number(debt.minPayment)} />}
      {showBalanceUpdate && <BalanceUpdateForm debt={debt} onSave={handleBalanceUpdate} onCancel={() => setShowBalanceUpdate(false)} />}
      {expanded && (
        <>
          <AmortizationTable debtId={debt.id} />
          {isCC && <AdjustmentHistory debtId={debt.id} />}
        </>
      )}
    </div>
  );
}

export default function Debts() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [showTip, setShowTip] = useState(() => !localStorage.getItem('debt-tip-dismissed'));

  async function load() {
    const r = await api.get('/debts');
    setDebts(r.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addDebt(data) {
    await api.post('/debts', data);
    setShowForm(false);
    load();
  }

  async function updateDebt(data) {
    await api.put(`/debts/${editingDebt.id}`, data);
    setEditingDebt(null);
    load();
  }

  async function deleteDebt(id) {
    if (!confirm('Delete this debt? This cannot be undone.')) return;
    await api.delete(`/debts/${id}`);
    load();
  }

  async function logPayment(debtId, form) {
    await api.post(`/debts/${debtId}/payment`, form);
    load();
  }

  async function syncBalance(debtId, form) {
    await api.post(`/debts/${debtId}/balance-adjustment`, { newBalance: form.newBalance, date: form.date, notes: form.notes });
    load();
  }

  const active  = debts.filter(d => d.status === 'ACTIVE');
  const planned = debts.filter(d => d.status === 'PLANNED');
  const paidOff = debts.filter(d => d.status === 'PAID_OFF');

  if (loading) return <div className="flex items-center justify-center h-64 text-neutral-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Debts</h1>
        <p className="text-sm text-neutral-400 dark:text-neutral-400">Sorted by interest rate — highest first, to save you the most money overall.</p>
        <button onClick={() => { setShowForm(s => !s); setEditingDebt(null); }} className="btn-primary mt-3">
          <Plus size={15} /> Add debt
        </button>
      </div>

      {showTip && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
          <span className="text-xl shrink-0 mt-0.5">💡</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Interest-First Strategy</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Your debts are ordered by interest rate (highest first). By putting any extra cash toward Debt #1, you pay the least total interest over time — this is the fastest path to being debt-free.
            </p>
          </div>
          <button
            onClick={() => { setShowTip(false); localStorage.setItem('debt-tip-dismissed', '1'); }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {showForm && (
        <div className="card">
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-4">New debt</h2>
          <DebtForm onSave={addDebt} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {editingDebt && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-neutral-800 dark:text-neutral-100">Edit — {editingDebt.name}</h2>
            <button onClick={() => setEditingDebt(null)} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700">
              <X size={16} />
            </button>
          </div>
          <DebtForm
            initial={{
              name: editingDebt.name,
              provider: editingDebt.provider || '',
              type: editingDebt.type,
              status: editingDebt.status,
              currentBalance: String(editingDebt.currentBalance),
              originalBalance: String(editingDebt.originalBalance),
              interestRate: String((Number(editingDebt.interestRate) * 100).toFixed(2)),
              minPayment: String(editingDebt.minPayment),
              plannedStartDate: editingDebt.plannedStartDate ? new Date(editingDebt.plannedStartDate).toISOString().slice(0, 10) : '',
              clearDate: editingDebt.clearDate ? new Date(editingDebt.clearDate).toISOString().slice(0, 10) : '',
            }}
            onSave={updateDebt}
            onCancel={() => setEditingDebt(null)}
          />
        </div>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">Active debts</h2>
          <div className="space-y-3">
            {active.map((d, i) => (
              <div key={d.id} className="relative">
                <span className="absolute -left-1 top-4 w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold z-10">
                  {i + 1}
                </span>
                <div className="pl-6">
                  <DebtCard debt={d} onDelete={deleteDebt} onPayment={logPayment} onBalanceUpdate={syncBalance} onEdit={setEditingDebt} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {planned.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">Upcoming / planned</h2>
          <div className="space-y-3">
            {planned.map(d => <DebtCard key={d.id} debt={d} onDelete={deleteDebt} onPayment={logPayment} onBalanceUpdate={syncBalance} onEdit={setEditingDebt} />)}
          </div>
        </section>
      )}

      {paidOff.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">Paid off 🎉</h2>
          <div className="space-y-3">
            {paidOff.map(d => <DebtCard key={d.id} debt={d} onDelete={deleteDebt} onPayment={logPayment} onBalanceUpdate={syncBalance} onEdit={setEditingDebt} />)}
          </div>
        </section>
      )}

      {debts.length === 0 && !showForm && (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">💳</p>
          <p className="font-medium text-neutral-800 dark:text-neutral-100">No debts added yet</p>
          <p className="text-sm text-neutral-400 dark:text-neutral-400 mt-1">Add your credit cards and loans to start tracking.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4">
            <Plus size={15} /> Add your first debt
          </button>
        </div>
      )}
    </div>
  );
}
