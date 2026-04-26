import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import api from '../lib/api.js';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

  useEffect(() => {
    api.get('/settings').then(r => {
      setSettings(r.data);
      setLoading(false);
    });
  }, []);

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

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading…</div>;

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>
        <p className="text-sm text-slate-400">Manage your account and preferences</p>
      </div>

      <form onSubmit={saveSettings} className="space-y-6">
        {/* Profile */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-800">Profile</h2>
          <div>
            <label className="label">Your name</label>
            <input className="input" value={settings.user?.name || ''} onChange={e => set('user', { ...settings.user, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input bg-slate-50 dark:bg-slate-700/50 text-slate-400 cursor-not-allowed" value={settings.user?.email || ''} disabled />
          </div>
        </div>

        {/* Goal */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-800">Debt Payoff Goal</h2>
          <div>
            <label className="label">Target date to be debt-free</label>
            <input
              className="input"
              type="date"
              value={settings.goalDate ? new Date(settings.goalDate).toISOString().slice(0, 10) : ''}
              onChange={e => set('goalDate', e.target.value)}
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">This is used to calculate whether you're on track on the dashboard.</p>
          </div>
        </div>

        {/* Email reminders */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-800">Email Reminders</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.reminderEnabled}
              onChange={e => set('reminderEnabled', e.target.checked)}
              className="w-4 h-4 accent-brand-600"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Send me reminders to log my finances</span>
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
              <div className="grid grid-cols-2 gap-3">
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

      {/* Change password */}
      <form onSubmit={changePassword} className="card space-y-4">
        <h2 className="font-semibold text-slate-800">Change Password</h2>
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
