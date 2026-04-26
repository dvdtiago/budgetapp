import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CreditCard, TrendingUp, Wallet, BarChart2,
  Settings, LogOut, Menu, X, Sun, Moon, List, ChevronLeft, ChevronRight, Target,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useMonth } from '../lib/MonthContext.jsx';
import { formatMonthLabel } from '../lib/utils.js';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/debts', label: 'Debts', icon: CreditCard },
  { to: '/income', label: 'Income', icon: Wallet },
  { to: '/budget', label: 'Budget', icon: BarChart2 },
  { to: '/transactions', label: 'Transactions', icon: List },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/trends', label: 'Trends', icon: TrendingUp },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return [dark, setDark];
}

function MonthStepper() {
  const { month, setMonth } = useMonth();

  function step(dir) {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <div className="flex items-center gap-1">
      <button onClick={() => step(-1)} className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
        <ChevronLeft size={16} />
      </button>
      <input
        type="month"
        value={month}
        onChange={e => setMonth(e.target.value)}
        className="text-sm font-medium text-slate-700 dark:text-slate-200 bg-transparent border-none outline-none cursor-pointer w-32 text-center"
      />
      <button onClick={() => step(1)} className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useDarkMode();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  }

  const NavItems = ({ onClick }) => (
    <>
      {nav.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onClick}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? 'bg-brand-50 dark:bg-brand-700/30 text-brand-700 dark:text-brand-300'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`
          }
        >
          <Icon size={17} />
          {label}
        </NavLink>
      ))}
    </>
  );

  const BottomActions = () => (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setDark(d => !d)}
        className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-sm text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        {dark ? <Sun size={17} /> : <Moon size={17} />}
        {dark ? 'Light mode' : 'Dark mode'}
      </button>
      <button
        onClick={logout}
        className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-sm text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        <LogOut size={17} />
        Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900">
      {/* Sidebar – desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-white dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800 fixed inset-y-0 left-0 z-20">
        <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-800">
          <span className="text-lg font-bold text-brand-600">💰 BudgetApp</span>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{user.name}</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavItems />
        </nav>
        <div className="px-3 py-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
          <BottomActions />
        </div>
      </aside>

      {/* Mobile + desktop top bar */}
      <header className="fixed top-0 inset-x-0 z-30 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 h-14 md:pl-60">
        {/* Left: hamburger on mobile */}
        <button onClick={() => setOpen(o => !o)} className="md:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        <span className="md:hidden text-base font-bold text-brand-600">💰 BudgetApp</span>

        {/* Month stepper — center on desktop, right on mobile */}
        <div className="hidden md:flex flex-1 justify-start">
          <MonthStepper />
        </div>

        <div className="flex items-center gap-1">
          <div className="md:hidden">
            <MonthStepper />
          </div>
          <button
            onClick={() => setDark(d => !d)}
            className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-20" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/20 dark:bg-black/50" />
          <aside
            className="absolute left-0 top-14 bottom-0 w-56 bg-white dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <NavItems onClick={() => setOpen(false)} />
            </nav>
            <div className="px-3 py-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <BottomActions />
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-56 pt-14 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
