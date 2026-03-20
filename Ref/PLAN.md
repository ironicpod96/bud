# Bajet — Envelope Budgeting App

## Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (Auth, Postgres, RLS)
- **State**: Zustand (lightweight, perfect for mobile-first)
- **Deployment**: Vercel

---

## Design System

### Philosophy
Windows Phone metro-inspired. Super minimalist. Large display typography. No chrome. Content IS the interface.

### Theme Tokens
Dark mode uses **neon accent colors**. Light mode uses **rich OKLCH equivalents** (darker, more saturated — neon washes out in light mode).

```css
/* Dark mode — neon */
--accent-red: oklch(0.65 0.25 25);       /* overbudget alerts */
--accent-green: oklch(0.75 0.2 145);     /* under budget / savings */
--accent-blue: oklch(0.7 0.15 250);      /* info / neutral accent */
--accent-yellow: oklch(0.8 0.18 85);     /* warnings */
--surface-card: oklch(0.2 0.005 260);    /* raised card bg */
--surface-bg: oklch(0.12 0.005 260);     /* page bg */
--text-primary: oklch(0.95 0 0);
--text-secondary: oklch(0.6 0 0);
--ring-progress: oklch(0.95 0 0);        /* white ring */

/* Light mode — rich, saturated (NOT neon) */
--accent-red: oklch(0.5 0.2 25);
--accent-green: oklch(0.5 0.18 145);
--accent-blue: oklch(0.5 0.13 250);
--accent-yellow: oklch(0.55 0.15 85);
--surface-card: oklch(0.95 0.005 260);
--surface-bg: oklch(0.99 0.002 260);
--text-primary: oklch(0.15 0 0);
--text-secondary: oklch(0.5 0 0);
--ring-progress: oklch(0.15 0 0);
```

### Typography
- **Display/Headers**: Very large, bold. Think `text-4xl font-black tracking-tight`. The "Today" / "This Week" tabs are oversized display text — inactive tab is `text-muted-foreground`.
- **Body**: Clean sans-serif via shadcn defaults.
- **Numbers**: Tabular nums. `font-variant-numeric: tabular-nums`. RM amounts use bold weight for the number, regular weight for "RM" prefix.

### Layout
- Max-width `430px` centered on all screens. Even on desktop, it's a phone-width container.
- Use `mx-auto` wrapper on the outermost layout.

### Interaction Patterns
- **Expand/Collapse**: Use `+` icon that morphs to `−` when expanded (NOT caret/chevron).
- **Bottom Sheet**: For Add Expense — slides up from bottom, custom numpad.
- **Manage Page**: Full-screen overlay with `×` close button.
- **Modals**: For "Borrow from Future?" decisions.

---

## App Architecture

### Pages / Routes

```
/                     → Home (Today / This Week tabs)
/onboarding           → Multi-step setup wizard
/onboarding/income    → Step 1: Gross income
/onboarding/fixed     → Step 2: Fixed expenses
/onboarding/savings   → Step 3: Savings target
/onboarding/variable  → Step 4: Variable expense allocation
/onboarding/balance   → Step 5: Smart balance (excess/deficit)
```

### Overlays (not routes — modals/sheets)
- **Manage** — Full-screen overlay (accessed via `$` icon top-right)
- **Add Expense** — Bottom sheet (accessed via `+` FAB)
- **Borrow from Future** — Modal dialog (accessed via SOS corner button)

---

## Supabase Schema

### Tables

