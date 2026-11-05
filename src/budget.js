// Budget engine. Mirrors the "% Distribution" tab of "self financial status.xlsx":
//
//   Income (D2)
//   1. Fixed Cost        -> each line is RM, or % of income
//   2. Variable expenses -> pool = income - fixed; each line is RM, or % of that pool
//   3. Free allocation   -> remaining = pool - variable; each line is RM, or % of remaining
//
// Every line also shows "Total %" = amount / income (column B in the Excel).

export const GROUPS = [
  { key: 'fixed', label: 'Fixed Cost', baseLabel: 'of income' },
  { key: 'variable', label: 'Variable Cost', baseLabel: 'of after-fixed' },
  { key: 'free', label: 'Free Allocation', baseLabel: 'of remaining' },
];

export const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const lineAmount = (line, base) =>
  line.mode === 'percent' ? (base * num(line.value)) / 100 : num(line.value);

export function computeBudget(budget) {
  const income = num(budget?.income);
  const lines = budget?.lines ?? [];
  const byId = {};
  const totals = { fixed: 0, variable: 0, free: 0 };
  const bases = { fixed: income, variable: 0, free: 0 };

  const run = (group, base) => {
    bases[group] = base;
    for (const l of lines.filter((x) => x.group === group)) {
      const amount = lineAmount(l, base);
      totals[group] += amount;
      byId[l.id] = {
        amount,
        pctOfBase: base ? (amount / base) * 100 : 0,
        pctOfIncome: income ? (amount / income) * 100 : 0,
      };
    }
  };

  run('fixed', income);
  const afterFixed = income - totals.fixed;
  run('variable', afterFixed);
  const remaining = afterFixed - totals.variable;
  run('free', remaining);
  const unallocated = remaining - totals.free;

  const freePctSum = lines
    .filter((l) => l.group === 'free' && l.mode === 'percent')
    .reduce((s, l) => s + num(l.value), 0);

  return { income, byId, totals, bases, afterFixed, remaining, unallocated, freePctSum };
}

