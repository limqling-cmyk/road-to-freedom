import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { GrabBar, justSwiped, SheetBackdrop, TabSwipe, useSwipeDown } from '../gestures';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { actualsFor, budgetFor, computeBudget, GROUPS, monthKey, num } from '../budget';
import { Button, C, Card, groupColor, MonthBar, rm, s, Segmented } from '../ui';
import DatePicker, { todayISO as today } from '../DatePicker';
import IncomeSources from '../IncomeSources';


export default function RecordsScreen() {
  const { state, month } = useStore();
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null); // tx object or null
  const insets = useSafeAreaInsets();
  const { budget } = budgetFor(state.budgets, month);
  const a = actualsFor(state.transactions, month, budget);
  const lineMap = Object.fromEntries(budget.lines.map((l) => [l.id, l]));

  const list = a.tx
    .filter((t) => filter === 'all' || t.type === filter)
    .sort((x, y) => (y.date + (y.created ?? '')).localeCompare(x.date + (x.created ?? '')));

  const newTx = (type) => ({
    type,
    amount: '',
    date: today(), // new records always start on today's date
    lineId: type === 'expense' ? budget.lines.find((l) => l.group === 'variable')?.id ?? budget.lines[0]?.id : null,
    source: '',
    pending: false,
    note: '',
  });

  // group by date
  const days = [];
  for (const t of list) {
    if (!days.length || days[days.length - 1].date !== t.date) days.push({ date: t.date, items: [] });
    days[days.length - 1].items.push(t);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <MonthBar title="Records · Actual" />
      <TabSwipe slideKey={month}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <Card>
          <View style={s.between}>
            <Stat label="Money in" value={a.incomeReceived} color={C.good} />
            <Stat label="Money out" value={a.out} color={C.bad} />
            <Stat label="Left" value={a.leftover} color={a.leftover >= 0 ? C.ink : C.bad} />
          </View>
          {a.incomePending > 0 ? (
            <Text style={[s.muted, { marginTop: 8 }]}>Still waiting for {rm(a.incomePending)} of income (not paid yet).</Text>
          ) : null}
        </Card>

        <View style={{ marginHorizontal: 16, marginTop: 14 }}>
          <Segmented value={filter} onChange={setFilter} options={[{ label: 'All', value: 'all' }, { label: 'Income', value: 'income' }, { label: 'Expenses', value: 'expense' }, { label: 'Chart ▮', value: 'chart' }]} />
        </View>

        {filter === 'chart' ? (
          <SpendingChart budget={budget} actuals={a} />
        ) : days.length === 0 ? (
          <Text style={[s.muted, { textAlign: 'center', marginTop: 40 }]}>Nothing recorded for this month yet.</Text>
        ) : (
          days.map((d) => (
            <Card key={d.date} style={{ paddingVertical: 6 }}>
              <Text style={[s.label, { marginTop: 8, marginBottom: 2 }]}>{prettyDate(d.date)}</Text>
              {d.items.map((t) => {
                const line = lineMap[t.lineId];
                const title = t.type === 'income' ? t.source || 'Income' : line?.name ?? t.lineName ?? 'Uncategorised';
                return (
                  <Pressable key={t.id} onPress={() => !justSwiped() && setEditing({ ...t, amount: String(t.amount) })} style={[s.between, { paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line }]}>
                    <View style={[s.row, { flex: 1 }]}>
                      <View style={[s.dot, { backgroundColor: t.type === 'income' ? C.good : groupColor(line?.group) }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, color: C.ink, fontWeight: '600' }}>
                          {title}
                          {t.pending ? <Text style={{ color: C.warn, fontSize: 12 }}>  · not paid yet</Text> : null}
                        </Text>
                        {t.note ? <Text style={s.muted} numberOfLines={1}>{t.note}</Text> : null}
                      </View>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: t.type === 'income' ? C.good : C.ink }}>
                      {t.type === 'income' ? '+' : '−'}{rm(t.amount)}
                    </Text>
                  </Pressable>
                );
              })}
            </Card>
          ))
        )}
      </ScrollView>
      </TabSwipe>

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16, flexDirection: 'row' }}>
        <Button title="+ Income" kind="ghost" style={{ flex: 1, marginRight: 8, backgroundColor: '#DCEFE3' }} onPress={() => setEditing(newTx('income'))} />
        <Button title="+ Expense" style={{ flex: 1.4 }} onPress={() => setEditing(newTx('expense'))} />
      </View>

      <TxModal tx={editing} budget={budget} onClose={() => setEditing(null)} bottom={insets.bottom} />
    </View>
  );
}