```sql
-- Users profile (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  gross_income numeric(12,2) not null,
  epf_rate numeric(5,2) not null default 11,      -- employee EPF %
  marital_status text default 'single',            -- for PCB estimation
  num_children int default 0,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Monthly deductions (auto-calculated, stored for reference)
create table public.monthly_deductions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  epf_amount numeric(12,2) not null,
  socso_amount numeric(12,2) not null,
  eis_amount numeric(12,2) not null,
  pcb_amount numeric(12,2) not null,               -- estimated monthly tax
  total numeric(12,2) generated always as
    (epf_amount + socso_amount + eis_amount + pcb_amount) stored,
  created_at timestamptz default now()
);

-- Fixed expenses (car loan, rent, subscriptions, etc.)
create table public.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null,
  icon text,                                        -- emoji or icon key
  created_at timestamptz default now()
);

-- Savings target
create table public.savings_target (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('percentage', 'amount')),
  value numeric(12,2) not null,                     -- either % or RM
  computed_amount numeric(12,2) not null,            -- always RM
  created_at timestamptz default now()
);

-- Variable expense categories (the "envelopes")
create table public.envelopes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  name text not null,                               -- Food, Transport, etc.
  icon text not null,                               -- icon key
  monthly_budget numeric(12,2) not null,            -- allocated RM/month
  percentage numeric(5,2) not null,                 -- % of variable pool
  sort_order int default 0,
  color text,                                       -- accent color key
  created_at timestamptz default now()
);

-- Budget periods (monthly reset)
create table public.budget_periods (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  start_date date not null,                         -- 1st of month
  end_date date not null,                           -- last of month
  total_variable_budget numeric(12,2) not null,
  days_in_period int not null,
  daily_budget numeric(12,2) generated always as
    (total_variable_budget / days_in_period) stored,
  created_at timestamptz default now()
);

-- Transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  envelope_id uuid references public.envelopes(id) on delete set null,
  budget_period_id uuid references public.budget_periods(id),
  amount numeric(12,2) not null,
  description text,
  transaction_date date not null default current_date,
  transaction_time time not null default current_time,
  created_at timestamptz default now()
);

-- Borrow-from-future log
create table public.future_borrows (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  budget_period_id uuid references public.budget_periods(id),
  amount numeric(12,2) not null,
  source text not null check (source in ('savings', 'spread')),
  reason text,
  borrow_date date not null default current_date,
  created_at timestamptz default now()
);

-- Weekly savings snapshots (the "tabung" ritual)
create table public.weekly_savings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  budget_period_id uuid references public.budget_periods(id),
  week_start date not null,                         -- Monday
  week_end date not null,                           -- Sunday
  weekly_budget numeric(12,2) not null,             -- what they had to spend
  weekly_spent numeric(12,2) not null,              -- what they actually spent
  remainder numeric(12,2) not null,                 -- budget - spent (the win)
  transferred_to_savings boolean default false,     -- user confirmed transfer
  transferred_at timestamptz,
  created_at timestamptz default now()
);

-- Medals / achievements (Apple Watch ring-closed style)
create table public.medals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  medal_type text not null,                         -- see medal types below
  title text not null,
  description text,
  earned_at timestamptz default now(),
  week_ref date,                                    -- which week earned it
  amount numeric(12,2),                             -- RM value if relevant
  seen boolean default false                        -- for "new medal" badge
);

/*
  Medal types:
  - 'first_save'          → First week with remainder > 0
  - 'streak_2'            → 2 consecutive saving weeks
  - 'streak_4'            → 4 consecutive (1 month!)
  - 'streak_8'            → 8 consecutive (2 months!)
  - 'streak_12'           → 12 consecutive (3 months!)
  - 'big_saver'           → Saved > 20% of weekly budget in a week
  - 'super_saver'         → Saved > 40% of weekly budget in a week
  - 'century'             → Cumulative savings hit RM100
  - 'half_k'              → Cumulative savings hit RM500
  - 'one_k'               → Cumulative savings hit RM1,000
  - 'five_k'              → Cumulative savings hit RM5,000
  - 'no_borrow'           → Completed a full month without borrowing
  - 'under_budget_all'    → All envelopes under budget for a full week
  - 'perfect_week'        → Spent exactly or under daily budget every day
*/
```

### Row Level Security (RLS)
```sql
-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.monthly_deductions enable row level security;
alter table public.fixed_expenses enable row level security;
alter table public.savings_target enable row level security;
alter table public.envelopes enable row level security;
alter table public.budget_periods enable row level security;
alter table public.transactions enable row level security;
alter table public.future_borrows enable row level security;
alter table public.weekly_savings enable row level security;
alter table public.medals enable row level security;

-- Policy pattern for all tables:
create policy "Users can CRUD own data"
  on public.[TABLE_NAME]
  for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Special case for profiles (id = auth.uid(), not profile_id)
create policy "Users can read/update own profile"
  on public.profiles
  for all
  using (id = auth.uid())
  with check (id = auth.uid());
```

---

## Malaysian Statutory Deduction Logic

This is the core backend calculation that runs when user inputs gross income during onboarding. All calculations are for **employee share only** (what gets deducted from their pay).

### EPF (KWSP) — Employee Share
- **Rate**: 11% of gross salary (standard for under 60)
- For salaries ≤ RM20,000: use EPF Third Schedule table (rounded up to next RM)
- For salaries > RM20,000: exact 11% calculation
- **Simplification for this app**: Use 11% (user can override to 0%/7%/9% in Manage)