// ---------- months ----------
export const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const shiftMonth = (key, delta) => {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthLabel = (key, long = false) => {
  const [y, m] = key.split('-').map(Number);
  return `${(long ? MONTHS_LONG : MONTHS)[m - 1]} ${y}`;
};

// A month without its own plan borrows the latest earlier plan (like reusing last month's sheet).
export function budgetFor(budgets, key) {
  if (budgets[key]) return { budget: budgets[key], inherited: false };
  const earlier = Object.keys(budgets).filter((k) => k < key).sort();
  const later = Object.keys(budgets).filter((k) => k > key).sort();
  const src = earlier.length ? earlier[earlier.length - 1] : later[0];
  return { budget: src ? budgets[src] : { income: 0, lines: [] }, inherited: true, from: src };
}

// ---------- actuals ----------
export function actualsFor(transactions, key, budget) {
  const tx = transactions.filter((t) => t.date?.startsWith(key));
  const byLine = {};
  const groupOf = Object.fromEntries((budget?.lines ?? []).map((l) => [l.id, l.group]));
  const totals = { fixed: 0, variable: 0, free: 0, uncategorised: 0 };
  let incomeReceived = 0;
  let incomePending = 0;
  for (const t of tx) {
    const a = num(t.amount);
    if (t.type === 'income') {
      if (t.pending) incomePending += a;
      else incomeReceived += a;
    } else {
      byLine[t.lineId] = (byLine[t.lineId] ?? 0) + a;
      const g = groupOf[t.lineId];
      if (g) totals[g] += a;
      else totals.uncategorised += a;
    }
  }
  const out = totals.fixed + totals.variable + totals.free + totals.uncategorised;
  return {
    tx,
    byLine,
    totals,
    incomeReceived,
    incomePending,
    out,
    spent: totals.fixed + totals.variable + totals.uncategorised,
    allocated: totals.free,
    leftover: incomeReceived - out,
  };
}

// ---------- assets ----------
export function assetSummary(assets) {
  const sum = (g) => assets.filter((a) => a.group === g).reduce((s, a) => s + num(a.balance), 0);
  const cash = sum('cash');
  const reserve = sum('reserve');
  const invest = sum('invest');
  return { cash, reserve, available: cash - reserve, invest, netWorth: cash + invest };
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------- month-end final allocation ----------
// A "final" has the same shape as a plan ({ income, lines }) so the same engine computes it.
// Starting draft: income = what you actually received, fixed and variable = what you actually
// spent, free allocation = your plan's split applied to what is really left.
export function draftFinal(budget, actuals) {
  const income = actuals.incomeReceived || num(budget.income);
  const lines = budget.lines.map((l) => {
    const actual = round2(actuals.byLine[l.id] ?? 0);
    if (l.group === 'free' && l.mode === 'percent') return { ...l, value: num(l.value) };
    return { ...l, mode: 'amount', value: actual };
  });
  return { income, lines };
}

const round2 = (v) => Math.round(v * 100) / 100;

// Income, fixed and variable always come from the records; only free allocation is the user's choice.
// (Settings > "Edit everything at month end" turns this off and keeps whatever was typed in.)
export function applyRecorded(final, budget, actuals) {
  const freeLines = (final?.lines ?? budget.lines).filter((l) => l.group === 'free');
  const recorded = budget.lines
    .filter((l) => l.group !== 'free')
    .map((l) => ({ ...l, mode: 'amount', value: Math.round((actuals.byLine[l.id] ?? 0) * 100) / 100 }));
  return { income: actuals.incomeReceived, lines: [...recorded, ...freeLines] };
}

export const editAllAtClose = (state) => !!state.settings?.editAllAtClose;

// What a month's money ended up as. Closed months use the saved final; open months fall back to actuals.
export function monthAllocation(state, key) {
  const { budget } = budgetFor(state.budgets, key);
  const actuals = actualsFor(state.transactions, key, budget);
  const final = state.finals?.[key];
  if (final) {
    const alloc = editAllAtClose(state) ? final : applyRecorded(final, budget, actuals);
    return { key, closed: true, closedAt: final.closedAt, alloc, calc: computeBudget(alloc), budget, actuals };
  }
  const alloc = {
    income: actuals.incomeReceived,
    lines: budget.lines.map((l) => ({ ...l, mode: 'amount', value: actuals.byLine[l.id] ?? 0 })),
  };
  return { key, closed: false, alloc, calc: computeBudget(alloc), budget, actuals };
}

// Months that have anything in them, newest first.
export function monthsWithData(state) {
  const set = new Set([...Object.keys(state.budgets), ...Object.keys(state.finals ?? {})]);
  for (const t of state.transactions) if (t.date) set.add(t.date.slice(0, 7));
  set.add(monthKey());
  return [...set].filter((k) => /^\d{4}-\d{2}$/.test(k)).sort().reverse();
}

// Running totals across months (closed months use their final allocation, open months what is recorded).
// fromKey: first month to include ('2026-01' for this year), or null for all time.
export function cumulative(state, fromKey = null) {
  const now = monthKey();
  const keys = monthsWithData(state).filter((k) => k <= now && (!fromKey || k >= fromKey)).sort();
  const items = {};
  let income = 0, unal = 0;
  const totals = { fixed: 0, variable: 0, free: 0 };
  for (const k of keys) {
    const ma = monthAllocation(state, k);
    income += ma.calc.income;
    unal += ma.calc.unallocated;
    for (const g of Object.keys(totals)) totals[g] += ma.calc.totals[g];
    for (const l of ma.alloc.lines) {
      const a = ma.calc.byId[l.id]?.amount ?? 0;
      items[l.id] = { id: l.id, name: l.name, group: l.group, amount: (items[l.id]?.amount ?? 0) + a };
    }
  }
  const sources = {};
  for (const t of state.transactions) {
    if (t.type !== 'income' || t.pending || !t.date) continue;
    const k = t.date.slice(0, 7);
    if (k > now || (fromKey && k < fromKey)) continue;
    const n = t.source || 'Other';
    sources[n] = (sources[n] ?? 0) + num(t.amount);
  }
  const bySource = Object.entries(sources).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  const fromRecords = bySource.reduce((t, x) => t + x.amount, 0);
  if (Math.abs(income - fromRecords) > 0.5) bySource.push({ name: 'Month-end adjustments', amount: income - fromRecords });
  return {
    months: keys.length,
    first: keys[0],
    income,
    unal,
    totals,
    bySource,
    items: Object.values(items).filter((i) => Math.abs(i.amount) > 0.004),
  };
}
