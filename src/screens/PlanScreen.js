import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useStore } from '../store';
import { budgetFor, computeBudget, GROUPS, monthLabel } from '../budget';
import { C, Card, groupColor, MonthBar, NumberField, pct, rm, s } from '../ui';
import { TabSwipe } from '../gestures';

// Column widths shared by the header and every row, so it reads like the Excel columns:
// [ % of total income ] [ your input (RM or %) ] [ result amount ]
const W_IN = 108;
const W_OUT = 96;

export default function PlanScreen() {
  const { state, month, setIncome, updateLine, addLine, removeLine, moveLine } = useStore();
  const [editing, setEditing] = useState(false);
  const { budget, inherited, from } = budgetFor(state.budgets, month);
  const r = computeBudget(budget);

  const confirmDelete = (line) => {
    const go = () => removeLine(month, line.id);
    if (Platform.OS === 'web') return window.confirm(`Delete "${line.name}"?`) && go();
    Alert.alert('Delete item', `Delete "${line.name}" from this month's plan?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <MonthBar title="Plan · % Distribution" />
      <TabSwipe slideKey={month}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        {inherited && from ? (
          <Text style={{ color: C.brand, fontSize: 12, marginHorizontal: 16, marginTop: 8 }}>
            Using {monthLabel(from)}'s plan. Any change saves it as {monthLabel(month)}'s own plan.
          </Text>
        ) : null}

        <Card style={{ padding: 12, marginTop: 8 }}>
          <View style={s.between}>
            <Text style={[s.label, { flex: 1 }]}>Estimated income</Text>
            <NumberField value={budget.income} onChange={(v) => setIncome(month, v)} prefix="RM" width={140} />
          </View>
          <FlowGrid r={r} />
        </Card>

        <View style={[s.between, { marginHorizontal: 16, marginTop: 10 }]}>
          <Text style={[s.muted, { fontSize: 12, flex: 1 }]}>Yellow = you adjust · tap ≤ limit / ≥ goal to switch</Text>
          <Pressable onPress={() => setEditing(!editing)} hitSlop={8}>
            <Text style={{ color: C.brand, fontWeight: '700', fontSize: 13 }}>{editing ? 'Done' : 'Edit'}</Text>
          </Pressable>
        </View>

        {GROUPS.map((g) => {
          const lines = budget.lines.filter((l) => l.group === g.key);
          const base = { fixed: r.income, variable: r.afterFixed, free: r.remaining }[g.key];
          const showPctWarn = g.key === 'free' && lines.length && lines.every((l) => l.mode === 'percent') && Math.abs(r.freePctSum - 100) > 0.01;
          return (
            <Card key={g.key} style={{ padding: 12, marginTop: 8 }}>
              <GroupHeader group={g} total={r.totals[g.key]} base={base} />
              {lines.map((l, i) => (
                <LineRow
                  key={l.id}
                  line={l}
                  calc={r.byId[l.id]}
                  editing={editing}
                  first={i === 0}
                  last={i === lines.length - 1}
                  onChange={(patch) => updateLine(month, l.id, patch)}
                  onDelete={() => confirmDelete(l)}
                  onMove={(d) => moveLine(month, l.id, d)}
                />
              ))}
              {showPctWarn ? (
                <Text style={{ color: C.warn, fontSize: 12, marginTop: 6 }}>
                  These add up to {pct(r.freePctSum, 0)}. Make it 100% so all the remaining money has a job.
                </Text>
              ) : null}
              <Pressable onPress={() => addLine(month, g.key)} hitSlop={6} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                <Text style={{ color: C.brand, fontWeight: '700', fontSize: 13 }}>+ Add item</Text>
              </Pressable>
            </Card>
          );
        })}
      </ScrollView>
      </TabSwipe>
    </View>
  );
}

// Income -> fixed -> after fixed -> variable -> remaining -> free -> unallocated, in 3 compact rows.
export function FlowGrid({ r }) {
  const pairs = [
    [['Fixed', -r.totals.fixed, C.fixed], ['After fixed', r.afterFixed]],
    [['Variable', -r.totals.variable, C.variable], ['Remaining', r.remaining]],
    [['Free alloc.', -r.totals.free, C.free], ['Unallocated', r.unallocated, null, Math.abs(r.unallocated) > 0.5]],
  ];
  return (
    <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6 }}>
      {pairs.map((pair, i) => (
        <View key={i} style={[s.row, { paddingVertical: 2 }]}>
          {pair.map(([label, value, color, warn], j) => (
            <View key={j} style={[s.between, { flex: 1, paddingRight: j === 0 ? 12 : 0, paddingLeft: j === 1 ? 12 : 0, borderLeftWidth: j === 1 ? 1 : 0, borderLeftColor: C.line }]}>
              <View style={s.row}>
                {color ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color, marginRight: 5 }} /> : null}
                <Text style={{ fontSize: 12, color: color ? C.sub : C.ink, fontWeight: color ? '400' : '700' }}>{label}</Text>
              </View>
              <Text style={{ fontSize: 12.5, color: warn ? C.warn : color ? C.sub : C.ink, fontWeight: color ? '500' : '800' }}>{fmt(value)}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function GroupHeader({ group, total, base, locked }) {
  return (
    <View style={{ marginBottom: 2 }}>
      <View style={s.between}>
        <View style={s.row}>
          <View style={[s.dot, { backgroundColor: groupColor(group.key) }]} />
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>{group.label}</Text>
        </View>
        <Text style={{ fontWeight: '800', color: C.ink, fontSize: 14 }}>{rm(total)}</Text>
      </View>
      <View style={[s.row, { marginTop: 6, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: C.line }]}>
        {locked ? (
          <>
            <Text style={[hdr, { flex: 1 }]}>Item · from records</Text>
            <Text style={[hdr, { width: 64, textAlign: 'right' }]}>% income</Text>
            <Text style={[hdr, { width: W_OUT, textAlign: 'right' }]}>Recorded</Text>
          </>
        ) : (
          <>
            <Text style={[hdr, { flex: 1 }]}>Item · % of income</Text>
            <Text style={[hdr, { width: W_IN, textAlign: 'center' }]} numberOfLines={1}>
              {group.key === 'fixed' ? 'RM / %' : `RM / % of ${short(base)}`}
            </Text>
            <Text style={[hdr, { width: W_OUT, textAlign: 'right' }]}>Amount</Text>
          </>
        )}
      </View>
    </View>
  );
}
const hdr = { fontSize: 10, color: C.sub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 };

export function LineRow({ line, calc, editing, onChange, onDelete, onMove, first, last, hints, onUseActual, locked }) {
  if (locked) {
    // read-only, one line: name · % of income · recorded amount
    return (
      <View style={[s.row, { paddingVertical: 7, borderTopWidth: first ? 0 : 1, borderTopColor: C.line }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.ink }} numberOfLines={1}>{line.name}</Text>
          {hints ? <Text style={{ fontSize: 11, color: C.sub }}>Plan {rm(hints.estimate, 0)}</Text> : null}
        </View>
        <Text style={{ width: 64, textAlign: 'right', fontSize: 13, fontWeight: '600', color: C.sub }}>{pct(calc?.pctOfIncome)}</Text>
        <Text style={{ width: W_OUT, textAlign: 'right', fontSize: 14, fontWeight: '800', color: C.ink }}>{fmt(calc?.amount)}</Text>
      </View>
    );
  }
  const setMode = (mode) => {
    if (mode === line.mode) return;
    // keep the same money when switching
    onChange({ mode, value: mode === 'percent' ? round(calc?.pctOfBase ?? 0) : round(calc?.amount ?? 0) });
  };
  const isCap = line.kind === 'cap';
  return (
    <View style={{ paddingVertical: 6, borderTopWidth: first ? 0 : 1, borderTopColor: C.line }}>
      {/* line 1: name, then the RM/% switch sitting right above the input */}
      <View style={s.row}>
        {editing ? (
          <TextInput value={line.name} onChangeText={(t) => onChange({ name: t })} style={[s.input, { flex: 1, height: 30, fontSize: 14, paddingHorizontal: 6 }]} />
        ) : (
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: C.ink }} numberOfLines={2}>{line.name}</Text>
        )}
        {editing ? (
          <View style={[s.row, { marginLeft: 6 }]}>
            <Mini label="↑" onPress={() => onMove(-1)} disabled={first} />
            <Mini label="↓" onPress={() => onMove(1)} disabled={last} />
            <Mini label="✕" onPress={onDelete} danger />
          </View>
        ) : (
          <>
            <View style={{ width: W_IN, alignItems: 'center' }}>
              <ModeSwitch value={line.mode} onChange={setMode} />
            </View>
            <View style={{ width: W_OUT, alignItems: 'flex-end' }}>
              {hints ? null : (
                <Pressable hitSlop={6} onPress={() => onChange({ kind: isCap ? 'target' : 'cap' })}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isCap ? C.variable : C.free }}>{isCap ? '≤ limit' : '≥ goal'}</Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </View>
      {/* line 2, like the Excel: % of total income | your input | result */}
      <View style={[s.row, { marginTop: 3 }]}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.sub }}>{pct(calc?.pctOfIncome)}</Text>
          {line.note ? <Text style={{ fontSize: 11, color: C.sub, marginLeft: 6, flexShrink: 1 }} numberOfLines={1}>{line.note}</Text> : null}
        </View>
        <View style={{ width: W_IN, alignItems: 'center' }}>
          <NumberField
            value={line.value}
            onChange={(v) => onChange({ value: v })}
            prefix={line.mode === 'amount' ? 'RM' : null}
            suffix={line.mode === 'percent' ? '%' : null}
            width={W_IN - 12}
            style={{ height: 32 }}
          />
        </View>
        <Text style={{ width: W_OUT, textAlign: 'right', fontSize: 14, fontWeight: '800', color: C.ink }}>{fmt(calc?.amount)}</Text>
      </View>
      {hints ? (
        <View style={[s.between, { marginTop: 3 }]}>
          <Text style={{ fontSize: 11, color: C.sub }}>Plan {rm(hints.estimate, 0)} · Recorded {rm(hints.actual, 0)}</Text>
          <Pressable hitSlop={8} onPress={onUseActual}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.brand }}>Use recorded</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ModeSwitch({ value, onChange }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#ECEAE3', borderRadius: 6, padding: 2 }}>
      {[['amount', 'RM'], ['percent', '%']].map(([v, label]) => (
        <Pressable key={v} onPress={() => onChange(v)} hitSlop={4} style={{ paddingHorizontal: 12, paddingVertical: 2, borderRadius: 4, backgroundColor: value === v ? '#fff' : 'transparent' }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: value === v ? C.brand : C.sub }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const round = (v) => Math.round(v * 100) / 100;
const fmt = (v) => {
  const n = Number(v) || 0;
  return (n < -0.004 ? '−' : '') + Math.abs(n).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const short = (v) => Math.round(Number(v) || 0).toLocaleString('en-MY');

function Mini({ label, onPress, disabled, danger }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={{ width: 30, height: 28, borderRadius: 6, marginLeft: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? '#FBE9E7' : '#ECEAE3', opacity: disabled ? 0.35 : 1 }}>
      <Text style={{ color: danger ? C.bad : C.ink, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}
