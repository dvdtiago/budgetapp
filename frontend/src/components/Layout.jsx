import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CreditCard, TrendingUp, Wallet, BarChart2,
  Settings, LogOut, Menu, X, Sun, Moon, List, ChevronLeft, ChevronRight, Target,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useMonth } from '../lib/MonthContext.jsx';
import { formatMonthLabel } from '../lib/utils.js';

const nav = [
  { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/debts',        label: 'Debts',        icon: CreditCard },
  { to: '/income',       label: 'Income',       icon: Wallet },
  { to: '/budget',       label: 'Budget',       icon: BarChart2 },
  { to: '/transactions', label: 'Transactions', icon: List },
  { to: '/goals',        label: 'Goals',        icon: Target },
  { to: '/trends',       label: 'Trends',       icon: TrendingUp },
  { to: '/settings',     label: 'Settings',     icon: Settings },
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
      <button
        onClick={() => step(-1)}
        className="p-1.5 rounded-md text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        <ChevronLeft size={16} />
      </button>
      <input
        type="month"
        value={month}
        onChange={e => setMonth(e.target.value)}
        className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 bg-transparent border-none outline-none cursor-pointer w-32 text-center"
      />
      <button
        onClick={() => step(1)}
        className="p-1.5 rounded-md text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
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
            `flex items-center gap-2.5 px-3 py-2 rounded-md text-[13.5px] font-medium transition-all duration-100 ${
              isActive
                ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 font-semibold'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
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
        className="flex items-center gap-2.5 px-3 py-2 w-full rounded-md text-[13.5px] text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors"
      >
        {dark ? <Sun size={17} /> : <Moon size={17} />}
        {dark ? 'Light mode' : 'Dark mode'}
      </button>
      <button
        onClick={logout}
        className="flex items-center gap-2.5 px-3 py-2 w-full rounded-md text-[13.5px] text-neutral-400 dark:text-neutral-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        <LogOut size={17} />
        Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-neutral-50 dark:bg-neutral-900">

      {/* Sidebar – desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 fixed inset-y-0 left-0 z-20">
        <div className="px-5 py-5 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-brand-500 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <span className="font-display text-[17px] font-medium tracking-tight text-neutral-800 dark:text-neutral-100">
              budget<span className="text-brand-500">app</span>
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1.5 truncate">{user.name}</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <NavItems />
        </nav>
        <div className="px-3 py-4 border-t border-neutral-200 dark:border-neutral-800 space-y-0.5">
          <BottomActions />
        </div>
      </aside>

      {/* Mobile + desktop top bar */}
      <header className="fixed top-0 inset-x-0 z-30 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 h-14 md:pl-60">
        <button
          onClick={() => setOpen(o => !o)}
          className="md:hidden p-2 rounded-md text-neutral-500 dark:text-neutral-400"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        <span className="md:hidden font-display text-base font-medium text-neutral-800 dark:text-neutral-100">
          budget<span className="text-brand-500">app</span>
        </span>

        <div className="hidden md:flex flex-1 justify-start">
          <MonthStepper />
        </div>

        <div className="flex items-center gap-1">
          <div className="md:hidden">
            <MonthStepper />
          </div>
          <button
            onClick={() => setDark(d => !d)}
            className="p-2 rounded-md text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
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
            className="absolute left-0 top-14 bottom-0 w-56 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              <NavItems onClick={() => setOpen(false)} />
            </nav>
            <div className="px-3 py-4 border-t border-neutral-200 dark:border-neutral-800 space-y-0.5">
              <BottomActions />
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-56 pt-14 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
