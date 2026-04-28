import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import api from '../lib/api.js';
import { formatPHP, formatMonthLabel } from '../lib/utils.js';

const DEBT_COLORS = ['#4f46e5', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#6b7280'];

const tooltipStyle = {
  contentStyle: { backgroundColor: 'var(--tooltip-bg, #fff)', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: 12 },
  labelStyle: { fontWeight: 600 },
};

function CurrencyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-neutral-700 dark:text-neutral-200 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatPHP(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function Trends() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/trends').then(r => {
      setData(r.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-neutral-400">Loading…</div>;

  const { incomeVsExpenses, debtHistory, categoryTrend, debtBalances } = data;

  const incomeChartData = incomeVsExpenses.map(d => ({
    ...d,
    month: formatMonthLabel(d.month),
  }));

  const debtChartData = debtHistory.map(d => ({
    ...d,
    month: formatMonthLabel(d.month),
  }));

  const categoryNames = categoryTrend.length > 0
    ? [...new Set(categoryTrend.flatMap(m => m.breakdown.map(b => b.category)))]
    : [];

  const catChartData = categoryTrend.map(m => {
    const row = { month: formatMonthLabel(m.month) };
    m.breakdown.forEach(b => { row[b.category] = b.amount; });
    return row;
  });

  const CAT_COLORS = ['#4f46e5', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'];

  // Build pivoted data for per-provider balance chart
  const debtBalanceData = (() => {
    if (!debtBalances?.length) return [];
    const allMonths = [...new Set(debtBalances.flatMap(d => d.data.map(p => p.month)))].sort();
    return allMonths.map(month => {
      const row = { month: formatMonthLabel(month) };
      debtBalances.forEach(group => {
        const key = group.provider.replace(/\W+/g, '_');
        const point = group.data.find(p => p.month === month);
        if (point) {
          if (point.actual !== null) row[`${key}_actual`] = point.actual;
          if (point.projected !== null) row[`${key}_projected`] = point.projected;
        }
      });
      return row;
    });
  })();

  const hasDebtData = debtBalances?.some(d => d.data.some(p => p.actual > 0 || p.projected !== null));
  const isEmpty = debtChartData.every(d => d.totalDebt === 0) && incomeChartData.every(d => d.income === 0);

  if (isEmpty) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Trends</h1>
          <p className="text-sm text-neutral-400 dark:text-neutral-400">Last 12 months of financial history</p>
        </div>
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">📈</p>
          <p className="font-medium text-neutral-800 dark:text-neutral-100">No data yet</p>
          <p className="text-sm text-neutral-400 dark:text-neutral-400 mt-1">Start logging income, expenses, and debt payments to see your trends here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Trends</h1>
        <p className="text-sm text-neutral-400 dark:text-neutral-400">Last 12 months of financial history</p>
      </div>

      {/* Total Debt over time */}
      <div className="card">
        <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1">Total Debt Over Time</h2>
        <p className="text-xs text-neutral-400 dark:text-neutral-400 mb-4">Watch this line go down — that's the goal.</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={debtChartData}>
            <defs>
              <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-100 dark:text-neutral-800" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CurrencyTooltip />} />
            <Area type="monotone" dataKey="totalDebt" name="Total Debt" stroke="#ef4444" fill="url(#debtGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Per-debt balance chart */}
      {hasDebtData && debtBalances.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1">Balance by Debt</h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-400 mb-4">
            Solid lines show actual balance · dashed lines show projected payoff path (generate a Payoff Timeline on Debts to see projections)
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={debtBalanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-100 dark:text-neutral-800" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CurrencyTooltip />} />
              <Legend
                formatter={(value) => {
                  const isProjected = value.endsWith('_projected');
                  const providerKey = value.replace(/_actual$/, '').replace(/_projected$/, '');
                  const group = debtBalances.find(d => d.provider.replace(/\W+/g, '_') === providerKey);
                  return `${group?.provider ?? value}${isProjected ? ' (proj.)' : ''}`;
                }}
              />
              {debtBalances.map((group, i) => {
                const key = group.provider.replace(/\W+/g, '_');
                return (
                  <>
                    <Line
                      key={`${key}_actual`}
                      type="monotone"
                      dataKey={`${key}_actual`}
                      name={`${key}_actual`}
                      stroke={DEBT_COLORS[i % DEBT_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      key={`${key}_projected`}
                      type="monotone"
                      dataKey={`${key}_projected`}
                      name={`${key}_projected`}
                      stroke={DEBT_COLORS[i % DEBT_COLORS.length]}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      connectNulls={false}
                    />
                  </>
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Income vs Expenses */}
      <div className="card">
        <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1">Income vs. Expenses</h2>
        <p className="text-xs text-neutral-400 dark:text-neutral-400 mb-4">The bigger the gap, the more you can put toward debt.</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={incomeChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-100 dark:text-neutral-800" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CurrencyTooltip />} />
            <Legend />
            <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Spending by category */}
      {catChartData.length > 0 && categoryNames.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1">Spending by Category</h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-400 mb-4">Last 6 months</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={catChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-100 dark:text-neutral-800" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CurrencyTooltip />} />
              <Legend />
              {categoryNames.map((name, i) => (
                <Bar key={name} dataKey={name} stackId="a" fill={CAT_COLORS[i % CAT_COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
