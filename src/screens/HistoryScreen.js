import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, BackHandler, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { GrabBar, justSwiped, SheetBackdrop, TabSwipe, useHorizontalSwipe, useSwipeDown } from '../gestures';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { computeBudget, GROUPS, monthAllocation, monthKey, monthLabel, monthsWithData } from '../budget';
import { AllocationBar, Button, C, Card, groupColor, rm, s, SectionHeader, Segmented } from '../ui';
import { exportReport } from '../statement';
import CloseMonth from './CloseMonth';

const tell = (t, m) => (Platform.OS === 'web' ? window.alert(`${t}\n\n${m}`) : Alert.alert(t, m));

export default function HistoryScreen() {
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(null); // month key being viewed
  const [exporting, setExporting] = useState(false);
  const [finding, setFinding] = useState(false);
  const months = monthsWithData(state);
  const years = [...new Set(months.map((k) => k.slice(0, 4)))]; // newest first
  const [yearFilter, setYearFilter] = useState(monthKey().slice(0, 4));
  const shown = yearFilter === 'all' ? months : months.filter((k) => k.startsWith(yearFilter));

  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setOpen(null); return true; });
    return () => sub.remove();
  }, [open]);

  const [cameBack, setCameBack] = useState(false);
  if (open) return <MonthDetail monthKey={open} onBack={() => { setCameBack(true); setOpen(null); }} />;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ backgroundColor: C.brand, paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 14 }}>
        <Text style={{ color: '#CFE3DA', fontSize: 13, fontWeight: '600', letterSpacing: 1 }}>HISTORY</Text>
        <View style={[s.between, { marginTop: 4 }]}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>Where the money went</Text>
          <Pressable onPress={() => setExporting(true)} style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Export PDF</Text>
          </Pressable>
        </View>
      </View>
      <TabSwipe enterFrom={cameBack ? 'left' : undefined}>
      {/* find a month: year filter + jump-to-month grid */}
      <View style={[s.row, { paddingHorizontal: 16, paddingTop: 10, flexWrap: 'wrap' }]}>
        {[...years, 'all'].map((y) => (
          <Pressable key={y} onPress={() => setYearFilter(y)} style={[pill, yearFilter === y && pillOn]}>
            <Text style={[pillText, yearFilter === y && { color: '#fff' }]}>{y === 'all' ? 'All' : y}</Text>
          </Pressable>
        ))}
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => setFinding(!finding)} style={[pill, finding && pillOn]}>
          <Text style={[pillText, finding && { color: '#fff' }]}>📅 Find month</Text>
        </Pressable>
      </View>
      {finding ? <MonthGrid state={state} hasData={new Set(months)} onPick={(k) => { setFinding(false); setOpen(k); }} /> : null}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={[s.row, { marginHorizontal: 16, marginTop: 8, flexWrap: 'wrap' }]}>
          <Key color={C.fixed} label="Fixed" />
          <Key color={C.variable} label="Variable" />
          <Key color={C.free} label="Free allocation" />
          <Key color="#D8D4C8" label="Unallocated" />
        </View>
        {shown.map((k) => <MonthRow key={k} monthKey={k} onPress={() => !justSwiped() && setOpen(k)} />)}
        {!shown.length ? <Text style={[s.muted, { textAlign: 'center', marginTop: 24 }]}>No months in {yearFilter}.</Text> : null}
        <Text style={[s.muted, { textAlign: 'center', marginTop: 16, marginHorizontal: 24 }]}>
          Each month shows its final allocation. Tap a month for estimate, actual and final side by side.
        </Text>
      </ScrollView>
      </TabSwipe>
      <ExportPicker visible={exporting} months={months} onClose={() => setExporting(false)} />
    </View>
  );
}

