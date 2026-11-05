// Month-end "Close month": decide where this month's real money finally went, using the same
// sequence as the Plan (fixed -> variable -> free allocation), then save it as that month's final.
import React, { useState } from 'react';
import { Alert, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { GrabBar, useSwipeDown } from '../gestures';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { actualsFor, applyRecorded, budgetFor, computeBudget, draftFinal, editAllAtClose, GROUPS, monthLabel } from '../budget';
import { Button, C, Card, NumberField, pct, rm, s } from '../ui';
import { FlowGrid, GroupHeader, LineRow } from './PlanScreen';

export default function CloseMonth({ monthKey: key, visible, onClose }) {
  const { state, saveFinal, reopenMonth } = useStore();
  const insets = useSafeAreaInsets();
  const { budget } = budgetFor(state.budgets, key);
  const actuals = actualsFor(state.transactions, key, budget);
  const plan = computeBudget(budget);

  const editAll = editAllAtClose(state);
  // locked (default): income, fixed and variable are always what you recorded
  const lockIt = (d) => (editAll ? d : applyRecorded(d, budget, actuals));
  const initial = () => lockIt(JSON.parse(JSON.stringify(state.finals?.[key] ?? draftFinal(budget, actuals))));
  const [draft, setDraft] = useState(initial);
  const [openedFor, setOpenedFor] = useState(null);
  const sheet = useSwipeDown(onClose, visible);
  if (visible && openedFor !== key) { setOpenedFor(key); setDraft(initial()); }
  if (!visible && openedFor) setOpenedFor(null);
  if (!visible) return null;

  const r = computeBudget(draft);
  const closed = !!state.finals?.[key];
  const updateLine = (id, patch) => setDraft((d) => ({ ...d, lines: d.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));

  const save = () => {
    const doIt = () => { saveFinal(key, lockIt(draft)); sheet.dismiss(); };
    if (Math.abs(r.unallocated) > 0.5) {
      const msg = r.unallocated > 0
        ? `${rm(r.unallocated)} has no place yet. Save anyway? It will show as "Unallocated".`
        : `You have allocated ${rm(-r.unallocated)} more than the income. Save anyway?`;
      if (Platform.OS === 'web') return window.confirm(msg) && doIt();
      return Alert.alert('Not fully allocated', msg, [{ text: 'Go back', style: 'cancel' }, { text: 'Save', onPress: doIt }]);
    }
    doIt();
  };

  const reopen = () => {
    const go = () => { reopenMonth(key); sheet.dismiss(); };
    const msg = `Remove the saved final allocation for ${monthLabel(key, true)}? Your records stay untouched.`;
    if (Platform.OS === 'web') return window.confirm(msg) && go();
    Alert.alert('Reopen month', msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Reopen', style: 'destructive', onPress: go }]);
  };

  const resetDraft = () => setDraft(lockIt(draftFinal(budget, actuals)));

  const groupBase = { fixed: r.income, variable: r.afterFixed, free: r.remaining };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => sheet.dismiss()}>
      <Animated.View style={[{ flex: 1, backgroundColor: C.bg }, sheet.style]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
        <View {...sheet.handlers} style={{ backgroundColor: C.brand, paddingTop: insets.top + 2, paddingHorizontal: 20, paddingBottom: 14 }}>
          <GrabBar light />
          <View style={s.between}>
            <Text style={{ color: '#CFE3DA', fontSize: 13, fontWeight: '600', letterSpacing: 1 }}>CLOSE MONTH · FINAL ALLOCATION</Text>
            <Pressable onPress={() => sheet.dismiss()} hitSlop={10}><Text style={{ color: '#fff', fontSize: 15 }}>Cancel</Text></Pressable>
          </View>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 4 }}>{monthLabel(key, true)}</Text>
        </View>

        <View {...sheet.bodyHandlers} style={{ flex: 1 }}>
        <ScrollView onScroll={sheet.onScroll} scrollEventThrottle={16} scrollEnabled={sheet.scrollEnabled} bounces={false} overScrollMode="never" contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ marginHorizontal: 16, marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: C.brandSoft }}>
            <Text style={{ color: C.brand, fontSize: 13 }}>
              {editAll
                ? 'Edit-everything mode is on (Settings). Income, fixed and variable start from your records and can be changed. Free allocation starts from your plan\'s split.'
                : 'Income, fixed and variable come straight from your Records. To change them, fix the records. You decide how the money left over is split across free allocation, by % or RM.'}
            </Text>
          </View>

          <Card style={{ padding: 12 }}>
            <View style={s.between}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={s.label}>Final income</Text>
                <Text style={[s.muted, { marginTop: 2 }]}>Received {rm(actuals.incomeReceived, 0)} · plan {rm(plan.income, 0)}</Text>
              </View>
              {editAll ? (
                <NumberField value={draft.income} onChange={(v) => setDraft((d) => ({ ...d, income: v }))} prefix="RM" width={140} />
              ) : (
                <Text style={{ fontSize: 17, fontWeight: '800', color: C.ink }}>{rm(draft.income)}</Text>
              )}
            </View>
            <FlowGrid r={r} />
          </Card>

          {GROUPS.map((g) => {
            const lines = draft.lines.filter((l) => l.group === g.key);
            if (!lines.length) return null;
            return (
              <Card key={g.key} style={{ padding: 12, marginTop: 8 }}>
                <GroupHeader group={g} total={r.totals[g.key]} base={groupBase[g.key]} locked={!editAll && g.key !== 'free'} />
                {lines.map((l, i) => (
                  <LineRow
                    key={l.id}
                    line={l}
                    calc={r.byId[l.id]}
                    first={i === 0}
                    locked={!editAll && g.key !== 'free'}
                    hints={{ estimate: plan.byId[l.id]?.amount ?? 0, actual: actuals.byLine[l.id] ?? 0 }}
                    onUseActual={() => updateLine(l.id, { mode: 'amount', value: Math.round((actuals.byLine[l.id] ?? 0) * 100) / 100 })}
                    onChange={(patch) => updateLine(l.id, patch)}
                  />
                ))}
                {g.key === 'free' && lines.every((l) => l.mode === 'percent') && Math.abs(r.freePctSum - 100) > 0.01 ? (
                  <Text style={{ color: C.warn, fontSize: 13, marginTop: 6 }}>These add up to {pct(r.freePctSum, 0)}.</Text>
                ) : null}
              </Card>
            );
          })}

          {actuals.totals.uncategorised > 0 ? (
            <Card><Text style={{ color: C.warn, fontSize: 13 }}>{rm(actuals.totals.uncategorised)} was recorded under deleted categories and is not in the lines above.</Text></Card>
          ) : null}

          <View style={{ marginHorizontal: 16, marginTop: 16 }}>
            <Button title={`Save as ${monthLabel(key)} final`} onPress={save} />
            <Button kind="ghost" title={editAll ? 'Start again from recorded figures' : 'Reset free allocation to plan split'} onPress={resetDraft} style={{ marginTop: 10 }} />
            {closed ? <Button kind="danger" title="Reopen month (remove final)" onPress={reopen} style={{ marginTop: 10 }} /> : null}
          </View>
        </ScrollView>
        </View>
      </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

