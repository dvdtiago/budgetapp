import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../lib/api.js';
import { formatPHP, formatDate } from '../lib/utils.js';
import { useMonth } from '../lib/MonthContext.jsx';

const INCOME_TYPES = [
  { value: 'REGULAR', label: 'Regular income' },
  { value: 'COMMISSION', label: 'Commission / one-time' },
];

export default function Income() {
  const { month } = useMonth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    originalAmount: '', originalCurrency: 'PHP', exchangeRate: '',
    type: 'REGULAR', description: '',
    date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const r = await api.get('/income', { params: { month } });
    setEntries(r.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [month]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/income', form);
      setForm({ originalAmount: '', originalCurrency: 'PHP', exchangeRate: '', type: 'REGULAR', description: '', date: new Date().toISOString().slice(0, 10) });
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id) {
    if (!confirm('Remove this income entry?')) return;
    await api.delete(`/income/${id}`);
    load();
  }

  const totalIncome = entries.reduce((s, e) => s + Number(e.amountPhp), 0);
  const regular = entries.filter(e => e.type === 'REGULAR').reduce((s, e) => s + Number(e.amountPhp), 0);
  const commissions = entries.filter(e => e.type === 'COMMISSION').reduce((s, e) => s + Number(e.amountPhp), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Income</h1>
        <p className="text-sm text-neutral-400 dark:text-neutral-400">All amounts shown in Philippine Peso (₱)</p>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary mt-3">
          <Plus size={15} /> Log income
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card text-center col-span-2 sm:col-span-1">
          <p className="text-xs text-neutral-400 dark:text-neutral-400 mb-1">Total income</p>
          <p className="text-base font-bold text-neutral-800 dark:text-neutral-100 truncate">{formatPHP(totalIncome)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-neutral-400 dark:text-neutral-400 mb-1">Regular</p>
          <p className="text-base font-bold text-neutral-800 dark:text-neutral-100 truncate">{formatPHP(regular)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-neutral-400 dark:text-neutral-400 mb-1">Other</p>
          <p className="text-base font-bold text-green-600 dark:text-green-400 truncate">{formatPHP(commissions)}</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card">
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-4">Log income</h2>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Type</label>
                <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
                  {INCOME_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Currency</label>
                <select className="input" value={form.originalCurrency} onChange={e => set('originalCurrency', e.target.value)}>
                  <option value="PHP">PHP (₱)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Amount {form.originalCurrency === 'USD' ? '($)' : '(₱)'}</label>
                <input className="input" type="number" min="0" step="0.01" value={form.originalAmount} onChange={e => set('originalAmount', e.target.value)} placeholder="0.00" required />
              </div>
              {form.originalCurrency === 'USD' && (
                <div>
                  <label className="label">Exchange rate (₱ per $1)</label>
                  <input className="input" type="number" min="0" step="0.0001" value={form.exchangeRate} onChange={e => set('exchangeRate', e.target.value)} placeholder="e.g. 58.50" required />
                  <p className="text-xs text-neutral-400 dark:text-neutral-400 mt-1">Check <a href="https://google.com/finance/quote/USD-PHP" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-500">Google Finance</a> for today's rate.</p>
                </div>
              )}
            </div>
            {form.originalCurrency === 'USD' && form.originalAmount && form.exchangeRate && (
              <p className="text-xs text-neutral-400 dark:text-neutral-400">
                = {formatPHP(Number(form.originalAmount) * Number(form.exchangeRate))} PHP
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <input className="input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. November salary" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <div className="text-center py-10 text-neutral-400">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">💵</p>
          <p className="font-medium text-neutral-800 dark:text-neutral-100">No income logged this month</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4">
            <Plus size={15} /> Log your first entry
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(e => (
            <div key={e.id} className="card flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm font-bold">
                {e.type === 'COMMISSION' ? '★' : '₱'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{e.description || (e.type === 'REGULAR' ? 'Regular income' : 'Commission')}</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-400">
                  {formatDate(e.date)}
                  {e.originalCurrency === 'USD' && ` · $${Number(e.originalAmount).toLocaleString()} @ ₱${Number(e.exchangeRate).toFixed(2)}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">{formatPHP(e.amountPhp)}</p>
                {e.originalCurrency === 'USD' && <p className="text-xs text-neutral-400 dark:text-neutral-400">${Number(e.originalAmount).toLocaleString()}</p>}
              </div>
              <button onClick={() => deleteEntry(e.id)} className="p-1.5 rounded-lg text-neutral-300 dark:text-neutral-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 ml-1">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
