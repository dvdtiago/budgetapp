import { useState, useEffect } from 'react';
import { Target, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import api from '../lib/api.js';
import { formatPHP, formatDate, formatPercent } from '../lib/utils.js';

const GOAL_TYPES = [
  { value: 'SAVINGS', label: 'Savings' },
  { value: 'DEBT_FREE', label: 'Debt Free' },
  { value: 'PURCHASE', label: 'Purchase' },
];

const TYPE_COLORS = {
  SAVINGS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  DEBT_FREE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  PURCHASE: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
};

const PROGRESS_COLORS = {
  SAVINGS: 'bg-emerald-500',
  DEBT_FREE: 'bg-blue-500',
  PURCHASE: 'bg-violet-500',
};

function emptyForm() {
  return { name: '', type: 'SAVINGS', targetAmount: '', currentAmount: '', deadline: '', notes: '' };
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
        targetAmount: Number(form.targetAmount),
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
          <label className="label">Target Amount (₱)</label>
          <input className="input" type="number" min="0" step="0.01" value={form.targetAmount} onChange={e => set('targetAmount', e.target.value)} required placeholder="0.00" />
        </div>
        <div>
          <label className="label">Current Amount (₱)</label>
          <input className="input" type="number" min="0" step="0.01" value={form.currentAmount} onChange={e => set('currentAmount', e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="label">Deadline (optional)</label>
          <input className="input" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notes (optional)</label>
          <input className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes..." />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Goal'}</button>
      </div>
    </form>
  );
}

function ProgressBar({ percent, type }) {
  return (
    <div className="w-full bg-neutral-100 dark:bg-neutral-700 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${PROGRESS_COLORS[type] ?? 'bg-brand-500'}`}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

function projectedDate(goal) {
  if (!goal.deadline || goal.targetAmount <= 0) return null;
  const remaining = goal.targetAmount - goal.currentAmount;
  if (remaining <= 0) return null;
  return new Date(goal.deadline);
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [progressEdit, setProgressEdit] = useState(null);
  const [progressVal, setProgressVal] = useState('');

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
    if (!confirm('Delete this goal?')) return;
    await api.delete(`/goals/${id}`);
    setGoals(g => g.filter(x => x.id !== id));
  }

  async function saveProgress(goal) {
    const val = Number(progressVal);
    if (isNaN(val)) return;
    const r = await api.put(`/goals/${goal.id}`, { currentAmount: val });
    setGoals(g => g.map(x => x.id === goal.id ? r.data : x));
    setProgressEdit(null);
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
            const percent = Number(goal.targetAmount) > 0
              ? Math.min(100, (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100)
              : 0;
            const done = percent >= 100;
            const days = daysUntil(goal.deadline);

            if (editing?.id === goal.id) {
              return (
                <div key={goal.id} className="card md:col-span-2">
                  <h2 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 mb-4">Edit Goal</h2>
                  <GoalForm
                    initial={{
                      name: goal.name,
                      type: goal.type,
                      targetAmount: String(goal.targetAmount),
                      currentAmount: String(goal.currentAmount),
                      deadline: goal.deadline ? goal.deadline.slice(0, 10) : '',
                      notes: goal.notes ?? '',
                    }}
                    onSave={handleEdit}
                    onCancel={() => setEditing(null)}
                  />
                </div>
              );
            }

            return (
              <div key={goal.id} className="card space-y-3">
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

                <div>
                  <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1.5">
                    <span>{formatPHP(goal.currentAmount)} saved</span>
                    <span>{formatPercent(percent)} of {formatPHP(goal.targetAmount)}</span>
                  </div>
                  <ProgressBar percent={percent} type={goal.type} />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-neutral-400 dark:text-neutral-500">
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

                  {progressEdit === goal.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-neutral-400">₱</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input py-1 text-sm w-28"
                        value={progressVal}
                        onChange={e => setProgressVal(e.target.value)}
                        autoFocus
                      />
                      <button onClick={() => saveProgress(goal)} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setProgressEdit(null)} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setProgressEdit(goal.id); setProgressVal(String(goal.currentAmount)); }}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      Update progress
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
