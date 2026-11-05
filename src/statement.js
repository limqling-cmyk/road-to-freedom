import { Platform } from 'react-native';
import { assetSummary, computeBudget, GROUPS, monthAllocation, monthKey, monthLabel, num } from './budget';

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const m = (v) => num(v).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const m0 = (v) => num(v).toLocaleString('en-MY', { maximumFractionDigits: 0 });
const dateText = (iso) => new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });

// Asset balances as they stood in that month: the month's own snapshot, else the latest earlier one.
export function assetsForMonth(state, key) {
  if (key >= monthKey()) return { items: state.assets, asAt: new Date().toISOString() };
  const keys = Object.keys(state.assetSnapshots ?? {}).filter((k) => k <= key).sort();
  if (!keys.length) return { items: state.assets, asAt: null };
  const snap = state.assetSnapshots[keys[keys.length - 1]];
  return { items: snap.items, asAt: snap.date };
}

// Plan lines first, then any line that only exists in the final (plan edited after closing).
const mergedLines = (budget, final) => {
  const ids = new Set(budget.lines.map((l) => l.id));
  return [...budget.lines, ...(final?.lines ?? []).filter((l) => !ids.has(l.id))];
};

const STYLE = `
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif; color: #1C2321; font-size: 11px; margin: 0; }
  .page + .page { page-break-before: always; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #1F5F4A; padding-bottom: 10px; }
  .brand { font-size: 22px; font-weight: 800; color: #1F5F4A; }
  .title { font-size: 13px; color: #6B716E; margin-top: 2px; }
  .period { text-align: right; font-size: 18px; font-weight: 700; }
  .gen { font-size: 10px; color: #6B716E; text-align: right; }
  .kpis { display: flex; gap: 8px; margin: 16px 0 6px; }
  .kpi { flex: 1; background: #F4F2EC; border-radius: 8px; padding: 10px; }
  .kpi .l { font-size: 9px; text-transform: uppercase; letter-spacing: .6px; color: #6B716E; font-weight: 700; }
  .kpi .v { font-size: 15px; font-weight: 800; margin-top: 3px; }
  .kpi .s { font-size: 9.5px; color: #6B716E; margin-top: 2px; }
  h2 { font-size: 13px; color: #1F5F4A; margin: 20px 0 6px; text-transform: uppercase; letter-spacing: .8px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9.5px; color: #6B716E; text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid #1C2321; padding: 5px 4px; vertical-align: bottom; }
  td { padding: 5px 4px; border-bottom: 1px solid #E4E1D8; vertical-align: top; }
  .r { text-align: right; white-space: nowrap; }
  tr.grp td { font-weight: 800; background: #F4F2EC; border-bottom: none; padding-top: 7px; }
  tr.sub td { font-weight: 700; border-bottom: 1.5px solid #1C2321; }
  tr.big td { font-weight: 800; font-size: 12px; }
  .fin { background: #EEF6F1; font-weight: 700; }
  th.fin { color: #1F5F4A; }
  .open { color: #B7791F; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 4px; margin-right: 6px; }
  .fixed { background: #3D5A80; } .variable { background: #C77D1A; } .free { background: #2E7D4F; } .unal { background: #D8D4C8; }
  .pend { color: #B7791F; font-size: 9px; font-weight: 700; } .note { color: #6B716E; font-size: 9.5px; }
  .empty { color: #6B716E; text-align: center; padding: 10px; }
  .two { display: flex; gap: 14px; } .two > div { flex: 1; }
  .foot { margin-top: 18px; font-size: 9px; color: #6B716E; border-top: 1px solid #E4E1D8; padding-top: 6px; }
  .avoid { page-break-inside: avoid; }
  .bar { display: flex; height: 9px; border-radius: 5px; overflow: hidden; background: #EEECE6; min-width: 60px; }
  .bar > span { display: block; height: 9px; }
  .pct { color: #6B716E; font-size: 9px; font-weight: 400; display: block; }
`;

