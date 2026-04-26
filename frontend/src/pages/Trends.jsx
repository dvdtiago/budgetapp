import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import api from '../lib/api.js';
import { formatPHP, formatMonthLabel } from '../lib/utils.js';

const tooltipFormatter = v => formatPHP(v);

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

  const { incomeVsExpenses, debtHistory, categoryTrend } = data;

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

  const COLORS = ['#4f46e5', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-800">Trends</h1>
        <p className="text-sm text-neutral-400">Last 12 months of financial history</p>
      </div>

      {/* Debt over time */}
      <div className="card">
        <h2 className="font-semibold text-neutral-800 mb-1">Total Debt Over Time</h2>
        <p className="text-xs text-neutral-400 mb-4">Watch this line go down — that's the goal.</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={debtChartData}>
            <defs>
              <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={tooltipFormatter} />
            <Area type="monotone" dataKey="totalDebt" name="Total Debt" stroke="#ef4444" fill="url(#debtGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Income vs Expenses */}
      <div className="card">
        <h2 className="font-semibold text-neutral-800 mb-1">Income vs. Expenses</h2>
        <p className="text-xs text-neutral-400 mb-4">The bigger the gap, the more you can put toward debt.</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={incomeChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={tooltipFormatter} />
            <Legend />
            <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Spending by category */}
      {catChartData.length > 0 && categoryNames.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-neutral-800 mb-1">Spending by Category</h2>
          <p className="text-xs text-neutral-400 mb-4">Last 6 months</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={catChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={tooltipFormatter} />
              <Legend />
              {categoryNames.map((name, i) => (
                <Bar key={name} dataKey={name} stackId="a" fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {debtChartData.every(d => d.totalDebt === 0) && incomeChartData.every(d => d.income === 0) && (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">📈</p>
          <p className="font-medium text-neutral-800">No data yet</p>
          <p className="text-sm text-neutral-400 mt-1">Start logging income, expenses, and debt payments to see your trends here.</p>
        </div>
      )}
    </div>
  );
}