const pill = { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: C.brandSoft, marginRight: 6, marginBottom: 4 };
const pillOn = { backgroundColor: C.brand };
const pillText = { fontSize: 12.5, fontWeight: '700', color: C.brand };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Small calendar of months: pick a year, tap a month to open it. Months without data are greyed out.
function MonthGrid({ state, hasData, onPick }) {
  const [year, setYear] = useState(Number(monthKey().slice(0, 4)));
  const swipe = useHorizontalSwipe({ capture: true, onLeft: () => setYear((y) => y + 1), onRight: () => setYear((y) => y - 1) });
  return (
    <View {...swipe} style={{ marginHorizontal: 16, marginTop: 6, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 10 }}>
      <View style={s.between}>
        <Pressable onPress={() => setYear(year - 1)} hitSlop={10} style={navBtn}><Text style={navTxt}>‹</Text></Pressable>
        <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>{year}</Text>
        <Pressable onPress={() => setYear(year + 1)} hitSlop={10} style={navBtn}><Text style={navTxt}>›</Text></Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
        {MON.map((m, i) => {
          const key = `${year}-${String(i + 1).padStart(2, '0')}`;
          const has = hasData.has(key);
          const closed = !!state.finals?.[key];
          return (
            <Pressable key={key} disabled={!has} onPress={() => onPick(key)} style={{ width: '25%', padding: 3 }}>
              <View style={{ alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: has ? (closed ? '#DCEFE3' : '#FDF0D5') : '#F4F2EC' }}>
                <Text style={{ fontSize: 13, fontWeight: has ? '800' : '500', color: has ? C.ink : '#B9B6AD' }}>{m}</Text>
                <Text style={{ fontSize: 9.5, color: has ? (closed ? C.good : C.warn) : '#C9C6BD' }}>{has ? (closed ? 'closed' : 'open') : '–'}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
const navBtn = { width: 30, height: 30, borderRadius: 15, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' };
const navTxt = { color: C.brand, fontSize: 18, fontWeight: '700', lineHeight: 20 };

function Key({ color, label }) {
  return (
    <View style={[s.row, { marginRight: 12, marginBottom: 4 }]}>
      <View style={[s.dot, { backgroundColor: color, width: 8, height: 8, marginRight: 5 }]} />
      <Text style={{ fontSize: 12, color: C.sub }}>{label}</Text>
    </View>
  );
}

function MonthRow({ monthKey: k, onPress }) {
  const { state } = useStore();
  const ma = monthAllocation(state, k);
  const c = ma.calc;
  const isCurrent = k === monthKey();
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={s.between}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: C.ink }}>{monthLabel(k, true)}</Text>
          <Badge closed={ma.closed} current={isCurrent} />
        </View>
        <View style={[s.between, { marginTop: 4, marginBottom: 10 }]}>
          <Text style={s.muted}>{ma.closed ? 'Final income' : 'Received so far'}</Text>
          <Text style={{ fontWeight: '700', color: C.ink }}>{rm(c.income)}</Text>
        </View>
        <AllocationBar calc={c} />
        <View style={[s.between, { marginTop: 10 }]}>
          <Fig label="Fixed" value={c.totals.fixed} color={C.fixed} income={c.income} />
          <Fig label="Variable" value={c.totals.variable} color={C.variable} income={c.income} />
          <Fig label="Free" value={c.totals.free} color={C.free} income={c.income} />
          <Fig label="Unalloc." value={c.unallocated} color={C.sub} income={c.income} />
        </View>
        <ItemShares ma={ma} />
      </Card>
    </Pressable>
  );
}

function Badge({ closed, current }) {
  const [bg, fg, text] = closed ? ['#DCEFE3', C.good, 'Closed ✓'] : current ? ['#ECEAE3', C.sub, 'In progress'] : ['#FDF0D5', C.warn, 'Not closed'];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

const share = (v, income) => (income ? `${((v / income) * 100).toFixed(1)}%` : '–');

function Fig({ label, value, color, income }) {
  return (
    <View style={{ alignItems: 'flex-start' }}>
      <Text style={{ fontSize: 11, color }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink }}>{rm(value, 0)}</Text>
      <Text style={{ fontSize: 11, color: C.sub }}>{share(value, income)}</Text>
    </View>
  );
}

// Every budget item as % of total income, compact chips grouped by colour.
function ItemShares({ ma }) {
  const c = ma.calc;
  const items = ma.alloc.lines.filter((l) => (c.byId[l.id]?.amount ?? 0) !== 0);
  if (!items.length || !c.income) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.line }}>
      {items.map((l) => (
        <View key={l.id} style={[s.row, { marginRight: 10, marginBottom: 3 }]}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: groupColor(l.group), marginRight: 4 }} />
          <Text style={{ fontSize: 11.5, color: C.sub }}>{l.name} </Text>
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: C.ink }}>{share(c.byId[l.id].amount, c.income)}</Text>
        </View>
      ))}
    </View>
  );
}

