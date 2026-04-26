# BudgetApp Roadmap

## Legend
- Status: `[ ]` planned · `[~]` in progress · `[x]` done

---

## v1.1 — Goals + Deadline Visibility ✓
> Focus: native goal tracking and surfacing payment deadlines on the dashboard.

- [x] New `Goal` model: `name, targetAmount, currentAmount, deadline, type (savings|debtFree|purchase)`
- [x] Goals page: create, edit, delete goals; manual progress updates
- [x] Dashboard goal progress cards with timeline projection ("on track by X")
- [x] Surplus allocation: option to split surplus between Avalanche and goals
- [x] Dashboard widget: upcoming debt payment deadlines (next 30 days)

---

## v1.2 — UX Fixes & Polish
> Focus: quick wins across Debt, Budget, and Transactions pages.

- [ ] Debt: fix header color in dark mode
- [ ] Debt: helper text on Current Balance / Original Balance fields based on selected debt type
- [ ] Debt: relabel "Monthly Payment" → "Minimum Payment" when Credit Card type is selected
- [ ] Debt: per-debt clear date (sits alongside global goal date; used for personal prioritization)
- [ ] Budget: display overhaul — show figures as "₱0.00 / ₱5,000.00 spent" below the bar; make amounts prominent
- [ ] Budget: edit category expands the active card in-place instead of rendering UI above the list
- [ ] Budget: drag-to-reorder categories; order persists to DB via `sortOrder` field on `BudgetCategory`

---

## v1.3 — Transactions 2.0 & Revolving Credit
> Focus: link transactions to payment sources; make credit card balances dynamic.
> ⚠ Data model change: credit card `currentBalance` becomes computed from transactions + payments, not manually entered.

- [ ] Add `paymentMethod` enum to Transaction: `BUDGET | CREDIT_CARD | UNBUDGETED`
- [ ] Add nullable `debtId` FK to Transaction (populated when `CREDIT_CARD` is selected)
- [ ] Transactions page: inline editing of existing transactions (amount, date, description, payment method)
- [ ] Transactions page: payment method selector when logging — choose credit card, budget category, or unbudgeted
- [ ] Credit card balance auto-updates from tagged transactions (charges accumulate; payments reduce balance; rolls over monthly)
- [ ] Budget rollover: unspent monthly allocation carries forward to next month (tracked via `BudgetRollover` model or computed from history)
- [ ] Dashboard: last 2 transactions shown with payment method tag

---

## v1.4 — Onboarding & Help System
> Focus: first-run experience and in-app guidance for new users.

- [ ] Onboarding flow: step-by-step setup wizard on first login (add income → add debts → set goal date → add budget categories)
- [ ] Tooltips on key UI elements (surplus calculation, Avalanche method, goal date, minimum payment)
- [ ] Helper text in forms where context is non-obvious
- [ ] Empty state improvements across all pages (more descriptive CTAs)
- [ ] "How it works" summary card on Dashboard for new users (dismissible)

---

## v1.5 — Statement Parser (Manual Upload)
> Focus: reduce manual balance updates by parsing credit card statements.

- [ ] Manual PDF upload endpoint (`POST /api/statements/upload`)
- [ ] PDF parser: extract closing balance, minimum due, due date per issuer (BPI, Security Bank, etc.)
- [ ] New `DebtStatement` model: `debtId, statementDate, closingBalance, minimumDue, dueDate, pdfPath`
- [ ] Auto-update `currentBalance` on the linked debt after successful parse
- [ ] Statement history view per debt (in Debts page)

---

## v1.6 — Gmail Integration (Auto-Fetch Statements)
> Focus: zero-touch statement ingestion via Gmail OAuth.

- [ ] Gmail OAuth2 flow (read-only scope); token storage in DB per user
- [ ] Background job: scan inbox for new statements by issuer sender patterns
- [ ] Reuse v1.5 parser pipeline on fetched PDF attachments
- [ ] User-configurable: enable/disable per debt, map sender → debt
- [ ] Settings page: Gmail connection status + disconnect option

---

## v1.7 — Google Calendar Integration
> Focus: write payment deadlines to Google Calendar; unify reminders.

- [ ] Google Calendar OAuth2 flow (read+write scope)
- [ ] Auto-create calendar events for each parsed due date
- [ ] Update/delete events when due dates change
- [ ] Settings page: Calendar connection status + toggle per debt
- [ ] Deprecate or unify with existing SMTP email reminders

---

## v2.0 — Multi-User / Household
> Focus: shared budgets and debts for household members.

- [ ] `Household` model; users belong to one household (owner + members)
- [ ] Email-based invite flow (reuses existing SMTP setup)
- [ ] `sharedDebt` flag + `householdId` on Debt model
- [ ] Shared budget categories per household
- [ ] Per-user vs. household transaction views (toggle)
- [ ] Role model: `owner` / `member` with appropriate access controls

---

## v2.1 — Gemini Integration (AI Insights)
> Focus: proactive financial coaching via Gemini API, not a chatbot.

- [ ] Gemini API integration in backend (`@google/generative-ai` SDK)
- [ ] Scheduled monthly job: send financial snapshot → receive 2–3 sentence insight → store + email
- [ ] Goal coaching nudges: detect behind-pace goals and suggest corrective actions
- [ ] Debt milestone messages: celebrate payoff progress (25%, 50%, 100%)
- [ ] Statement anomaly flag: unusual charges surfaced in dashboard
- [ ] In-app notification feed for Gemini-generated insights

---

## Backlog / Future Ideas
- Dark/light theme per user preference saved server-side
- Export: monthly summary to PDF or CSV
- Mortgage planning module (placeholder for planned future debt)
- PWA / mobile-friendly layout improvements
- Recurring transaction templates