const header = (title, period) => `
  <div class="head">
    <div><div class="brand">Road to freedom</div><div class="title">${title}</div></div>
    <div><div class="period">${period}</div><div class="gen">Generated ${dateText(new Date().toISOString())}</div></div>
  </div>`;

const barHTML = (calc) => {
  const parts = [[calc.totals.fixed, '#3D5A80'], [calc.totals.variable, '#C77D1A'], [calc.totals.free, '#2E7D4F'], [Math.max(calc.unallocated, 0), '#D8D4C8']];
  return `<div class="bar">${parts.filter(([v]) => v > 0).map(([v, c]) => `<span style="flex:${v};background:${c}"></span>`).join('')}</div>`;
};

// ---------- one month, full detail ----------
function monthSection(state, key) {
  const ma = monthAllocation(state, key);
  const { budget, actuals: a } = ma;
  const plan = computePlan(ma);
  const final = state.finals?.[key];
  const fin = final ? ma.calc : null;
  const lines = mergedLines(budget, final);
  const lineName = Object.fromEntries(lines.map((l) => [l.id, l.name]));
  const { items: assets, asAt } = assetsForMonth(state, key);
  const as = assetSummary(assets);
  const F = (v) => (fin ? m(v) : '–');

  const groupRows = GROUPS.map((g) => {
    const gl = lines.filter((l) => l.group === g.key);
    if (!gl.length) return '';
    const P = (v, inc) => (inc ? ` <span class="pct" style="display:inline">${((v / inc) * 100).toFixed(1)}%</span>` : '');
    const rows = gl.map((l) => {
      const e = plan.byId[l.id]?.amount ?? 0, x = a.byLine[l.id] ?? 0, f = fin?.byId[l.id]?.amount ?? 0;
      return `<tr><td>${esc(l.name)}</td><td class="r">${m(e)}${P(e, plan.income)}</td><td class="r">${m(x)}${P(x, a.incomeReceived)}</td><td class="r fin">${F(f)}${fin ? P(f, fin.income) : ''}</td></tr>`;
    }).join('');
    return `<tr class="grp"><td colspan="4"><span class="dot ${g.key}"></span>${g.label}</td></tr>${rows}
      <tr class="sub"><td>Total ${g.label}</td><td class="r">${m(plan.totals[g.key])}</td><td class="r">${m(a.totals[g.key])}</td><td class="r fin">${F(fin?.totals[g.key])}</td></tr>`;
  }).join('');

  const sorted = [...a.tx].sort((x, y) => x.date.localeCompare(y.date));
  const incomeRows = sorted.filter((t) => t.type === 'income').map((t) => `<tr><td>${t.date.slice(8)}</td><td>${esc(t.source || 'Income')}${t.pending ? ' <span class="pend">not paid yet</span>' : ''}</td><td>${esc(t.note)}</td><td class="r">${m(t.amount)}</td></tr>`).join('')
    || '<tr><td colspan="4" class="empty">No income recorded</td></tr>';
  const expenseRows = sorted.filter((t) => t.type === 'expense').map((t) => `<tr><td>${t.date.slice(8)}</td><td>${esc(lineName[t.lineId] ?? t.lineName ?? 'Uncategorised')}</td><td>${esc(t.note)}</td><td class="r">${m(t.amount)}</td></tr>`).join('')
    || '<tr><td colspan="4" class="empty">No expenses recorded</td></tr>';

  const assetRows = ['cash', 'reserve', 'invest'].map((g) => {
    const label = { cash: 'Cash & bank', reserve: 'Set aside', invest: 'Investments' }[g];
    const list = assets.filter((x) => x.group === g);
    if (!list.length) return '';
    return `<tr class="grp"><td colspan="2">${label}</td></tr>` + list.map((x) => `<tr><td>${esc(x.name)}${x.note ? ` <span class="note">${esc(x.note)}</span>` : ''}</td><td class="r">${m(x.balance)}</td></tr>`).join('');
  }).join('');

  return `<div class="page">
  ${header('Monthly Statement', monthLabel(key, true))}
  <div class="kpis">
    <div class="kpi"><div class="l">Income</div><div class="v">RM ${m(fin ? fin.income : a.incomeReceived)}</div><div class="s">Plan RM ${m(plan.income)} · received RM ${m(a.incomeReceived)}${a.incomePending ? ` · RM ${m(a.incomePending)} not paid yet` : ''}</div></div>
    <div class="kpi"><div class="l">Fixed + variable</div><div class="v">RM ${m(fin ? fin.totals.fixed + fin.totals.variable : a.spent)}</div><div class="s">Plan RM ${m(plan.totals.fixed + plan.totals.variable)}</div></div>
    <div class="kpi"><div class="l">Free allocation</div><div class="v">RM ${m(fin ? fin.totals.free : a.allocated)}</div><div class="s">Plan RM ${m(plan.totals.free)}</div></div>
    <div class="kpi"><div class="l">${fin ? 'Unallocated' : 'Left (not closed)'}</div><div class="v">RM ${m(fin ? fin.unallocated : a.leftover)}</div><div class="s">${fin ? `Closed ${dateText(final.closedAt)}` : 'Month not closed yet'}</div></div>
  </div>

  <h2>Estimate · Actual · Final allocation</h2>
  <table>
    <tr><th>Item</th><th class="r">Estimate (RM)</th><th class="r">Actual recorded (RM)</th><th class="r fin">Final (RM)</th></tr>
    <tr class="sub"><td>Income</td><td class="r">${m(plan.income)}</td><td class="r">${m(a.incomeReceived)}</td><td class="r fin">${F(fin?.income)}</td></tr>
    ${groupRows}
    ${a.totals.uncategorised ? `<tr class="sub"><td>Uncategorised (deleted categories)</td><td></td><td class="r">${m(a.totals.uncategorised)}</td><td class="fin"></td></tr>` : ''}
    <tr class="sub"><td>Unallocated</td><td class="r">${m(plan.unallocated)}</td><td class="r">${m(a.leftover)}</td><td class="r fin">${F(fin?.unallocated)}</td></tr>
  </table>
  ${fin ? '' : '<div class="note" style="margin-top:4px">Final allocation is filled in once you close this month in the app.</div>'}

  <div class="avoid">
  <h2>Income</h2>
  <table><tr><th style="width:34px">Day</th><th>From</th><th>Note</th><th class="r">RM</th></tr>${incomeRows}
  <tr class="sub"><td></td><td>Total received</td><td></td><td class="r">${m(a.incomeReceived)}</td></tr></table>
  </div>

  <h2>Expenses</h2>
  <table><tr><th style="width:34px">Day</th><th>Category</th><th>Note</th><th class="r">RM</th></tr>${expenseRows}
  <tr class="sub"><td></td><td>Total out</td><td></td><td class="r">${m(a.out)}</td></tr></table>

  <div class="avoid">
  <h2>Assets (as at ${asAt ? dateText(asAt) : 'latest recorded'})</h2>
  <div class="two">
    <div><table>${assetRows}</table></div>
    <div><table>
      <tr><td>Cash &amp; bank</td><td class="r">${m(as.cash)}</td></tr>
      <tr><td>Less: set aside</td><td class="r">(${m(as.reserve)})</td></tr>
      <tr class="sub"><td>Available to use</td><td class="r">${m(as.available)}</td></tr>
      <tr><td>Investments</td><td class="r">${m(as.invest)}</td></tr>
      <tr class="sub"><td>Net worth</td><td class="r">${m(as.netWorth)}</td></tr>
    </table></div>
  </div>
  </div>
  <div class="foot">Estimate follows your % Distribution plan. Actual is what you recorded. Final is the month-end allocation you saved when closing the month. Data stored only on your phone.</div>
  </div>`;
}