// ---------- one month in detail ----------
function MonthDetail({ monthKey: k, onBack }) {
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const ma = monthAllocation(state, k);
  const plan = computeBudget(ma.budget);
  const a = ma.actuals;
  const fin = ma.closed ? ma.calc : null;
  const ids = new Set(ma.budget.lines.map((l) => l.id));
  const inc = { e: plan.income, a: a.incomeReceived, f: fin?.income };
  const lines = [...ma.budget.lines, ...(state.finals?.[k]?.lines ?? []).filter((l) => !ids.has(l.id))];

  const doExport = async () => {
    try { setBusy(true); await exportReport(state, [k], 'full'); }
    catch (e) { tell('Could not create PDF', String(e?.message ?? e)); }
    finally { setBusy(false); }
  };

  return (
    <TabSwipe style={{ backgroundColor: C.bg }} onRight={onBack} onLeft={null} enterFrom="right">
      <View style={{ backgroundColor: C.brand, paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 14 }}>
        <Pressable onPress={onBack} hitSlop={10}><Text style={{ color: '#CFE3DA', fontSize: 14, fontWeight: '600' }}>‹ History</Text></Pressable>
        <View style={[s.between, { marginTop: 4 }]}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>{monthLabel(k, true)}</Text>
          <Badge closed={ma.closed} current={k === monthKey()} />
        </View>
        {ma.closed ? <Text style={{ color: '#CFE3DA', fontSize: 12, marginTop: 2 }}>Closed {new Date(ma.closedAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</Text> : null}
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Card>
          <Text style={s.label}>Final allocation</Text>
          {fin ? (
            <>
              <View style={{ marginTop: 10 }}><AllocationBar calc={fin} height={12} /></View>
              <View style={[s.between, { marginTop: 10 }]}>
                <Fig label="Fixed" value={fin.totals.fixed} color={C.fixed} income={fin.income} />
                <Fig label="Variable" value={fin.totals.variable} color={C.variable} income={fin.income} />
                <Fig label="Free" value={fin.totals.free} color={C.free} income={fin.income} />
                <Fig label="Unalloc." value={fin.unallocated} color={C.sub} income={fin.income} />
              </View>
            </>
          ) : (
            <Text style={[s.muted, { marginTop: 6 }]}>Not closed yet. Close the month to save where the money finally went.</Text>
          )}
        </Card>

        <Card>
          <View style={[s.row, { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: C.ink }]}>
            <Text style={[s.label, { flex: 1 }]}>Item</Text>
            <Text style={[s.label, colW]}>Estimate</Text>
            <Text style={[s.label, colW]}>Actual</Text>
            <Text style={[s.label, colW, { color: C.brand }]}>Final</Text>
          </View>
          <Tri label="Income" e={plan.income} a={a.incomeReceived} f={fin?.income} bold />
          {GROUPS.map((g) => {
            const gl = lines.filter((l) => l.group === g.key);
            if (!gl.length) return null;
            return (
              <View key={g.key} style={{ marginTop: 10 }}>
                <SectionHeader title={g.label} color={groupColor(g.key)} />
                {gl.map((l) => <Tri key={l.id} inc={inc} label={l.name} e={plan.byId[l.id]?.amount ?? 0} a={a.byLine[l.id] ?? 0} f={fin ? fin.byId[l.id]?.amount ?? 0 : null} />)}
                <Tri inc={inc} label={`Total ${g.label.toLowerCase()}`} e={plan.totals[g.key]} a={a.totals[g.key]} f={fin?.totals[g.key]} bold />
              </View>
            );
          })}
          <View style={{ marginTop: 10 }}>
            <Tri inc={inc} label="Unallocated" e={plan.unallocated} a={a.leftover} f={fin?.unallocated} bold />
          </View>
          <Text style={[s.muted, { fontSize: 11, marginTop: 8 }]}>
            Small grey % = share of that column's total income. Estimate = your plan. Actual = what you recorded. Final = what you saved when closing the month.
          </Text>
        </Card>

        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <Button title={ma.closed ? 'Adjust final allocation' : `Close ${monthLabel(k)}`} onPress={() => setClosing(true)} />
          {busy ? <ActivityIndicator color={C.brand} style={{ marginTop: 10 }} /> : null}
          <Button kind="ghost" title="Export this month (PDF)" onPress={doExport} style={{ marginTop: 10 }} />
        </View>
      </ScrollView>
      <CloseMonth monthKey={k} visible={closing} onClose={() => setClosing(false)} />
    </TabSwipe>
  );
}

const colW = { width: 72, textAlign: 'right' };

function Tri({ label, e, a, f, bold, inc }) {
  const w = bold ? '800' : '500';
  const Cell = ({ v, base, color, weight }) => (
    <View style={{ width: 72 }}>
      <Text style={{ fontSize: 13, color, fontWeight: weight, textAlign: 'right' }}>{v == null ? '–' : short(v)}</Text>
      {inc && v != null ? <Text style={{ fontSize: 10.5, color: C.sub, textAlign: 'right' }}>{share(v, base)}</Text> : null}
    </View>
  );
  return (
    <View style={[s.row, { paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.line }]}>
      <Text style={{ flex: 1, fontSize: 13, color: C.ink, fontWeight: bold ? '700' : '400' }} numberOfLines={2}>{label}</Text>
      <Cell v={e} base={inc?.e} color={C.sub} weight={w} />
      <Cell v={a} base={inc?.a} color={C.ink} weight={w} />
      <Cell v={f} base={inc?.f} color={C.brand} weight={bold ? '800' : '700'} />
    </View>
  );
}
const short = (v) => {
  const n = Math.round(v ?? 0);
  return (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('en-MY');
};

// ---------- pick months to export ----------
function ExportPicker({ visible, months, onClose }) {
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState([]);
  const [mode, setMode] = useState('summary');
  const [busy, setBusy] = useState(false);
  const sheet = useSwipeDown(onClose, visible);
  if (!visible) return null;

  const toggle = (k) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const year = String(new Date().getFullYear());
  const quick = [
    { label: 'Last 3', keys: months.slice(0, 3) },
    { label: 'Last 6', keys: months.slice(0, 6) },
    { label: `${year}`, keys: months.filter((k) => k.startsWith(year)) },
    { label: 'All', keys: months },
    { label: 'Clear', keys: [] },
  ];

  const go = async () => {
    if (!picked.length) return tell('Pick months', 'Choose at least one month to export.');
    try { setBusy(true); await exportReport(state, picked, mode); sheet.dismiss(); }
    catch (e) { tell('Could not create PDF', String(e?.message ?? e)); }
    finally { setBusy(false); }
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => sheet.dismiss()}>
      <SheetBackdrop sheet={sheet} />
      <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <Animated.View style={[{ backgroundColor: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%', paddingBottom: insets.bottom + 14 }, sheet.style]}>
          <View {...sheet.handlers}>
            <GrabBar />
            <View style={[s.between, { paddingHorizontal: 18, paddingBottom: 6 }]}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink }}>Export PDF</Text>
              <Pressable onPress={() => sheet.dismiss()} hitSlop={10}><Text style={{ color: C.sub, fontSize: 15 }}>Cancel</Text></Pressable>
            </View>
          </View>
          <View style={{ paddingHorizontal: 18 }}>
            <Text style={[s.label, { marginTop: 6, marginBottom: 6 }]}>Report</Text>
            <Segmented value={mode} onChange={setMode} options={[{ label: 'Summary only', value: 'summary' }, { label: 'Full statements', value: 'full' }]} />
            <Text style={[s.muted, { marginTop: 6 }]}>
              {mode === 'summary'
                ? 'One page: the final allocation of each month side by side, with totals and averages.'
                : 'The summary page, then a full statement for each month (estimate, actual, final, records and assets).'}
            </Text>
            <Text style={[s.label, { marginTop: 14 }]}>Months</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
              {quick.map((q) => (
                <Pressable key={q.label} onPress={() => setPicked(q.keys)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: C.brandSoft, marginRight: 6, marginBottom: 6 }}>
                  <Text style={{ color: C.brand, fontWeight: '700', fontSize: 13 }}>{q.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View {...sheet.bodyHandlers} style={{ flexShrink: 1 }}>
          <ScrollView onScroll={sheet.onScroll} scrollEventThrottle={16} scrollEnabled={sheet.scrollEnabled} bounces={false} overScrollMode="never" style={{ marginTop: 4 }} contentContainerStyle={{ paddingHorizontal: 18 }}>
            {months.map((k) => {
              const on = picked.includes(k);
              const closed = !!state.finals?.[k];
              return (
                <Pressable key={k} onPress={() => toggle(k)} style={[s.between, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line }]}>
                  <View style={s.row}>
                    <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: on ? C.brand : '#B9B6AD', backgroundColor: on ? C.brand : '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      {on ? <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13, lineHeight: 15 }}>✓</Text> : null}
                    </View>
                    <Text style={{ fontSize: 15, color: C.ink, fontWeight: '600' }}>{monthLabel(k, true)}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: closed ? C.good : C.warn }}>{closed ? 'Closed' : 'Not closed'}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          </View>
          <View style={{ paddingHorizontal: 18, paddingTop: 12 }}>
            {busy ? <ActivityIndicator color={C.brand} style={{ marginBottom: 8 }} /> : null}
            <Button title={`Export ${picked.length || ''} month${picked.length === 1 ? '' : 's'}`.replace('  ', ' ')} onPress={go} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