### SOCSO (PERKESO) — Employee Share
- **Rate**: ~0.5% of salary, table-based, capped at wage ceiling RM6,000/month
- Employee max contribution: ~RM9.00/month (at RM6,000+ salary)
- For calculation simplicity, use: `min(gross * 0.005, 9.00)` rounded to table bracket
- Applies to employees under 60

### EIS (SIP) — Employee Share
- **Rate**: 0.2% of salary, capped at wage ceiling RM5,000/month
- Employee max contribution: ~RM10.00/month
- Formula: `min(gross * 0.002, 10.00)`

### PCB (Monthly Tax Deduction) — Estimated
Since exact PCB requires many variables (marital status, children, reliefs), we provide an **estimate** based on progressive tax brackets applied monthly.

**Malaysia 2026 Progressive Tax Brackets (Annual → Monthly)**:
| Annual Chargeable Income | Rate | Monthly Bracket |
|---|---|---|
| First RM5,000 | 0% | ~RM417 |
| RM5,001 – RM20,000 | 1% | ~RM1,250 |
| RM20,001 – RM35,000 | 3% | ~RM1,250 |
| RM35,001 – RM50,000 | 6% | ~RM1,250 |
| RM50,001 – RM70,000 | 11% | ~RM1,667 |
| RM70,001 – RM100,000 | 19% | ~RM2,500 |
| RM100,001 – RM400,000 | 25% | ~RM25,000 |
| RM400,001 – RM600,000 | 26% | — |
| RM600,001 – RM2,000,000 | 28% | — |
| Above RM2,000,000 | 30% | — |

**Simplified PCB estimation algorithm**:
```typescript
function estimateMonthlyPCB(
  grossMonthly: number,
  epfMonthly: number,
  maritalStatus: 'single' | 'married' = 'single',
  numChildren: number = 0
): number {
  // Annual gross
  const annualGross = grossMonthly * 12;
  
  // Deduct EPF (tax relief, capped at RM4,000/year)
  const epfRelief = Math.min(epfMonthly * 12, 4000);
  
  // Individual relief
  const individualRelief = 9000;
  
  // Spouse relief (if married, non-working assumed)
  const spouseRelief = maritalStatus === 'married' ? 4000 : 0;
  
  // Children relief (RM2,000 per child under 18, simplified)
  const childrenRelief = numChildren * 2000;
  
  // Chargeable income
  const chargeableIncome = Math.max(0,
    annualGross - epfRelief - individualRelief - spouseRelief - childrenRelief
  );
  
  // Progressive tax calculation
  const brackets = [
    { limit: 5000, rate: 0 },
    { limit: 20000, rate: 0.01 },
    { limit: 35000, rate: 0.03 },
    { limit: 50000, rate: 0.06 },
    { limit: 70000, rate: 0.11 },
    { limit: 100000, rate: 0.19 },
    { limit: 400000, rate: 0.25 },
    { limit: 600000, rate: 0.26 },
    { limit: 2000000, rate: 0.28 },
    { limit: Infinity, rate: 0.30 },
  ];
  
  let annualTax = 0;
  let prev = 0;
  for (const bracket of brackets) {
    if (chargeableIncome <= prev) break;
    const taxable = Math.min(chargeableIncome, bracket.limit) - prev;
    annualTax += taxable * bracket.rate;
    prev = bracket.limit;
  }
  
  // Tax rebate: RM400 if chargeable income ≤ RM35,000
  if (chargeableIncome <= 35000) {
    annualTax = Math.max(0, annualTax - 400);
  }
  
  return Math.round(annualTax / 12 * 100) / 100;
}
```

### Take-Home Calculation
```
Take-Home = Gross - EPF - SOCSO - EIS - PCB
Variable Budget = Take-Home - Fixed Expenses - Savings Target
Daily Budget = Variable Budget / days_in_month
```

---

## Onboarding Flow

### Step 1: Gross Income
**UI**: Single large number input with custom numpad (matches Add Expense sheet style).
**Input**: Monthly gross salary in RM.
**On submit**: Auto-calculate and show all 4 deductions with progressive disclosure:
- EPF (11%): RM X
- SOCSO: RM X  
- EIS: RM X
- PCB (est.): RM X
- **Total Deductions: RM X**
- **Take-Home: RM X**

User taps "Continue" to accept or can tap any deduction to override (e.g., change EPF to 0% for non-contributors).

### Step 2: Fixed Expenses
**UI**: List builder. Each item = name + amount. Pre-suggested categories:
- Rent / Mortgage
- Car Loan
- Insurance
- Utilities
- Internet / Phone
- (Custom)