// the plan figures for a month (monthAllocation already holds the budget)
const computePlan = (ma) => computeBudget(ma.budget);

// ---------- summary across months: final allocation only ----------
function summarySection(state, keys) {
  const months = [...keys].sort().map((k) => monthAllocation(state, k));
  const multi = months.length > 1;

  // rows: every line used in any month, ordered by the latest month's order
  const order = [];
  const names = {};
  const groupOf = {};
  for (const ma of [...months].reverse()) {
    for (const l of ma.alloc.lines) {
      if (!(l.id in names)) { order.push(l.id); names[l.id] = l.name; groupOf[l.id] = l.group; }
    }
  }

  const sum = (f) => months.reduce((t, ma) => t + f(ma), 0);
  const totalIncome = sum((ma) => ma.calc.income);
  const sh = (v, inc) => (inc ? `<span class="pct">${((v / inc) * 100).toFixed(1)}%</span>` : '');
  // withPct: show each figure's share of that month's total income underneath it
  const cells = (f, cls = '', withPct = false) => months.map((ma) => `<td class="r ${cls}">${m0(f(ma))}${withPct ? sh(f(ma), ma.calc.income) : ''}</td>`).join('') +
    (multi ? `<td class="r ${cls} fin">${m0(sum(f))}${withPct ? sh(sum(f), totalIncome) : ''}</td><td class="r ${cls}">${m0(sum(f) / months.length)}</td>` : '');

  const colCount = months.length + (multi ? 3 : 1);
  const groupRows = GROUPS.map((g) => {
    const ids = order.filter((id) => groupOf[id] === g.key);
    if (!ids.length) return '';
    const rows = ids.map((id) => `<tr><td>${esc(names[id])}</td>${cells((ma) => ma.calc.byId[id]?.amount ?? 0, '', true)}</tr>`).join('');
    return `<tr class="grp"><td colspan="${colCount}"><span class="dot ${g.key}"></span>${g.label}</td></tr>${rows}
      <tr class="sub"><td>Total ${g.label}</td>${cells((ma) => ma.calc.totals[g.key], '', true)}</tr>`;
  }).join('');

  const head = months.map((ma) => `<th class="r">${monthLabel(ma.key)}${ma.closed ? '' : '<br><span class="open">not closed*</span>'}</th>`).join('') +
    (multi ? '<th class="r fin">Total</th><th class="r">Monthly avg</th>' : '');

  const tIncome = totalIncome;
  const tFixed = sum((ma) => ma.calc.totals.fixed);
  const tVar = sum((ma) => ma.calc.totals.variable);
  const tFree = sum((ma) => ma.calc.totals.free);
  const p = (v) => (tIncome ? ((v / tIncome) * 100).toFixed(1) + '% of income' : '');
  const period = multi ? `${monthLabel(months[0].key)} – ${monthLabel(months[months.length - 1].key)}` : monthLabel(months[0].key, true);
  const anyOpen = months.some((ma) => !ma.closed);

  return `<div class="page">
  ${header('Summary Report · Final money allocation', period)}
  <div class="kpis">
    <div class="kpi"><div class="l">Total income</div><div class="v">RM ${m(tIncome)}</div><div class="s">${months.length} month${multi ? 's' : ''}</div></div>
    <div class="kpi"><div class="l">Fixed cost</div><div class="v">RM ${m(tFixed)}</div><div class="s">${p(tFixed)}</div></div>
    <div class="kpi"><div class="l">Variable cost</div><div class="v">RM ${m(tVar)}</div><div class="s">${p(tVar)}</div></div>
    <div class="kpi"><div class="l">Free allocation</div><div class="v">RM ${m(tFree)}</div><div class="s">${p(tFree)}</div></div>
  </div>

  <h2>Where the money went (RM · % of total income)</h2>
  <table>
    <tr><th>Item</th>${head}</tr>
    <tr class="sub big"><td>Income</td>${cells((ma) => ma.calc.income)}</tr>
    ${groupRows}
    <tr class="sub"><td>Unallocated</td>${cells((ma) => ma.calc.unallocated, '', true)}</tr>
    <tr><td style="border:none">Split</td>${months.map((ma) => `<td style="border:none">${barHTML(ma.calc)}</td>`).join('')}${multi ? '<td style="border:none"></td><td style="border:none"></td>' : ''}</tr>
  </table>
  <div class="note" style="margin-top:8px">
    <span class="dot fixed"></span>Fixed &nbsp; <span class="dot variable"></span>Variable &nbsp; <span class="dot free"></span>Free allocation &nbsp; <span class="dot unal"></span>Unallocated
  </div>
  ${anyOpen ? '<div class="note open" style="margin-top:6px">* Not closed yet: figures are what has been recorded so far, not a final allocation.</div>' : ''}
  <div class="foot">Figures are each month's final allocation saved at month end in Road to freedom. Data stored only on your phone.</div>
  </div>`;
}

