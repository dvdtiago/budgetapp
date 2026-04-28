import { useEffect, useState } from 'react';
import { Check, Plus, Trash2, CreditCard, Wallet, Building2, Smartphone, Download } from 'lucide-react';
import api from '../lib/api.js';

const PM_TYPE_OPTIONS = [
  { value: 'CASH', label: 'Cash', icon: Wallet },
  { value: 'BANK_ACCOUNT', label: 'Bank account', icon: Building2 },
  { value: 'E_WALLET', label: 'E-wallet (GCash, Maya…)', icon: Smartphone },
];

const PM_TYPE_ICONS = {
  CREDIT_CARD: CreditCard,
  CASH: Wallet,
  BANK_ACCOUNT: Building2,
  E_WALLET: Smartphone,
};

const PM_TYPE_LABELS = {
  CREDIT_CARD: 'Credit card',
  CASH: 'Cash',
  BANK_ACCOUNT: 'Bank account',
  E_WALLET: 'E-wallet',
};

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Payment methods
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [pmLoading, setPmLoading] = useState(true);
  const [pmForm, setPmForm] = useState({ name: '', type: 'CASH' });
  const [pmSaving, setPmSaving] = useState(false);
  const [showPmForm, setShowPmForm] = useState(false);

  useEffect(() => {
    api.get('/settings').then(r => {
      setSettings(r.data);
      setLoading(false);
    });
    loadPaymentMethods();
  }, []);

  async function loadPaymentMethods() {
    setPmLoading(true);
    const r = await api.get('/payment-methods');
    setPaymentMethods(r.data);
    setPmLoading(false);
  }

  async function createPaymentMethod(e) {
    e.preventDefault();
    setPmSaving(true);
    try {
      await api.post('/payment-methods', pmForm);
      setPmForm({ name: '', type: 'CASH' });
      setShowPmForm(false);
      loadPaymentMethods();
    } finally {
      setPmSaving(false);
    }
  }

  async function deletePaymentMethod(id) {
    if (!confirm('Remove this payment method?')) return;
    await api.delete(`/payment-methods/${id}`);
    loadPaymentMethods();
  }

  function set(k, v) { setSettings(s => ({ ...s, [k]: v })); }

  async function saveSettings(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await api.put('/settings', {
        reminderEnabled: settings.reminderEnabled,
        reminderFrequency: settings.reminderFrequency,
        reminderEmail: settings.reminderEmail,
        reminderDay: settings.reminderDay,
        goalDate: settings.goalDate,
        name: settings.user?.name,
      });

      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, name: settings.user?.name }));

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function exportData() {
    setExporting(true);
    try {
      const r = await api.get('/export', { responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budgetarian-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError('New passwords do not match.');
      return;
    }
    try {
      await api.put('/auth/password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2000);
    } catch (err) {
      setPwError(err.response?.data?.error ?? 'Failed to update password.');
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-neutral-400">Loading…</div>;

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Settings</h1>
        <p className="text-sm text-neutral-400">Manage your account and preferences</p>
      </div>

      <form onSubmit={saveSettings} className="space-y-6">
        {/* Profile */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-100">Profile</h2>
          <div>
            <label className="label">Your name</label>
            <input className="input" value={settings.user?.name || ''} onChange={e => set('user', { ...settings.user, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input bg-neutral-50 dark:bg-neutral-700/50 text-neutral-400 cursor-not-allowed" value={settings.user?.email || ''} disabled />
          </div>
        </div>

        {/* Goal */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-100">Debt Payoff Goal</h2>
          <div>
            <label className="label">Target date to be debt-free</label>
            <input
              className="input"
              type="date"
              value={settings.goalDate ? new Date(settings.goalDate).toISOString().slice(0, 10) : ''}
              onChange={e => set('goalDate', e.target.value)}
            />
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">This is used to calculate whether you're on track on the dashboard.</p>
          </div>
        </div>

        {/* Email reminders */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-100">Email Reminders</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.reminderEnabled}
              onChange={e => set('reminderEnabled', e.target.checked)}
              className="w-4 h-4 accent-brand-600"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Send me reminders to log my finances</span>
          </label>

          {settings.reminderEnabled && (
            <>
              <div>
                <label className="label">Send reminder to</label>
                <input
                  className="input"
                  type="email"
                  value={settings.reminderEmail || ''}
                  onChange={e => set('reminderEmail', e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Frequency</label>
                  <select className="input" value={settings.reminderFrequency} onChange={e => set('reminderFrequency', e.target.value)}>
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Every two weeks</option>
                  </select>
                </div>
                <div>
                  <label className="label">Day of week</label>
                  <select className="input" value={settings.reminderDay} onChange={e => set('reminderDay', Number(e.target.value))}>
                    {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saved ? <><Check size={15} /> Saved!</> : saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>

      {/* Payment methods */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-100">Payment Methods</h2>
          <button
            type="button"
            onClick={() => setShowPmForm(s => !s)}
            className="btn-secondary text-xs gap-1.5"
          >
            <Plus size={13} /> Add
          </button>
        </div>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 -mt-2">
          Credit cards are added automatically when you create a debt. Add cash, bank accounts, or e-wallets here.
        </p>

        {showPmForm && (
          <form onSubmit={createPaymentMethod} className="flex flex-col sm:flex-row gap-2 pt-1">
            <select
              className="input sm:w-44 shrink-0"
              value={pmForm.type}
              onChange={e => setPmForm(f => ({ ...f, type: e.target.value }))}
            >
              {PM_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <input
              className="input flex-1"
              placeholder="Name (e.g. BDO Savings)"
              value={pmForm.name}
              onChange={e => setPmForm(f => ({ ...f, name: e.target.value }))}
              required
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowPmForm(false)} className="btn-secondary flex-1 sm:flex-none">Cancel</button>
              <button type="submit" disabled={pmSaving} className="btn-primary flex-1 sm:flex-none">
                {pmSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}

        {pmLoading ? (
          <p className="text-sm text-neutral-400 py-2">Loading…</p>
        ) : paymentMethods.length === 0 ? (
          <p className="text-sm text-neutral-400 dark:text-neutral-500 py-2">No payment methods yet.</p>
        ) : (
          <div className="space-y-2">
            {paymentMethods.map(pm => {
              const Icon = PM_TYPE_ICONS[pm.type] ?? Wallet;
              const isCc = pm.type === 'CREDIT_CARD';
              return (
                <div key={pm.id} className="flex items-center gap-3 py-1.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isCc ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{pm.name}</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      {PM_TYPE_LABELS[pm.type]}{isCc && pm.debt ? ` · linked to ${pm.debt.name}` : ''}
                    </p>
                  </div>
                  {!isCc && (
                    <button
                      type="button"
                      onClick={() => deletePaymentMethod(pm.id)}
                      className="p-1.5 rounded-lg text-neutral-300 dark:text-neutral-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {isCc && (
                    <span className="text-xs text-neutral-300 dark:text-neutral-600 shrink-0 pr-1">auto</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Export data */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-neutral-800 dark:text-neutral-100">Export Data</h2>
        <p className="text-sm text-neutral-400 dark:text-neutral-500">Download all your data as a JSON file — transactions, debts, income, goals, and more.</p>
        <button
          type="button"
          onClick={exportData}
          disabled={exporting}
          className="btn-secondary gap-2"
        >
          <Download size={14} />
          {exporting ? 'Exporting…' : 'Export my data'}
        </button>
      </div>

      {/* Change password */}
      <form onSubmit={changePassword} className="card space-y-4">
        <h2 className="font-semibold text-neutral-800 dark:text-neutral-100">Change Password</h2>
        {pwError && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm px-3 py-2 rounded-lg">{pwError}</div>}
        {pwSaved && <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm px-3 py-2 rounded-lg">Password updated successfully.</div>}
        <div>
          <label className="label">Current password</label>
          <input className="input" type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required />
        </div>
        <div>
          <label className="label">New password</label>
          <input className="input" type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} minLength={8} required />
        </div>
        <div>
          <label className="label">Confirm new password</label>
          <input className="input" type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required />
        </div>
        <button type="submit" className="btn-primary w-full">Update password</button>
      </form>
    </div>
  );
}