User adds items, sees running total. Shows "Remaining after fixed: RM X".

### Step 3: Savings Target
**UI**: Toggle between `%` mode and `RM` mode using a segmented control.
- **% mode**: shadcn NumberInput / counter (0–50%, step 1%)
- **RM mode**: Direct amount input

Shows computed amount in the other unit. E.g., "10% = RM 719".

### Step 4: Variable Expense Allocation
**UI**: Category list with percentage sliders.

**Default categories** (with smart % suggestions based on Malaysian cost of living):
| Category | Icon | Suggested % | Rationale |
|---|---|---|---|
| Food | 🍴 | 35% | ~RM30-50/day meals in MY |
| Transport | 🚗 | 20% | Fuel + tolls + parking |
| Groceries | 🛒 | 15% | Household supplies |
| Personal | 👤 | 15% | Clothing, haircuts, misc |
| Fun | 🎉 | 15% | Entertainment, hobbies |

**Note shown to user**: _"We suggest this spread based on typical Malaysian spending. Feel free to adjust — just make sure it adds up to 100%."_

Each slider updates the RM amount in real-time. Total must equal 100%.

Users can:
- Add custom categories
- Remove default categories
- Rename categories
- Reorder via drag

### Step 5: Smart Balance (Excess/Deficit Resolution)

After all allocations, calculate:
```
excess_or_deficit = variable_pool - sum(envelope_allocations)
```

This step ONLY appears if there's a mismatch (which shouldn't happen if Step 4 enforces 100%, but handles rounding edge cases).

**If excess** → Modal: "You have RM X left over"
- Option A: "Add to Savings" → increases savings target
- Option B: "Spread Equally" → distributes evenly across envelopes

**If deficit** → Modal: "You're RM X short"
- Option A: "Take from Savings" → reduces savings target
- Option B: "Reduce Equally" → reduces evenly across envelopes

---

## Home Screen Architecture

### Layout (Apple Watch Corner Widget Pattern)
The main card sits center. Four corners have position-absolute widgets:

```
[Today]  [This Week]                    [$]
┌─────────────────────────────────────────┐
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Mar 20                    [+]  │    │
│  │  Fri                            │    │
│  │       ┌──────────┐              │    │
│  │       │  RM 67   │              │    │
│  │       │remaining │              │    │
│  │       └──────────┘              │    │
│  │                                 │    │
│  │  [ALERT]              [SOS btn] │    │
│  │  🍴 +RM9                        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Transactions                           │
│  ┌─────────────────────────────────┐    │
│  │ 7:27 PM   Food          RM 19  │    │
│  └─────────────────────────────────┘    │
│                                         │
│                 [+]                      │
│            (Add FAB)                     │
└─────────────────────────────────────────┘
```

### Main Card States

**Collapsed** (default):
- Date + day of week (top-left)
- `+` expand button (top-right) — morphs to `−` when expanded
- Circular progress ring showing % of daily budget remaining
- RM amount + "remaining" label centered in ring
- Corner widgets (alert bottom-left, SOS bottom-right)

**Expanded**:
- Same top section
- Below ring: category breakdown bars
  - Each row: icon + name + progress bar + RM spent
  - Progress bar shows spent vs daily allocation for that envelope
- `−` collapse button (top-right)

### Ring Calculation
```
daily_budget = monthly_variable_budget / days_in_month
spent_today = sum(transactions WHERE date = today)
remaining = daily_budget - spent_today
ring_percentage = remaining / daily_budget
```

Ring color:
- > 50% remaining: white (default)
- 25-50%: yellow accent
- < 25%: red accent
- Overspent: red accent, ring shows overshoot, amount shows negative

### Corner Widgets

**Bottom-Left — Alert Widget**:
Shows the envelope that's most over-budget today.
```
overbudget_amount = spent_in_envelope_today - (envelope_daily_allocation)
```
Display: `[icon] + RM X` in red accent.
Only shows if any envelope is overbudget.

**Bottom-Right — SOS / Borrow Button**:
Small circular button. Tapping opens "Borrow from Future?" modal.
Only shows when total daily spend exceeds daily budget.

### "Borrow from Future?" Modal
**Trigger**: SOS button OR automatic when overspending detected.
**Title**: "Borrow from future?"
**Subtitle**: "You're RM X over budget today. This will reduce your daily budget for the rest of the month."