// mode: 'summary' = summary page only; 'full' = summary page (if several months) + each month's statement
export function reportHTML(state, keys, mode = 'full') {
  const sorted = [...keys].sort();
  let body;
  if (mode === 'summary') body = summarySection(state, sorted);
  else body = (sorted.length > 1 ? summarySection(state, sorted) : '') + sorted.map((k) => monthSection(state, k)).join('');
  const landscape = mode === 'summary' ? sorted.length > 4 : false;
  const css = `@page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 16mm 12mm; }` + STYLE + (sorted.length > 7 ? 'body{font-size:9.5px} td,th{padding:4px 3px}' : '');
  return { html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body>${body}</body></html>`, landscape };
}

export const statementHTML = (state, key) => reportHTML(state, [key], 'full').html;

const fileLabel = (keys, mode) => {
  const s = [...keys].sort();
  const span = s.length === 1 ? s[0] : `${s[0]}_to_${s[s.length - 1]}`;
  return `Road-to-freedom-${mode === 'summary' ? 'summary' : 'statement'}-${span}.pdf`;
};

export async function exportReport(state, keys, mode = 'full') {
  if (!keys.length) return;
  const { html, landscape } = reportHTML(state, keys, mode);
  if (Platform.OS === 'web') {
    // Home-screen web app: print from a hidden frame inside the app, then "Save as PDF" / "Save to Files".
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(frame);
    const doc = frame.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    const title = document.title;
    document.title = fileLabel(keys, mode).replace('.pdf', ''); // suggested file name
    setTimeout(() => {
      try { frame.contentWindow.focus(); frame.contentWindow.print(); }
      catch { const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); w.print(); } }
      const cleanup = () => { document.title = title; frame.remove(); };
      frame.contentWindow.addEventListener('afterprint', () => setTimeout(cleanup, 500));
      setTimeout(() => frame.isConnected && cleanup(), 120000); // safety net
    }, 400);
    return;
  }
  const Print = require('expo-print');
  const Sharing = require('expo-sharing');
  const { File, Paths } = require('expo-file-system');
  // A4 in points; iOS uses width/height, Android follows the @page rule
  const size = landscape ? { width: 842, height: 595 } : { width: 595, height: 842 };
  const { uri } = await Print.printToFileAsync({ html, ...size });
  let shareUri = uri;
  try {
    const target = new File(Paths.cache, fileLabel(keys, mode));
    if (target.exists) target.delete();
    await new File(uri).move(target);
    shareUri = target.uri;
  } catch {}
  await Sharing.shareAsync(shareUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Road to freedom report' });
}

export const exportStatement = (state, key) => exportReport(state, [key], 'full');
