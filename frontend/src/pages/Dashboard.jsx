import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingDown, TrendingUp, Wallet, Target, ChevronRight, Plus, CalendarClock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import api from '../lib/api.js';
import { formatPHP, formatDate, formatPercent, debtTypeLabel } from '../lib/utils.js';
import { useMonth } from '../lib/MonthContext.jsx';
import SurplusModal from '../components/SurplusModal.jsx';

function StatCard({ label, value, sub, color = 'text-slate-800 dark:text-slate-100', icon }) {
  return (
    <div className="card flex items-start gap-3">
      {icon && <div className="mt-0.5 text-slate-300 dark:text-slate-600">{icon}</div>}
      <div className="min-w-0">
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">{label}</p>
        <p className={`text-xl font-bold truncate ${color}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ProgressBar({ percent, color = 'bg-brand-600' }) {
  return (
    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
      <div
        className={`${color} h-2 rounded-full transition-all`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

export default function Dashboard() {
  const { month } = useMonth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSurplus, setShowSurplus] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setLoading(true);
    api.get('/dashboard', { params: { month } })
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [month]);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading…</div>;

  const { thisMonth, debts, topDebts, recentTransactions, goals = [], upcomingDeadlines = [] } = data;
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{greeting}, {user.name?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <button onClick={() => setShowSurplus(true)} className="btn-primary shrink-0">
          <Target size={15} />
          Allocate Surplus
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Income this month" value={formatPHP(thisMonth.income)} icon={<Wallet size={18} />} />
        <StatCard label="Expenses logged" value={formatPHP(thisMonth.spent)} icon={<TrendingDown size={18} />} />
        <StatCard
          label="Surplus"
          value={formatPHP(thisMonth.surplus)}
          icon={<TrendingUp size={18} />}
          color={thisMonth.surplus >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}
          sub={`${formatPHP(thisMonth.debtPaid ?? 0)} paid to debts`}
        />
        <StatCard
          label="Total debt remaining"
          value={formatPHP(debts.totalRemaining)}
          icon={<Target size={18} />}
          color="text-red-500 dark:text-red-400"
          sub={`${formatPercent(debts.percentPaid)} paid off`}
        />
      </div>

      {/* Goal progress */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Debt Payoff Goal</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Target: {formatDate(debts.goalDate)}
              {debts.projectedPayoffDate && (
                <span className={`ml-2 font-medium ${debts.onTrack ? 'text-green-600 dark:text-green-400' : 'text-amber-500 dark:text-amber-400'}`}>
                  {debts.onTrack ? '✓ On track' : '⚠ Behind — projected ' + formatDate(debts.projectedPayoffDate)}
                </span>
              )}
            </p>
          </div>
          <span className="text-2xl font-bold text-brand-600">{formatPercent(debts.percentPaid)}</span>
        </div>
        <ProgressBar percent={debts.percentPaid} color={debts.onTrack ? 'bg-green-500' : 'bg-amber-400'} />
        <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mt-1.5">
          <span>₱0</span>
          <span>{formatPHP(debts.totalOriginal)}</span>
        </div>
      </div>

      {/* Upcoming payment deadlines */}
      {upcomingDeadlines.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock size={16} className="text-amber-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Upcoming Payments</h2>
            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">{upcomingDeadlines.length} due in 30 days</span>
          </div>
          <div className="space-y-2">
            {upcomingDeadlines.map((d, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  {d.daysUntilDue <= 7
                    ? <AlertCircle size={14} className="text-red-400 shrink-0" />
                    : <CalendarClock size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{d.debtName}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{formatDate(d.paymentDate)}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{formatPHP(d.paymentAmount)}</p>
                  <p className={`text-xs ${d.daysUntilDue <= 7 ? 'text-red-400' : d.daysUntilDue <= 14 ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}>
                    {d.daysUntilDue === 0 ? 'Today' : `${d.daysUntilDue}d away`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goals summary */}
      {goals.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Goals</h2>
            <Link to="/goals" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              View all <ChevronRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {goals.map(goal => (
              <div key={goal.id} className="card space-y-2 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{goal.name}</p>
                  <span className="text-xs font-bold text-brand-600 shrink-0">{formatPercent(goal.percentComplete)}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-brand-500 transition-all"
                    style={{ width: `${Math.min(100, goal.percentComplete)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500">
                  <span>{formatPHP(goal.currentAmount)}</span>
                  <span>{formatPHP(goal.targetAmount)}</span>
                </div>
                {goal.deadline && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">Due {formatDate(goal.deadline)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Top debts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Priority Debts</h2>
            <Link to="/debts" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              View all <ChevronRight size={13} />
            </Link>
          </div>
          {topDebts.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <p className="text-sm">No debts added yet.</p>
              <Link to="/debts" className="btn-primary mt-3 text-xs inline-flex"><Plus size={13} /> Add a debt</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {topDebts.map((debt, i) => (
                <div key={debt.id}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-300 dark:text-slate-600">#{i + 1}</span>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{debt.name}</span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{debtTypeLabel(debt.type)} · {(debt.interestRate * 100).toFixed(1)}% p.a.</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 shrink-0">{formatPHP(debt.currentBalance)}</span>
                  </div>
                  <ProgressBar percent={debt.percentPaid} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Recent Expenses</h2>
            <Link to="/transactions" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              View all <ChevronRight size={13} />
            </Link>
          </div>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <p className="text-sm">No expenses logged yet.</p>
              <Link to="/budget" className="btn-primary mt-3 text-xs inline-flex"><Plus size={13} /> Log an expense</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{tx.category?.icon ?? '📦'}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 dark:text-slate-100 truncate">{tx.description || tx.category?.name || 'Expense'}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{formatDate(tx.date)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100 shrink-0">{formatPHP(tx.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showSurplus && <SurplusModal month={month} onClose={() => setShowSurplus(false)} />}
    </div>
  );
}
