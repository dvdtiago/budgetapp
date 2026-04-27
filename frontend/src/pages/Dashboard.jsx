import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingDown, TrendingUp, Wallet, Target, ChevronRight, Plus, CalendarClock, AlertCircle, ShoppingBag, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import api from '../lib/api.js';
import { formatPHP, formatPHPWhole, formatDate, formatPercent, debtTypeLabel } from '../lib/utils.js';
import { useMonth } from '../lib/MonthContext.jsx';
import SurplusModal from '../components/SurplusModal.jsx';

function StatCard({ label, amount, sub, color = 'text-neutral-800 dark:text-neutral-100', icon }) {
  return (
    <div className="card flex items-start gap-2 sm:gap-3">
      {icon && <div className="mt-0.5 text-neutral-300 dark:text-neutral-600 hidden sm:block">{icon}</div>}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-neutral-400 dark:text-neutral-400 mb-0.5 leading-tight">{label}</p>
        <p className={`text-lg font-bold truncate ${color}`}>{formatPHPWhole(amount)}</p>
        {sub && <p className="text-xs text-neutral-400 dark:text-neutral-400 mt-0.5 leading-tight">{sub}</p>}
      </div>
    </div>
  );
}

function ProgressBar({ percent, color = 'bg-brand-600' }) {
  return (
    <div className="w-full bg-neutral-100 dark:bg-neutral-700 rounded-full h-2">
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
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSurplus, setShowSurplus] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/dashboard', { params: { month } }),
      api.get('/budget/categories'),
    ]).then(([dash, cats]) => {
      setData(dash.data);
      setCategories(cats.data);
    }).finally(() => setLoading(false));
  }, [month]);

  if (loading) return <div className="flex items-center justify-center h-64 text-neutral-400">Loading…</div>;

  const { thisMonth, debts, topDebts, recentTransactions, goals = [], upcomingDeadlines = [] } = data;
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const totalAllocated = categories.reduce((s, c) => s + Number(c.monthlyAllocation), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{greeting}, {user.name?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-neutral-400 dark:text-neutral-400">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <button onClick={() => setShowSurplus(true)} className="btn-primary shrink-0">
          <Target size={15} />
          Leftover Cash
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Income this month" amount={thisMonth.income} icon={<Wallet size={18} />} />
        <StatCard label="Expenses logged" amount={thisMonth.spent} icon={<TrendingDown size={18} />} />
        <StatCard
          label="Leftover Cash"
          amount={thisMonth.surplus}
          icon={<TrendingUp size={18} />}
          color={thisMonth.surplus >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}
          sub={thisMonth.carryover > 0
            ? `incl. ${formatPHPWhole(thisMonth.carryover)} rolled over`
            : `${formatPHPWhole(thisMonth.debtPaid ?? 0)} to debts`}
        />
        <StatCard
          label="Total debt remaining"
          amount={debts.totalRemaining}
          icon={<Target size={18} />}
          color="text-red-500 dark:text-red-400"
          sub={`${formatPercent(debts.percentPaid)} paid off`}
        />
      </div>

      {/* Goal progress */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-100">Debt Payoff Goal</h2>
              {debts.projectedPayoffDate && (
                debts.onTrack ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                    ✓ On track
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                    ⚠ Behind schedule
                  </span>
                )
              )}
            </div>
            <p className="text-xs text-neutral-400 dark:text-neutral-400 mt-0.5">
              Target: {formatDate(debts.goalDate)}
              {debts.projectedPayoffDate && !debts.onTrack && (
                <span className="ml-1">· Projected {formatDate(debts.projectedPayoffDate)}</span>
              )}
            </p>
          </div>
          <span className="text-2xl font-bold text-brand-600 shrink-0">{formatPercent(debts.percentPaid)}</span>
        </div>
        <ProgressBar percent={debts.percentPaid} color={debts.onTrack ? 'bg-green-500' : 'bg-amber-400'} />
        <div className="flex justify-between text-xs text-neutral-400 dark:text-neutral-400 mt-1.5">
          <span>₱0</span>
          <span>{formatPHP(debts.totalOriginal)}</span>
        </div>
      </div>

      {/* Upcoming payment deadlines */}
      {upcomingDeadlines.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock size={16} className="text-amber-500" />
            <h2 className="font-semibold text-neutral-800 dark:text-neutral-100">Upcoming Payments</h2>
            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">{upcomingDeadlines.length} due in 30 days</span>
          </div>
          <div className="space-y-2">
            {upcomingDeadlines.map((d, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-1.5 border-b border-neutral-50 dark:border-neutral-800 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  {d.daysUntilDue <= 7
                    ? <AlertCircle size={14} className="text-red-400 shrink-0" />
                    : <CalendarClock size={14} className="text-neutral-300 dark:text-neutral-600 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{d.debtName}</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-400">{formatDate(d.paymentDate)}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{formatPHP(d.paymentAmount)}</p>
                  <p className={`text-xs ${d.daysUntilDue <= 7 ? 'text-red-400' : d.daysUntilDue <= 14 ? 'text-amber-500' : 'text-neutral-400 dark:text-neutral-400'}`}>
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
            <h2 className="font-semibold text-neutral-800 dark:text-neutral-100">Goals</h2>
            <Link to="/goals" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              View all <ChevronRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {goals.map(goal => (
              <div key={goal.id} className="card space-y-2 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{goal.name}</p>
                  <span className="text-xs font-bold text-brand-600 shrink-0">{formatPercent(goal.percentComplete)}</span>
                </div>
                <div className="w-full bg-neutral-100 dark:bg-neutral-700 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-brand-500 transition-all"
                    style={{ width: `${Math.min(100, goal.percentComplete)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-neutral-400 dark:text-neutral-400">
                  <span>{formatPHP(goal.currentAmount)}</span>
                  <span>{formatPHP(goal.targetAmount)}</span>
                </div>
                {goal.deadline && (
                  <p className="text-xs text-neutral-400 dark:text-neutral-400">Due {formatDate(goal.deadline)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Priority Debts + Budget Overview */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Priority Debts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-neutral-800 dark:text-neutral-100">Priority Debts</h2>
            <Link to="/debts" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              View all <ChevronRight size={13} />
            </Link>
          </div>
          {topDebts.length === 0 ? (
            <div className="text-center py-6 text-neutral-400">
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
                        <span className="text-xs font-bold text-neutral-300 dark:text-neutral-600">#{i + 1}</span>
                        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{debt.name}</span>
                      </div>
                      <p className="text-xs text-neutral-400 dark:text-neutral-400">{debtTypeLabel(debt.type)} · {(debt.interestRate * 100).toFixed(1)}% per year</p>
                    </div>
                    <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 shrink-0">{formatPHP(debt.currentBalance)}</span>
                  </div>
                  <ProgressBar percent={debt.percentPaid} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Budget Overview */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-100">Budget Overview</h2>
              {totalAllocated > 0 && (
                <p className="text-xs text-neutral-400 dark:text-neutral-400 mt-0.5">{formatPHP(thisMonth.spent)} of {formatPHP(totalAllocated)} spent</p>
              )}
            </div>
            <Link to="/budget" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              View all <ChevronRight size={13} />
            </Link>
          </div>
          {categories.length === 0 ? (
            <div className="text-center py-6 text-neutral-400">
              <p className="text-sm">No budget categories yet.</p>
              <Link to="/budget" className="btn-primary mt-3 text-xs inline-flex"><Plus size={13} /> Set up budget</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.slice(0, 5).map(cat => {
                const pct = Number(cat.monthlyAllocation) > 0
                  ? Math.min(100, (thisMonth.spent / totalAllocated) * 100)
                  : 0;
                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate">
                        {cat.icon} {cat.name}
                      </span>
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 shrink-0 ml-2">
                        {formatPHP(cat.monthlyAllocation)}
                      </span>
                    </div>
                    <div className="w-full bg-neutral-100 dark:bg-neutral-700 rounded-full h-1.5">
                      <div className="bg-brand-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {categories.length > 5 && (
                <p className="text-xs text-neutral-400 dark:text-neutral-400 pt-1">+{categories.length - 5} more categories</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions — full width */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-700">
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-100">Recent Transactions</h2>
          <Link to="/transactions" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
            View all <ChevronRight size={13} />
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="text-center py-10 text-neutral-400">
            <p className="text-sm">No expenses logged yet.</p>
            <Link to="/transactions" className="btn-primary mt-3 text-xs inline-flex"><Plus size={13} /> Log an expense</Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-700">
                <th className="text-left text-xs font-medium text-neutral-400 dark:text-neutral-400 px-4 py-2">Category</th>
                <th className="text-left text-xs font-medium text-neutral-400 dark:text-neutral-400 px-4 py-2 hidden sm:table-cell">Description</th>
                <th className="text-left text-xs font-medium text-neutral-400 dark:text-neutral-400 px-4 py-2 hidden sm:table-cell">Date</th>
                <th className="text-right text-xs font-medium text-neutral-400 dark:text-neutral-400 px-4 py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map(tx => (
                <tr key={tx.id} className="border-b border-neutral-50 dark:border-neutral-800 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                      <ShoppingBag size={11} />
                      {tx.category?.name || 'Expense'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 truncate max-w-[180px]">{tx.description || tx.category?.name || 'Expense'}</p>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    <p className="text-xs text-neutral-400 dark:text-neutral-400">{formatDate(tx.date)}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{formatPHP(tx.amount)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showSurplus && <SurplusModal month={month} onClose={() => setShowSurplus(false)} />}
    </div>
  );
}