**Options**:
1. **"Take from savings"** — Deducts from savings target, adds to variable pool. Recalculates daily budget for remaining days.
2. **"Spread it out"** — Distributes the overspend across remaining days in month. Shows new daily budget preview.
3. **"I'll manage"** — Dismiss. Overspend stays as-is, tomorrow resets to normal daily budget.

**Math for "Spread it out"**:
```
remaining_days = days_left_in_month (excluding today)
overspend = spent_today - daily_budget
new_daily_budget = (remaining_variable_budget - overspend) / remaining_days
```

### Today vs This Week Tab

**Today tab**: Shows today's daily budget, today's transactions.

**This Week tab**: 
- Ring shows weekly remaining (daily_budget × 7 - spent_this_week)
- Transactions list shows all transactions Mon–Sun
- Category bars show weekly spending per envelope
- Weekly budget = daily_budget × 7
- **Below transactions**: Mini savings chart preview (last 4 weeks) — tapping expands to full savings history. This keeps the savings momentum visible without leaving the home screen.
- If it's Sunday and Tabung Time hasn't been completed, show a soft banner: _"Ready to close this week? See how you did →"_

Week is defined as Monday–Sunday (Malaysian work week standard).

### Savings Chart Spec (Recharts)

**Chart type**: Vertical bar chart.
**X-axis**: Week labels (W1, W2, ... or "Mar 3", "Mar 10", etc.)
**Y-axis**: RM saved (remainder amount).
**Bars**: accent-green for positive weeks, accent-red for negative (overspent) weeks.
**Target line**: Dashed horizontal line at the rolling 4-week average. Label: "Your average".
**Interaction**: Tap a bar to see that week's breakdown tooltip.
**Data range**: Last 8–12 weeks (scrollable if more).
**Below chart stats**:
- Total saved this month: RM X
- All-time saved: RM X
- Current streak: X weeks 🔥

---

## Add Expense Sheet

**Trigger**: `+` FAB at bottom of home screen.
**Type**: Bottom sheet (slides up, covers ~70% of screen).

### Layout (from design reference):
```
┌─────────────────────────────────────┐
│                                  ×  │
│  RM 0                          🍴  │
│  🍴 Food                            │
│                                     │
│  [Add description (optional)]       │
│                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐          │
│  │  1  │ │  2  │ │  3  │          │
│  ├─────┤ ├─────┤ ├─────┤          │
│  │  4  │ │  5  │ │  6  │          │
│  ├─────┤ ├─────┤ ├─────┤          │
│  │  7  │ │  8  │ │  9  │          │
│  ├─────┤ ├─────┤ ├─────┤          │
│  │  .  │ │  0  │ │  ⌫  │          │
│  └─────┘ └─────┘ └─────┘          │
│                                     │
│  [      ✓ Add Expense         ]     │
└─────────────────────────────────────┘
```

### Behavior:
1. Opens with Food selected by default (or last-used category).
2. Tapping the large category icon (top-right) opens a category picker (horizontal scroll or grid).
3. Custom numpad — NOT native keyboard. Large touch targets.
4. Amount displays large with "RM" prefix.
5. Optional description field.
6. "Add Expense" button — disabled until amount > 0.
7. On submit: inserts transaction, closes sheet, updates ring animation.

### Category Picker:
Horizontal scroll of envelope icons. Tapping switches the active category. Shows icon + name below.

---

## Manage Page

**Trigger**: `$` icon in top-right of home screen.
**Type**: Full-screen overlay with `×` close button.

### Sections:

**Section 1 — Profile Card**:
```
[Name]                              Edit
────────────────────────────────────────
Monthly Income     EPF Contribution
RM 9,000           11%
────────────────────────────────────────
Monthly Deductions              RM 1,811 ▾
  (expandable: EPF, SOCSO, EIS, PCB breakdown)
```

**Section 2 — Take-Home Card**:
```
Take-Home                       RM 7,190
────────────────────────────────────────
Fixed Expenses               RM 3,060 ▾
  (expandable: list of fixed expenses, editable)
────────────────────────────────────────
Savings Target · 0%             RM 0 ▾
  (expandable: toggle %, amount, counter)
────────────────────────────────────────
Variable Expenses            RM 4,130 ▾
  (expandable: envelope list with % sliders)
```

**Section 3 — Actions**:
- 🔄 Reset Budget Setup → re-runs onboarding
- 🚪 Log Out (red text)

### Edit Behavior:
- Tapping "Edit" on profile opens inline editing of name, income, EPF rate.
- Expanding any section reveals the same UI used in onboarding for that step.
- Changes auto-save and cascade: changing income recalculates all downstream values.

