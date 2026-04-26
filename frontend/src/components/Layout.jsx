import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CreditCard, TrendingUp, Wallet, BarChart2,
  Settings, LogOut, Sun, Moon, List, ChevronLeft, ChevronRight,
  Target, MoreHorizontal, X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useMonth } from '../lib/MonthContext.jsx';

// Primary bottom nav items (mobile)
const primaryNav = [
  { to: '/dashboard',    label: 'Home',         icon: LayoutDashboard },
  { to: '/budget',       label: 'Budget',       icon: BarChart2 },
  { to: '/transactions', label: 'Transactions', icon: List },
  { to: '/debts',        label: 'Debts',        icon: CreditCard },
];

// All nav items (desktop sidebar + More sheet)
const allNav = [
  { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/debts',        label: 'Debts',        icon: CreditCard },
  { to: '/income',       label: 'Income',       icon: Wallet },
  { to: '/budget',       label: 'Budget',       icon: BarChart2 },
  { to: '/transactions', label: 'Transactions', icon: List },
  { to: '/goals',        label: 'Goals',        icon: Target },
  { to: '/trends',       label: 'Trends',       icon: TrendingUp },
  { to: '/settings',     label: 'Settings',     icon: Settings },
];

// Items that go in the "More" sheet (mobile)
const moreNav = [
  { to: '/income',       label: 'Income',       icon: Wallet },
  { to: '/transactions', label: 'Transactions', icon: List },
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

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-[10px] bg-brand-500 flex items-center justify-center flex-shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </div>
      <span className="font-display text-[17px] font-medium tracking-tight text-neutral-800 dark:text-neutral-100">
        budgetar<span className="text-brand-500">ian</span>
      </span>
    </div>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const [dark, setDark] = useDarkMode();
  const [showMore, setShowMore] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  }

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-md text-[13.5px] font-medium transition-all duration-100 ${
      isActive
        ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 font-semibold'
        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
    }`;

  return (
    <div className="min-h-screen flex bg-neutral-50 dark:bg-neutral-900">

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex flex-col w-56 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 fixed inset-y-0 left-0 z-20">
        {/* Logo + greeting */}
        <div className="px-5 pt-5 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <Logo />
          <div className="mt-3">
            <p className="text-xs text-neutral-400 dark:text-neutral-500">{greeting},</p>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">{user.name}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {allNav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={navLinkClass}>
              <Icon size={17} />
              {label}
            </NavLink>
          ))}

          {/* Dark mode toggle — lives right after Settings */}
          <div className="pt-1">
            <button
              onClick={() => setDark(d => !d)}
              className="flex items-center gap-2.5 px-3 py-2 w-full rounded-md text-[13.5px] text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors"
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
              {dark ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={logout}
            className="flex items-center gap-2.5 px-3 py-2 w-full rounded-md text-[13.5px] text-neutral-400 dark:text-neutral-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

{/* ── TOP BAR ── */}
<header className="fixed top-0 inset-x-0 z-30 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 h-14">
  <div className="hidden md:grid grid-cols-[14rem_1fr_14rem] items-center h-full px-6">
    
    {/* 1. Logo area (aligned with sidebar width) */}
    <div className="flex justify-start">
      <Logo />
    </div>

    {/* 2. Month Stepper (centered in the content area) */}
    <div className="flex justify-center">
      <MonthStepper />
    </div>

    {/* 3. Spacer (balances the grid to ensure perfect centering) */}
    <div className="invisible" aria-hidden="true" />
    
  </div>

  {/* Mobile View */}
  <div className="md:hidden flex items-center justify-between h-full px-4">
    <Logo />
    <MonthStepper />
  </div>
</header>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 flex items-stretch h-16 safe-bottom">
        {primaryNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-neutral-400 dark:text-neutral-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* More button */}
        <button
          onClick={() => setShowMore(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-neutral-400 dark:text-neutral-500"
        >
          <MoreHorizontal size={20} strokeWidth={1.75} />
          <span>More</span>
        </button>
      </nav>

      {/* ── MORE SHEET (mobile) ── */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/30 dark:bg-black/50" />
          <div
            className="relative w-full bg-white dark:bg-neutral-950 rounded-t-2xl shadow-xl pb-safe"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">More</span>
              <button onClick={() => setShowMore(false)} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <X size={18} />
              </button>
            </div>

            <div className="px-3 pb-3 space-y-0.5">
              {moreNav.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setShowMore(false)}
                  className={navLinkClass}
                >
                  <Icon size={17} />
                  {label}
                </NavLink>
              ))}

              <div className="my-2 border-t border-neutral-100 dark:border-neutral-800" />

              <button
                onClick={() => { setDark(d => !d); setShowMore(false); }}
                className="flex items-center gap-2.5 px-3 py-2.5 w-full rounded-md text-[13.5px] text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                {dark ? <Sun size={17} /> : <Moon size={17} />}
                {dark ? 'Light mode' : 'Dark mode'}
              </button>

              <button
                onClick={logout}
                className="flex items-center gap-2.5 px-3 py-2.5 w-full rounded-md text-[13.5px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut size={17} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 md:ml-56 pt-14 pb-20 md:pb-6 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
