import { useEffect, useState } from 'react';
import { X, Wand2, Target } from 'lucide-react';
import api from '../lib/api.js';
import { formatPHP } from '../lib/utils.js';

export default function SurplusModal({ month, onClose }) {
  const [data, setData] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [goals, setGoals] = useState([]);
  const [goalAllocations, setGoalAllocations] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/surplus/${month}`),
      api.get('/goals'),
    ]).then(([surplusRes, goalsRes]) => {
      setData(surplusRes.data);
      setAllocations(surplusRes.data.suggestion.map(a => ({ ...a, amount: String(Number(a.amount).toFixed(2)) })));
      const activeGoals = goalsRes.data.filter(g =>
        g.targetAmount == null || Number(g.currentAmount) < Number(g.targetAmount)
      );
      setGoals(activeGoals);
      setGoalAllocations(Object.fromEntries(activeGoals.map(g => [g.id, ''])));
      setLoading(false);
    });
  }, [month]);

  function autoSplit() {
    setAllocations(data.suggestion.map(a => ({ ...a, amount: String(Number(a.amount).toFixed(2)) })));
    setGoalAllocations(Object.fromEntries(goals.map(g => [g.id, ''])));
  }

  function updateAmount(debtId, value) {
    setAllocations(prev => prev.map(a => a.debtId === debtId ? { ...a, amount: value } : a));
  }

  function updateGoalAmount(goalId, value) {
    setGoalAllocations(prev => ({ ...prev, [goalId]: value }));
  }

  const totalDebtAllocated = allocations.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
  const totalGoalAllocated = Object.values(goalAllocations).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const totalAllocated = totalDebtAllocated + totalGoalAllocated;
  const remaining = data ? data.surplus - totalAllocated : 0;

  async function confirm() {
    setSaving(true);
    try {
      await api.post(`/surplus/${month}/confirm`, {
        allocations: allocations.map(a => ({ ...a, amount: parseFloat(a.amount) || 0 })),
        totalSurplus: data.surplus,
        totalGoalAllocated,
      });

      // Log goal contributions for any goal with an allocation
      const today = new Date().toISOString().slice(0, 10);
      const goalUpdates = goals
        .filter(g => parseFloat(goalAllocations[g.id]) > 0)
        .map(g => api.post(`/goals/${g.id}/contribution`, {
          amount: parseFloat(goalAllocations[g.id]),
          date: today,
          notes: `Unbudgeted allocation — ${month}`,
        }));
      await Promise.all(goalUpdates);

      setSaved(true);
      setTimeout(onClose, 1200);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 dark:bg-black/50 px-4 pb-4 sm:pb-0">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-700">
          <div>
            {data ? (
              <>
                <h2 className="font-semibold text-neutral-800 dark:text-neutral-100">
                  {data.surplus > 0
                    ? <>Where should your unbudgeted <span className="text-green-600 dark:text-green-400">{formatPHP(data.surplus)}</span> go?</>
                    : 'Nothing unbudgeted this month'}
                </h2>
                <p className="text-xs text-neutral-400 dark:text-neutral-400 mt-0.5 max-w-xs">
                  {data.surplus > 0
                    ? 'Use the magic wand to put it toward your highest-interest debt first, or split it manually between your debts and goals.'
                    : 'Your income covered your expenses and debt payments — nothing left to distribute.'}
                </p>
                <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-700 text-xs space-y-1.5">
                  <div className="flex justify-between gap-4">
                    <span className="text-neutral-500 dark:text-neutral-400">Income</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">{formatPHP(data.totalIncome)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Expenses
                      {data.totalAllocated > data.totalExpenses && (
                        <span className="text-neutral-400 dark:text-neutral-500"> · {formatPHP(data.totalExpenses)} spent</span>
                      )}
                    </span>
                    <span className="font-medium text-neutral-600 dark:text-neutral-300">− {formatPHP(data.totalAllocated > data.totalExpenses ? data.totalAllocated : data.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-neutral-500 dark:text-neutral-400">Debt paid</span>
                    <span className="font-medium text-brand-600 dark:text-brand-400">− {formatPHP(data.totalDebtPaid)}</span>
                  </div>
                  {data.carryover > 0 && (
                    <div className="flex justify-between gap-4">
                      <span className="text-green-600 dark:text-green-400">From prior months</span>
                      <span className="text-green-600 dark:text-green-400 font-medium">+ {formatPHP(data.carryover)}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-100">Unbudgeted</h2>
            )}
          </div>
          <button onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12 text-neutral-400">Loading…</div>
        ) : (
          <>
            <div className="px-5 py-3 bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-100 dark:border-neutral-700 flex items-center gap-3">
              <button
                onClick={autoSplit}
                className="btn-secondary text-xs gap-1.5"
                title="Pays off your highest-interest debt first, then works down — minimises the total interest you pay over time."
              >
                <Wand2 size={13} />
                Auto-split
                <span className="text-neutral-400 dark:text-neutral-500 font-normal hidden sm:inline">· highest interest first</span>
              </button>
              <span className={`text-xs ml-auto font-medium ${Math.abs(remaining) < 0.01 ? 'text-green-600 dark:text-green-400' : 'text-amber-500 dark:text-amber-400'}`}>
                {Math.abs(remaining) < 0.01
                  ? '✓ Fully allocated'
                  : `${formatPHP(Math.abs(remaining))} ${remaining > 0 ? 'unallocated' : 'over'}`}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {/* Debt allocations */}
              {allocations.length === 0 && goals.length === 0 && (
                <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-6">No active debts or goals to allocate to.</p>
              )}
              {allocations.map((a, i) => (
                <div key={a.debtId} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-neutral-300 dark:text-neutral-600 font-bold">#{i + 1}</span>
                      <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{a.name}</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    <span className="text-sm text-neutral-400 dark:text-neutral-500">₱</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={a.amount}
                      onChange={e => updateAmount(a.debtId, e.target.value)}
                      className="input w-32 text-right"
                    />
                  </div>
                </div>
              ))}

              {/* Goal allocations */}
              {goals.length > 0 && (
                <>
                  <div className="flex items-center gap-2 pt-2 pb-1">
                    <Target size={13} className="text-neutral-400 dark:text-neutral-500" />
                    <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">Goals</span>
                  </div>
                  {goals.map(goal => {
                    const hasTarget = goal.targetAmount != null && Number(goal.targetAmount) > 0;
                    const remaining = hasTarget ? Number(goal.targetAmount) - Number(goal.currentAmount) : null;
                    return (
                      <div key={goal.id} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate block">{goal.name}</span>
                          <span className="text-xs text-neutral-400 dark:text-neutral-500">
                            {remaining !== null ? `${formatPHP(remaining)} remaining` : `${formatPHP(goal.currentAmount)} saved`}
                          </span>
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          <span className="text-sm text-neutral-400 dark:text-neutral-500">₱</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            max={remaining ?? undefined}
                            value={goalAllocations[goal.id]}
                            onChange={e => updateGoalAmount(goal.id, e.target.value)}
                            className="input w-32 text-right"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <div className="px-5 py-4 border-t border-neutral-100 dark:border-neutral-700 flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button onClick={confirm} disabled={saving || saved} className="btn-primary flex-1">
                {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Plan'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