---

## Computed Values & Cascade Logic

When ANY upstream value changes, all downstream values must recalculate:

```
Gross Income
  → Monthly Deductions (EPF + SOCSO + EIS + PCB)
    → Take-Home (Gross - Deductions)
      → Variable Pool (Take-Home - Fixed Expenses - Savings)
        → Envelope Amounts (Variable Pool × envelope %)
          → Monthly Budget per Envelope
            → Daily Budget per Envelope (Monthly / days)
              → Remaining Today (Daily - Spent Today)
                → Ring Display
```

This cascade should run as a **Supabase Edge Function** or **client-side derived state** (Zustand computed selectors). For simplicity, run client-side with Zustand and persist snapshots to Supabase.

---

## Default Envelope Suggestions (Smart %)

Based on income tier (Malaysian context):

| Income Tier | Food | Transport | Groceries | Personal | Fun |
|---|---|---|---|---|---|
| < RM3,000 | 40% | 20% | 15% | 15% | 10% |
| RM3,000–6,000 | 35% | 20% | 15% | 15% | 15% |
| RM6,000–10,000 | 30% | 18% | 17% | 18% | 17% |
| > RM10,000 | 25% | 15% | 15% | 20% | 25% |

These are starting suggestions. The logic: lower income → more % to essentials. Higher income → more discretionary.

---

## Weekly Savings Ritual ("Tabung Time")

The core behavioral loop. Every Sunday evening (or first app open after Sunday), the app triggers a **weekly check-in** that turns leftover budget into visible savings.

### Weekly Cycle (Mon–Sun)

```
Monday:    Week starts. Weekly budget = daily_budget × 7
Mon–Sun:   User spends, tracks transactions
Sunday:    Week ends. App calculates remainder.
           → Prompt: "Tabung Time" ritual
```

### Tabung Time Flow

**Trigger**: Sunday 8PM local push notification, or first app open after Sunday midnight.

**Step 1 — The Reveal**:
Full-screen celebratory moment (if remainder > 0):
```
┌─────────────────────────────────────┐
│                                     │
│          🎉                         │
│                                     │
│    You saved                        │
│    RM 47                            │
│    this week                        │
│                                     │
│    That's 34% of your              │
│    weekly budget!                   │
│                                     │
│    [Transfer to Tabung →]           │
│                                     │
└─────────────────────────────────────┘
```

If remainder ≤ 0, show empathetic message instead:
```
"Tough week — you went RM12 over.
That's okay. Next week is a fresh start."
[See what happened →]  (opens weekly breakdown)
```

**Step 2 — Transfer Confirmation**:
User taps "Transfer to Tabung" → writes `weekly_savings` row with `transferred_to_savings = true`.
This is a soft commitment — the app reminds them to actually move money to their savings account (bank tabung/ASB/etc), but tracks it regardless.

**Step 3 — Medal Check**:
After transfer, check for newly earned medals. If any:
```
┌─────────────────────────────────────┐
│                                     │
│    🏅 New Medal!                    │
│                                     │
│    "3-Week Streak"                  │
│    You've saved 3 weeks             │
│    in a row. Keep going!            │
│                                     │
│    [Nice →]                         │
│                                     │
└─────────────────────────────────────┘
```

**Step 4 — Weekly Savings Graph**:
Show a bar chart (Recharts via shadcn charts) of the last 8–12 weeks:
```
Savings History
────────────────────────────────────────
 RM
 80 │          ██
 60 │    ██    ██    ██
 40 │    ██    ██    ██    ██
 20 │ ██ ██ ██ ██    ██ ██ ██ ██
  0 │ ██ ██ ██ ██ ██ ██ ██ ██ ██
    └──────────────────────────────
      W1 W2 W3 W4 W5 W6 W7 W8 W9

Total saved this month: RM 187
All-time saved: RM 1,240
```

**Design note**: The graph uses accent-green bars. A dotted horizontal line shows the "maintain this level" target (average of last 4 weeks). The goal: users want to keep bars AT or ABOVE the line. Dipping below feels like breaking a streak.

### Carry-Forward Logic

