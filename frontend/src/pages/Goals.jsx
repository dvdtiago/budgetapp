import { useState, useEffect } from 'react';
import { Target, Plus, Pencil, Trash2, X, Check, PiggyBank } from 'lucide-react';
import ColorPicker from '../components/ColorPicker.jsx';
import api from '../lib/api.js';
import { formatPHP, formatDate, formatPercent } from '../lib/utils.js';

const GOAL_TYPES = [
  { value: 'SAVINGS', label: 'Savings' },
  { value: 'DEBT_FREE', label: 'Debt Free' },
  { value: 'PURCHASE', label: 'Purchase' },
];

const TYPE_COLORS = {
  SAVINGS:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  DEBT_FREE:'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  PURCHASE: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
};

const PROGRESS_COLORS = {
  SAVINGS:  'bg-emerald-500',
  DEBT_FREE:'bg-blue-500',
  PURCHASE: 'bg-violet-500',
};

function emptyForm() {
  return { name: '', type: 'SAVINGS', targetAmount: '', monthlyTarget: '', currentAmount: '', deadline: '', notes: '', color: '' };
}

function GoalForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? emptyForm());
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        targetAmount: form.targetAmount !== '' ? Number(form.targetAmount) : null,
        monthlyTarget: form.monthlyTarget !== '' ? Number(form.monthlyTarget) : null,
        currentAmount: Number(form.currentAmount) || 0,
        deadline: form.deadline || null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Goal Name</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Emergency Fund" />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
            {GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Target Amount (₱) <span className="text-neutral-400 font-normal normal-case">(optional)</span></label>
          <input className="input" type="number" min="0" step="0.01" value={form.targetAmount} onChange={e => set('targetAmount', e.target.value)} placeholder="Leave blank for open-ended" />
        </div>
        <div>
          <label className="label">Monthly target (₱) <span className="text-neutral-400 font-normal normal-case">(optional)</span></label>
          <input className="input" type="number" min="0" step="0.01" value={form.monthlyTarget} onChange={e => set('monthlyTarget', e.target.value)} placeholder="e.g. 5,000/mo" />
          <p className="text-xs text-neutral-400 mt-1">Shows a progress bar in the Budget page.</p>
        </div>
        <div>
          <label className="label">Opening Balance (₱)</label>
          <input className="input" type="number" min="0" step="0.01" value={form.currentAmount} onChange={e => set('currentAmount', e.target.value)} placeholder="0.00" />
          <p className="text-xs text-neutral-400 mt-1">Amount already saved before tracking started.</p>
        </div>
        <div>
          <label className="label">Deadline (optional)</label>
          <input className="input" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notes (optional)</label>
          <input className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes..." />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Color (optional)</label>
          <ColorPicker value={form.color} onChange={color => set('color', color)} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Goal'}</button>
      </div>
    </form>
  );
}