// Horizontal bars: which items took the most money this month.
function SpendingChart({ budget, actuals }) {
  const plan = computeBudget(budget);
  const rows = (groups) =>
    budget.lines
      .filter((l) => groups.includes(l.group))
      .map((l) => ({ ...l, amount: actuals.byLine[l.id] ?? 0, plan: plan.byId[l.id]?.amount ?? 0 }))
      .filter((r) => r.amount > 0 || r.plan > 0)
      .sort((x, y) => y.amount - x.amount);
  const spend = rows(['fixed', 'variable']);
  if (actuals.totals.uncategorised > 0) spend.push({ id: 'unc', name: 'Uncategorised', group: 'none', amount: actuals.totals.uncategorised, plan: 0 });
  const free = rows(['free']);
  const totalSpend = spend.reduce((t, r) => t + r.amount, 0);
  const totalFree = free.reduce((t, r) => t + r.amount, 0);
  const max = Math.max(1, ...spend.map((r) => Math.max(r.amount, r.plan)), ...free.map((r) => Math.max(r.amount, r.plan)));

  const Row = ({ r, total }) => {
    const over = r.kind === 'cap' && r.amount > r.plan + 0.005 && r.plan > 0;
    const color = over ? C.bad : groupColor(r.group);
    return (
      <View style={{ paddingVertical: 6 }}>
        <View style={s.between}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: C.ink, flex: 1 }} numberOfLines={1}>{r.name}</Text>
          <Text style={{ fontSize: 13, fontWeight: '800', color: over ? C.bad : C.ink }}>{rm(r.amount, 0)}</Text>
          <Text style={{ width: 52, textAlign: 'right', fontSize: 12, color: C.sub }}>{total ? ((r.amount / total) * 100).toFixed(0) : 0}%</Text>
        </View>
        <View style={{ height: 12, marginTop: 4, borderRadius: 4, backgroundColor: '#F1EFE9', overflow: 'hidden' }}>
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(r.amount / max) * 100}%`, backgroundColor: color, borderRadius: 4 }} />
          {r.plan > 0 ? <View style={{ position: 'absolute', top: 0, bottom: 0, width: 2, left: `${Math.min(r.plan / max, 1) * 100}%`, backgroundColor: C.ink, opacity: 0.55 }} /> : null}
        </View>
        {r.plan > 0 ? <Text style={{ fontSize: 10.5, color: C.sub, marginTop: 2 }}>plan {rm(r.plan, 0)}{over ? `  ·  ${rm(r.amount - r.plan, 0)} over` : ''}</Text> : null}
      </View>
    );
  };

  // income by source
  const bySrc = {};
  for (const t of actuals.tx.filter((x) => x.type === 'income')) {
    const k = t.source || 'Other';
    bySrc[k] = bySrc[k] ?? { name: k, amount: 0, pending: 0 };
    if (t.pending) bySrc[k].pending += num(t.amount);
    else bySrc[k].amount += num(t.amount);
  }
  const incomeRows = Object.values(bySrc).sort((x, y) => y.amount + y.pending - (x.amount + x.pending));
  const incTotal = incomeRows.reduce((t, r) => t + r.amount, 0);
  const incMax = Math.max(1, ...incomeRows.map((r) => r.amount + r.pending));

  return (
    <>
      <Card>
        <View style={s.between}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>Where income came from</Text>
          <Text style={{ fontSize: 13, color: C.sub }}>received {rm(incTotal, 0)}</Text>
        </View>
        <Text style={[s.muted, { fontSize: 11, marginBottom: 4 }]}>Biggest first · % of income received · light orange = not paid yet</Text>
        {incomeRows.length ? incomeRows.map((r) => (
          <View key={r.name} style={{ paddingVertical: 5 }}>
            <View style={s.between}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.ink, flex: 1 }} numberOfLines={1}>{r.name}</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.good }}>{rm(r.amount, 0)}</Text>
              <Text style={{ width: 52, textAlign: 'right', fontSize: 12, color: C.sub }}>{incTotal ? ((r.amount / incTotal) * 100).toFixed(0) : 0}%</Text>
            </View>
            <View style={{ height: 12, marginTop: 4, borderRadius: 4, backgroundColor: '#F1EFE9', overflow: 'hidden', flexDirection: 'row' }}>
              <View style={{ width: `${(r.amount / incMax) * 100}%`, backgroundColor: C.good }} />
              {r.pending ? <View style={{ width: `${(r.pending / incMax) * 100}%`, backgroundColor: '#F2D49B', borderLeftWidth: 1, borderColor: '#fff' }} /> : null}
            </View>
            {r.pending ? <Text style={{ fontSize: 10.5, color: C.warn, marginTop: 2 }}>+ {rm(r.pending, 0)} not paid yet</Text> : null}
          </View>
        )) : <Text style={s.muted}>No income recorded yet.</Text>}
      </Card>
      <Card>
        <View style={s.between}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>Where you spent</Text>
          <Text style={{ fontSize: 13, color: C.sub }}>fixed + variable {rm(totalSpend, 0)}</Text>
        </View>
        <Text style={[s.muted, { fontSize: 11, marginBottom: 4 }]}>Biggest first · % of spending · dark tick = plan</Text>
        {spend.length ? spend.map((r) => <Row key={r.id} r={r} total={totalSpend} />) : <Text style={s.muted}>No spending recorded yet.</Text>}
      </Card>
      {free.length ? (
        <Card>
          <View style={s.between}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>Moved to free allocation</Text>
            <Text style={{ fontSize: 13, color: C.sub }}>{rm(totalFree, 0)}</Text>
          </View>
          {free.map((r) => <Row key={r.id} r={r} total={totalFree} />)}
        </Card>
      ) : null}
    </>
  );
}

function Stat({ label, value, color }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={s.label}>{label}</Text>
      <Text style={{ fontSize: 17, fontWeight: '800', color, marginTop: 4 }}>{rm(value, 0)}</Text>
    </View>
  );
}

function TxModal({ tx, budget, onClose, bottom }) {
  const { saveTransaction, deleteTransaction, month, setMonth } = useStore();
  const [form, setForm] = useState(tx);
  const [lastTx, setLastTx] = useState(tx);
  if (tx !== lastTx) { setLastTx(tx); setForm(tx); }
  const sheet = useSwipeDown(onClose, !!tx);
  // focus the amount box after the sheet has slid up (focusing during the slide makes it jerky)
  const amountRef = useRef(null);
  useEffect(() => {
    if (tx && !tx.id) { const id = setTimeout(() => amountRef.current?.focus(), 320); return () => clearTimeout(id); }
  }, [tx]);
  if (!tx || !form) return null;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const isIncome = form.type === 'income';

  const save = () => {
    const amount = num(form.amount);
    if (amount <= 0) return warn('Please enter an amount.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return warn('Date should look like 2026-11-05.');
    if (!isIncome && !form.lineId) return warn('Please pick a category.');
    if (isIncome && !(form.source || '').trim()) return warn('Please pick who the income is from.');
    const line = budget.lines.find((l) => l.id === form.lineId);
    saveTransaction({
      ...form,
      amount,
      source: (form.source || '').trim(),
      lineId: isIncome ? null : form.lineId,
      lineName: isIncome ? null : line?.name,
      pending: isIncome ? !!form.pending : false,
      created: form.created ?? new Date().toISOString(),
    });
    // jump to the month the record belongs to, so you can see it straight away
    if (form.date.slice(0, 7) !== month) setMonth(form.date.slice(0, 7));
    sheet.dismiss();
  };

  const remove = () => {
    const go = () => { deleteTransaction(form.id); sheet.dismiss(); };
    if (Platform.OS === 'web') return window.confirm('Delete this record?') && go();
    Alert.alert('Delete record', 'Delete this record?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: go }]);
  };

  return (
    <Modal visible animationType="none" transparent statusBarTranslucent onRequestClose={() => sheet.dismiss()}>
      <SheetBackdrop sheet={sheet} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <Animated.View style={[{ backgroundColor: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%', paddingBottom: bottom + 12 }, sheet.style]}>
          {/* top part: pull down here to cancel (always works) */}
          <View {...sheet.handlers} style={{ paddingBottom: 6 }}>
            <GrabBar />
            <View style={[s.between, { paddingHorizontal: 18, paddingVertical: 4 }]}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink }}>{form.id ? 'Edit record' : 'New record'}</Text>
              <Pressable onPress={() => sheet.dismiss()} hitSlop={10}><Text style={{ color: C.sub, fontSize: 15 }}>Cancel</Text></Pressable>
            </View>
            <View style={{ paddingHorizontal: 18, marginTop: 8 }}>
              <Segmented value={form.type} onChange={(type) => set({ type, lineId: type === 'expense' ? form.lineId ?? budget.lines[0]?.id : form.lineId })} options={[{ label: 'Expense', value: 'expense' }, { label: 'Income', value: 'income' }]} />
            </View>
          </View>
          <View {...sheet.bodyHandlers} style={{ flexShrink: 1 }}>
          <ScrollView onScroll={sheet.onScroll} scrollEventThrottle={16} scrollEnabled={sheet.scrollEnabled} bounces={false} overScrollMode="never" contentContainerStyle={{ padding: 18, paddingTop: 0 }} keyboardShouldPersistTaps="handled">

            <Text style={[s.label, { marginTop: 16 }]}>Amount</Text>
            <View style={[s.numWrap, s.editable, { height: 54, marginTop: 6 }]}>
              <Text style={[s.affix, { fontSize: 18 }]}>RM</Text>
              <TextInput value={form.amount} onChangeText={(t) => set({ amount: t })} keyboardType="decimal-pad" placeholder="0.00" ref={amountRef} style={[s.numInput, { fontSize: 24, textAlign: 'left' }]} />
            </View>

            <Text style={[s.label, { marginTop: 16 }]}>Date</Text>
            <View style={{ marginTop: 6 }}>
              <DatePicker value={form.date} onChange={(d) => set({ date: d })} />
            </View>

            {isIncome ? (
              <>
                <View style={{ marginTop: 16 }}>
                  <IncomeSources selected={form.source} onSelect={(src) => set({ source: src })} />
                </View>
                <View style={[s.between, { marginTop: 14 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, color: C.ink, fontWeight: '600' }}>Not paid yet</Text>
                    <Text style={s.muted}>Tracked separately until you mark it received</Text>
                  </View>
                  <Switch value={!!form.pending} onValueChange={(v) => set({ pending: v })} trackColor={{ true: C.warn }} />
                </View>
              </>
            ) : (
              <>
                <Text style={[s.label, { marginTop: 16 }]}>Category</Text>
                {GROUPS.map((g) => {
                  const lines = budget.lines.filter((l) => l.group === g.key);
                  if (!lines.length) return null;
                  return (
                    <View key={g.key} style={{ marginTop: 8 }}>
                      <Text style={[s.muted, { fontSize: 12, marginBottom: 4 }]}>{g.label}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {lines.map((l) => (
                          <Chip key={l.id} label={l.name} active={form.lineId === l.id} color={groupColor(g.key)} onPress={() => set({ lineId: l.id })} />
                        ))}
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            <Text style={[s.label, { marginTop: 16 }]}>Note</Text>
            <TextInput value={form.note} onChangeText={(t) => set({ note: t })} placeholder="optional" style={[s.input, { marginTop: 6 }]} />

            <Button title="Save" onPress={save} style={{ marginTop: 20 }} />
            {form.id ? <Button title="Delete" kind="danger" onPress={remove} style={{ marginTop: 10 }} /> : null}
          </ScrollView>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Chip({ label, active, onPress, color }) {
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginRight: 6, marginBottom: 6, borderWidth: 1, borderColor: active ? color : C.line, backgroundColor: active ? color : '#fff' }}>
      <Text style={{ color: active ? '#fff' : C.ink, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const warn = (msg) => (Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Check this', msg));

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function prettyDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DOW[dt.getDay()]}, ${d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]}`;
}