```typescript
// End of week calculation
const weeklyBudget = dailyBudget * 7;
const weeklySpent = sumTransactions(weekStart, weekEnd);
const remainder = weeklyBudget - weeklySpent;

if (remainder > 0) {
  // POSITIVE: Unspent money goes to savings
  await insertWeeklySavings({
    weekly_budget: weeklyBudget,
    weekly_spent: weeklySpent,
    remainder: remainder,
    // User confirms → transferred_to_savings = true
  });
  
  // Check and award medals
  await checkAndAwardMedals(profileId, remainder, weeklyBudget);
  
} else if (remainder < 0) {
  // NEGATIVE: Overspent. This is already handled by
  // the "Borrow from Future" system during the week.
  // At week-end, just log the deficit.
  await insertWeeklySavings({
    weekly_budget: weeklyBudget,
    weekly_spent: weeklySpent,
    remainder: remainder, // negative
  });
}

// Next week starts fresh with the same daily_budget
// (unless user borrowed from future, which already
//  recalculated daily_budget for remaining days)
```

### Medal Award Logic

```typescript
async function checkAndAwardMedals(
  profileId: string,
  remainder: number,
  weeklyBudget: number
) {
  const medals: Medal[] = [];
  
  // Get savings history
  const history = await getWeeklySavings(profileId);
  const positivWeeks = history.filter(w => w.remainder > 0);
  const cumulativeSaved = history
    .filter(w => w.remainder > 0)
    .reduce((sum, w) => sum + w.remainder, 0);
  
  // First save ever
  if (positivWeeks.length === 1 && remainder > 0) {
    medals.push({ type: 'first_save', title: 'First Save!' });
  }
  
  // Streak medals (consecutive positive weeks)
  const streak = getConsecutiveStreak(history);
  const streakMilestones = [
    { weeks: 2,  type: 'streak_2',  title: '2-Week Streak' },
    { weeks: 4,  type: 'streak_4',  title: 'Month of Saving!' },
    { weeks: 8,  type: 'streak_8',  title: '2-Month Warrior' },
    { weeks: 12, type: 'streak_12', title: 'Quarter Champion' },
  ];
  for (const m of streakMilestones) {
    if (streak === m.weeks && !alreadyEarned(m.type)) {
      medals.push({ type: m.type, title: m.title });
    }
  }
  
  // Percentage-based medals
  const savingsRate = remainder / weeklyBudget;
  if (savingsRate > 0.4 && !alreadyEarned('super_saver')) {
    medals.push({ type: 'super_saver', title: 'Super Saver!' });
  } else if (savingsRate > 0.2 && !alreadyEarned('big_saver')) {
    medals.push({ type: 'big_saver', title: 'Big Saver!' });
  }
  
  // Cumulative milestones
  const milestones = [
    { amount: 100,  type: 'century', title: 'RM100 Club' },
    { amount: 500,  type: 'half_k',  title: 'Half-K Hero' },
    { amount: 1000, type: 'one_k',   title: 'The Thousandaire' },
    { amount: 5000, type: 'five_k',  title: 'RM5K Legend' },
  ];
  for (const m of milestones) {
    if (cumulativeSaved >= m.amount && !alreadyEarned(m.type)) {
      medals.push({ type: m.type, title: m.title });
    }
  }
  
  // Write medals to DB
  for (const medal of medals) {
    await insertMedal(profileId, medal);
  }
  
  return medals;
}
```

---

## Monthly Reset Logic

On the 1st of each month (or first app open after 1st):
1. Create new `budget_period` row
2. Carry forward profile settings (no changes unless user edits)
3. Weekly savings history persists across months (for the graph + cumulative tracking)
4. New month = fresh daily budgets, but the savings momentum chart keeps growing

**End-of-month summary** (shown on first open of new month):
```
┌─────────────────────────────────────┐
│                                     │
│    March Recap                      │
│                                     │
│    Total saved: RM 187              │
│    Best week: W2 (RM 63)           │
│    Streak: 4 weeks 🔥              │
│    Medals earned: 2                 │
│                                     │
│    [Start April →]                  │
│                                     │
└─────────────────────────────────────┘
```

**Supabase cron** (pg_cron or Edge Function scheduled):
- Runs at midnight MYT on 1st of month
- Creates budget_period for all active users
- Sets daily_budget based on current month's day count
- Does NOT clear weekly_savings — those accumulate forever

---

## Auth Flow

1. **Sign Up**: Email + password (Supabase Auth)
2. On first sign-in, check `profiles.onboarding_complete`
3. If false → redirect to `/onboarding`
4. If true → redirect to `/`
5. Manage page has Log Out