function ContributionForm({ goal, onSave, onCancel }) {
  const [form, setForm] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });
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

  const remaining = goal.targetAmount ? Number(goal.targetAmount) - Number(goal.currentAmount) : null;

  return (
    <form onSubmit={submit} className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700 space-y-3">
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
        <PiggyBank size={14} className="text-emerald-500" /> Add to {goal.name}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Amount (₱)</label>
          <input
            className="input"
            type="number" min="0" step="0.01"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder={remaining ? String(remaining.toFixed(2)) : '0.00'}
            required
            autoFocus
          />
          {remaining !== null && (
            <p className="text-xs text-neutral-400 mt-1">{formatPHP(remaining)} remaining to target.</p>
          )}
        </div>
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
        </div>
      </div>
      <div>
        <label className="label">Notes (optional)</label>
        <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Monthly contribution" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

function ProgressBar({ percent, type, hexColor }) {
  return (
    <div className="w-full bg-neutral-100 dark:bg-neutral-700 rounded-full h-1.5">
      <div
        className={`h-1.5 rounded-full transition-all ${hexColor ? '' : (PROGRESS_COLORS[type] ?? 'bg-blue-500')}`}
        style={{ width: `${Math.min(100, percent)}%`, ...(hexColor ? { backgroundColor: hexColor } : {}) }}
      />
    </div>
  );
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [contributing, setContributing] = useState(null); // goalId

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/goals');
      setGoals(r.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data) {
    const r = await api.post('/goals', data);
    setGoals(g => [...g, r.data]);
    setShowForm(false);
  }

  async function handleEdit(data) {
    const r = await api.put(`/goals/${editing.id}`, data);
    setGoals(g => g.map(x => x.id === editing.id ? r.data : x));
    setEditing(null);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this goal? All contribution history will also be removed.')) return;
    await api.delete(`/goals/${id}`);
    setGoals(g => g.filter(x => x.id !== id));
  }

  async function handleContribution(goal, form) {
    await api.post(`/goals/${goal.id}/contribution`, form);
    setContributing(null);
    load(); // refresh to get updated currentAmount
  }

  if (loading) return <div className="flex items-center justify-center h-40 text-neutral-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Goals</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Track savings targets and milestones</p>
        </div>
        {!showForm && !editing && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Goal
          </button>
        )}
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 mb-4">New Goal</h2>
          <GoalForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {goals.length === 0 && !showForm ? (
        <div className="card flex flex-col items-center py-16 text-center gap-3">
          <Target size={36} className="text-neutral-300 dark:text-neutral-600" />
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">No goals yet. Create one to start tracking your progress.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-1 flex items-center gap-2">
            <Plus size={15} /> New Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(goal => {
            const hasTarget = goal.targetAmount != null && Number(goal.targetAmount) > 0;
            const percent = hasTarget
              ? Math.min(100, (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100)
              : 0;
            const done = hasTarget && percent >= 100;
            const days = daysUntil(goal.deadline);

            if (editing?.id === goal.id) {
              return (
                <div key={goal.id} className="card md:col-span-2">
                  <h2 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 mb-4">Edit Goal</h2>
                  <GoalForm
                    initial={{
                      name: goal.name,
                      type: goal.type,
                      targetAmount: goal.targetAmount != null ? String(goal.targetAmount) : '',
                      monthlyTarget: goal.monthlyTarget != null ? String(goal.monthlyTarget) : '',
                      currentAmount: String(goal.currentAmount),
                      deadline: goal.deadline ? goal.deadline.slice(0, 10) : '',
                      notes: goal.notes ?? '',
                      color: goal.color ?? '',
                    }}
                    onSave={handleEdit}
                    onCancel={() => setEditing(null)}
                  />
                </div>
              );
            }

            return (
              <div key={goal.id} className="card space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-neutral-800 dark:text-neutral-100 truncate">{goal.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[goal.type]}`}>
                        {GOAL_TYPES.find(t => t.value === goal.type)?.label}
                      </span>
                      {done && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 flex items-center gap-1">
                          <Check size={11} /> Complete
                        </span>
                      )}
                    </div>
                    {goal.notes && <p className="text-xs text-neutral-400 mt-0.5 truncate">{goal.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setEditing(goal)} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(goal.id)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1.5">
                    <span>{formatPHP(goal.currentAmount)} saved</span>
                    {hasTarget && <span>{formatPercent(percent)} of {formatPHP(goal.targetAmount)}</span>}
                  </div>
                  {hasTarget && <ProgressBar percent={percent} type={goal.type} hexColor={goal.color} />}
                </div>

                {/* Deadline + contribute */}
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-neutral-400 dark:text-neutral-400">
                    {goal.deadline ? (
                      days === null ? null : days < 0
                        ? <span className="text-red-500">Overdue by {Math.abs(days)} days</span>
                        : days === 0
                        ? <span className="text-amber-500">Due today</span>
                        : days <= 30
                        ? <span className="text-amber-500">Due in {days} days — {formatDate(goal.deadline)}</span>
                        : <span>Due {formatDate(goal.deadline)}</span>
                    ) : <span>No deadline set</span>}
                  </div>

                  {!done && contributing !== goal.id && (
                    <button
                      onClick={() => setContributing(goal.id)}
                      className="btn-secondary text-xs"
                    >
                      <PiggyBank size={13} /> Add funds
                    </button>
                  )}
                </div>

                {/* Contribution form */}
                {contributing === goal.id && (
                  <ContributionForm
                    goal={goal}
                    onSave={form => handleContribution(goal, form)}
                    onCancel={() => setContributing(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
