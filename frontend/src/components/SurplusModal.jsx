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
      const activeGoals = goalsRes.data.filter(g => Number(g.currentAmount) < Number(g.targetAmount));
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
      });

      // Update goal progress for any goal with an allocation
      const goalUpdates = goals
        .filter(g => parseFloat(goalAllocations[g.id]) > 0)
        .map(g => api.put(`/goals/${g.id}`, {
          currentAmount: Math.min(
            Number(g.targetAmount),
            Number(g.currentAmount) + (parseFloat(goalAllocations[g.id]) || 0),
          ),
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Allocate Surplus</h2>
            {data && (
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 space-y-0.5">
                <p>Income: <span className="text-green-600 dark:text-green-400 font-medium">{formatPHP(data.totalIncome)}</span></p>
                <p>
                  Expenses: <span className="font-medium text-slate-600 dark:text-slate-300">{formatPHP(data.totalExpenses)}</span>
                  {' · '}Debt paid: <span className="font-medium text-brand-600 dark:text-brand-400">{formatPHP(data.totalDebtPaid)}</span>
                </p>
                <p>Available surplus: <span className={`font-semibold ${data.surplus >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{formatPHP(data.surplus)}</span></p>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12 text-slate-400">Loading…</div>
        ) : (
          <>
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <button onClick={autoSplit} className="btn-secondary text-xs gap-1.5">
                <Wand2 size={13} />
                Auto-split (Avalanche)
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
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No active debts or goals to allocate to.</p>
              )}
              {allocations.map((a, i) => (
                <div key={a.debtId} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-300 dark:text-slate-600 font-bold">#{i + 1}</span>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{a.name}</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    <span className="text-sm text-slate-400 dark:text-slate-500">₱</span>
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
                    <Target size={13} className="text-slate-400 dark:text-slate-500" />
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Goals</span>
                  </div>
                  {goals.map(goal => {
                    const remaining = Number(goal.targetAmount) - Number(goal.currentAmount);
                    return (
                      <div key={goal.id} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate block">{goal.name}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">{formatPHP(remaining)} remaining</span>
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          <span className="text-sm text-slate-400 dark:text-slate-500">₱</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            max={remaining}
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

            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button onClick={confirm} disabled={saving || saved} className="btn-primary flex-1">
                {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Confirm Allocation'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