No social auth for MVP. Keep it simple.

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                   # Root layout, max-w-[430px] centered
│   ├── page.tsx                     # Home (Today/This Week)
│   ├── onboarding/
│   │   ├── layout.tsx               # Onboarding wrapper
│   │   ├── page.tsx                 # Step router
│   │   ├── income/page.tsx
│   │   ├── fixed/page.tsx
│   │   ├── savings/page.tsx
│   │   ├── variable/page.tsx
│   │   └── balance/page.tsx
│   └── auth/
│       ├── login/page.tsx
│       └── signup/page.tsx
├── components/
│   ├── home/
│   │   ├── main-card.tsx            # The ring card (collapsed/expanded)
│   │   ├── progress-ring.tsx        # SVG ring component
│   │   ├── category-bars.tsx        # Expanded view bars
│   │   ├── transaction-list.tsx
│   │   ├── alert-widget.tsx         # Bottom-left corner
│   │   └── sos-button.tsx           # Bottom-right corner
│   ├── sheets/
│   │   ├── add-expense-sheet.tsx    # Bottom sheet + numpad
│   │   ├── numpad.tsx               # Custom number pad
│   │   └── category-picker.tsx
│   ├── manage/
│   │   ├── manage-overlay.tsx       # Full screen overlay
│   │   ├── profile-card.tsx
│   │   ├── take-home-card.tsx
│   │   └── envelope-editor.tsx
│   ├── weekly/
│   │   ├── tabung-ritual.tsx        # Full-screen weekly check-in flow
│   │   ├── savings-reveal.tsx       # "You saved RM X" celebration
│   │   ├── savings-chart.tsx        # Recharts bar chart (8-12 weeks)
│   │   ├── medal-popup.tsx          # New medal earned overlay
│   │   └── medal-gallery.tsx        # All-time medals collection
│   ├── onboarding/
│   │   ├── income-step.tsx
│   │   ├── fixed-expenses-step.tsx
│   │   ├── savings-step.tsx
│   │   ├── variable-step.tsx
│   │   └── balance-modal.tsx
│   ├── ui/                          # shadcn components
│   └── shared/
│       ├── amount-display.tsx       # RM X formatted display
│       ├── expand-toggle.tsx        # +/- morph button
│       └── section-card.tsx         # Reusable card wrapper
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Browser client
│   │   ├── server.ts                # Server client
│   │   └── middleware.ts            # Auth middleware
│   ├── calculations/
│   │   ├── deductions.ts            # EPF, SOCSO, EIS, PCB
│   │   ├── budget.ts                # Take-home, variable pool, daily
│   │   ├── savings.ts               # Weekly remainder, carry-forward
│   │   ├── medals.ts                # Medal check & award logic
│   │   └── suggestions.ts          # Smart % recommendations
│   └── constants/
│       ├── categories.ts            # Default envelopes
│       └── tax-brackets.ts          # MY tax tables
├── stores/
│   └── budget-store.ts              # Zustand store
└── styles/
    └── theme.css                    # OKLCH tokens
```

---

## Implementation Order

### Phase 1: Foundation
1. Next.js project setup + shadcn + Tailwind
2. Supabase project creation + schema migration
3. Auth (sign up, login, middleware)
4. Theme system (dark/light, OKLCH tokens)
5. Layout shell (430px container)

### Phase 2: Onboarding
6. Income step + deduction calculator
7. Fixed expenses step
8. Savings target step
9. Variable allocation step + smart suggestions
10. Balance resolution modal
11. Onboarding completion → profile write

### Phase 3: Home Screen
12. Main card (collapsed) + progress ring
13. Main card (expanded) + category bars
14. Today/This Week tab switching
15. Transaction list
16. Corner widgets (alert + SOS)

### Phase 4: Expense Entry
17. Add expense bottom sheet
18. Custom numpad
19. Category picker
20. Transaction write + optimistic UI update

### Phase 5: Manage
21. Manage overlay
22. Profile card (view + edit)
23. Take-home card (expandable sections)
24. Cascade recalculation on edit
25. Reset budget setup flow

### Phase 6: Weekly Savings Ritual
26. Weekly remainder calculation logic
27. Tabung Time full-screen reveal
28. Transfer confirmation flow
29. Savings history bar chart (Recharts)
30. "Maintain the level" target line on chart

### Phase 7: Medals & Positive Reinforcement
31. Medal award engine (streak, cumulative, percentage)
32. Medal popup component
33. Medal gallery (viewable from Manage or home)
34. Monthly recap screen
35. Push notification trigger for Sunday Tabung Time

### Phase 8: Polish
36. Borrow from Future modal + logic
37. Monthly reset cron
38. Animations (ring, sheet, expand/collapse, medal reveal)
39. Light/dark mode toggle
40. PWA manifest + offline basics
