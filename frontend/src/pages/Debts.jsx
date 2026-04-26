import { useEffect, useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Trash2, Zap, Calendar } from 'lucide-react';
import api from '../lib/api.js';
import { formatPHP, formatDate, formatPercent, debtTypeLabel, debtStatusColor } from '../lib/utils.js';

const DEBT_TYPES = ['CREDIT_CARD', 'LOAN', 'MORTGAGE'];

function ProgressBar({ percent, color = 'bg-brand-600' }) {
  return (
    <div className="w-full bg-neutral-100 rounded-full h-1.5">
      <div className={`${color} h-1.5 rounded-full`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

function DebtForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    name: '', provider: '', type: 'CREDIT_CARD', status: 'ACTIVE',
    currentBalance: '', originalBalance: '', interestRate: '', minPayment: '',
    plannedStartDate: '',
  });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    await onSave({
      ...form,
      interestRate: Number(form.interestRate) / 100,
      currentBalance: Number(form.currentBalance),
      originalBalance: Number(form.originalBalance),
      minPayment: Number(form.minPayment),
    });
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
        </div>
        <div>
          <label className="label">Original balance (₱)</label>
          <input className="input" type="number" min="0" step="0.01" value={form.originalBalance} onChange={e => set('originalBalance', e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Interest rate (% per year)</label>
          <input className="input" type="number" min="0" step="0.01" value={form.interestRate} onChange={e => set('interestRate', e.target.value)} placeholder="e.g. 24" required />
        </div>
        <div>
          <label className="label">Monthly payment (₱)</label>
          <input className="input" type="number" min="0" step="0.01" value={form.minPayment} onChange={e => set('minPayment', e.target.value)} required />
        </div>
      </div>
      {form.status === 'PLANNED' && (
        <div>
          <label className="label">Planned start date</label>
          <input className="input" type="date" value={form.plannedStartDate} onChange={e => set('plannedStartDate', e.target.value)} />
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" className="btn-primary flex-1">Save debt</button>
      </div>
    </form>
  );
}

function PaymentForm({ debt, onSave, onCancel }) {
  const [form, setForm] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });

  async function submit(e) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <form onSubmit={submit} className="space-y-3 bg-neutral-50 rounded-xl p-4 mt-3">
      <p className="text-sm font-medium text-neutral-700">Log a payment for {debt.name}</p>
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
    <div className="mt-3 bg-neutral-50 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <p className="text-sm font-medium text-neutral-700 flex-1">Amortization Schedule</p>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input w-auto text-xs" />
        <button onClick={generate} disabled={generating} className="btn-primary text-xs">
          <Zap size={13} />
          {generating ? 'Generating…' : entries?.length ? 'Regenerate' : 'Generate'}
        </button>
      </div>
      {entries && entries.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-neutral-400 border-b border-neutral-200">
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
                <tr key={e.id} className="border-b border-neutral-100 text-neutral-600">
                  <td className="py-1.5 pr-3">{e.paymentNumber}</td>
                  <td className="py-1.5 pr-3">{formatDate(e.paymentDate)}</td>
                  <td className="py-1.5 pr-3 text-right">{formatPHP(e.paymentAmount)}</td>
                  <td className="py-1.5 pr-3 text-right text-green-600">{formatPHP(e.principal)}</td>
                  <td className="py-1.5 pr-3 text-right text-red-400">{formatPHP(e.interest)}</td>
                  <td className="py-1.5 text-right font-medium">{formatPHP(e.remainingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length > 24 && (
            <p className="text-xs text-neutral-400 mt-2 text-center">Showing first 24 of {entries.length} payments</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-neutral-400">No schedule yet. Click "Generate" to build the amortization table from the current balance.</p>
      )}
    </div>
  );
}

function DebtCard({ debt, onDelete, onPayment, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const percent = Number(debt.originalBalance) > 0
    ? ((Number(debt.originalBalance) - Number(debt.currentBalance)) / Number(debt.originalBalance)) * 100
    : 0;

  async function handlePayment(form) {
    await onPayment(debt.id, form);
    setShowPayment(false);
  }

  return (
    <div className="card">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-neutral-800">{debt.name}</span>
            {debt.provider && <span className="text-xs text-neutral-400">{debt.provider}</span>}
            <span className={`badge ${debtStatusColor(debt.status)}`}>{debt.status === 'PAID_OFF' ? 'Paid off' : debt.status === 'PLANNED' ? 'Planned' : debtTypeLabel(debt.type)}</span>
            <span className="badge bg-red-50 text-red-600">{(Number(debt.interestRate) * 100).toFixed(2)}% p.a.</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-bold text-neutral-800">{formatPHP(debt.currentBalance)}</span>
            <span className="text-xs text-neutral-400">of {formatPHP(debt.originalBalance)} · {formatPercent(percent)} paid</span>
          </div>
          <div className="mt-2">
            <ProgressBar percent={percent} color={debt.status === 'PAID_OFF' ? 'bg-green-500' : 'bg-brand-600'} />
          </div>
          <p className="text-xs text-neutral-400 mt-1.5">Monthly payment: {formatPHP(debt.minPayment)}</p>
          {debt.status === 'PLANNED' && debt.plannedStartDate && (
            <p className="text-xs text-amber-500 mt-0.5 flex items-center gap-1">
              <Calendar size={11} /> Starts {formatDate(debt.plannedStartDate)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {debt.status !== 'PAID_OFF' && (
            <button onClick={() => setShowPayment(s => !s)} className="btn-secondary text-xs">Pay</button>
          )}
          <button onClick={() => setExpanded(s => !s)} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button onClick={() => onDelete(debt.id)} className="p-1.5 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {showPayment && <PaymentForm debt={debt} onSave={handlePayment} onCancel={() => setShowPayment(false)} />}
      {expanded && <AmortizationTable debtId={debt.id} />}
    </div>
  );
}

export default function Debts() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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

  async function deleteDebt(id) {
    if (!confirm('Delete this debt? This cannot be undone.')) return;
    await api.delete(`/debts/${id}`);
    load();
  }

  async function logPayment(debtId, form) {
    await api.post(`/debts/${debtId}/payment`, form);
    load();
  }

  const active = debts.filter(d => d.status === 'ACTIVE');
  const planned = debts.filter(d => d.status === 'PLANNED');
  const paidOff = debts.filter(d => d.status === 'PAID_OFF');

  if (loading) return <div className="flex items-center justify-center h-64 text-neutral-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-800">Debts</h1>
          <p className="text-sm text-neutral-400">Sorted by interest rate — highest first (Avalanche method)</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary">
          <Plus size={15} /> Add debt
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="font-semibold text-neutral-800 mb-4">New debt</h2>
          <DebtForm onSave={addDebt} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Active debts</h2>
          <div className="space-y-3">
            {active.map((d, i) => (
              <div key={d.id} className="relative">
                <span className="absolute -left-1 top-4 w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold z-10">
                  {i + 1}
                </span>
                <div className="pl-6">
                  <DebtCard debt={d} onDelete={deleteDebt} onPayment={logPayment} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {planned.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Upcoming / planned</h2>
          <div className="space-y-3">
            {planned.map(d => <DebtCard key={d.id} debt={d} onDelete={deleteDebt} onPayment={logPayment} />)}
          </div>
        </section>
      )}

      {paidOff.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Paid off 🎉</h2>
          <div className="space-y-3">
            {paidOff.map(d => <DebtCard key={d.id} debt={d} onDelete={deleteDebt} onPayment={logPayment} />)}
          </div>
        </section>
      )}

      {debts.length === 0 && !showForm && (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">💳</p>
          <p className="font-medium text-neutral-800">No debts added yet</p>
          <p className="text-sm text-neutral-400 mt-1">Add your credit cards and loans to start tracking.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4">
            <Plus size={15} /> Add your first debt
          </button>
        </div>
      )}
    </div>
  );
}
