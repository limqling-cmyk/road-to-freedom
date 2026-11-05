import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { monthLabel, num, shiftMonth } from './budget';
import { useStore } from './store';
import { SlideText, useHorizontalSwipe } from './gestures';

export const C = {
  bg: '#F4F2EC',
  card: '#FFFFFF',
  ink: '#1C2321',
  sub: '#6B716E',
  line: '#E4E1D8',
  brand: '#1F5F4A',
  brandSoft: '#E3EFE9',
  editable: '#FFF4C2', // the yellow cells from your Excel
  editableBorder: '#E9D77A',
  good: '#2E7D4F',
  warn: '#B7791F',
  bad: '#C0392B',
  fixed: '#3D5A80',
  variable: '#C77D1A',
  free: '#2E7D4F',
};

export const groupColor = (g) => C[g] ?? C.sub;

export const rm = (v, dp = 2) => {
  const n = num(v);
  const body = Math.abs(n).toLocaleString('en-MY', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return (n < -0.004 ? '− ' : '') + 'RM ' + body;
};
export const pct = (v, dp = 1) => `${num(v).toFixed(dp)}%`;

export function MonthBar({ title }) {
  const { month, setMonth } = useStore();
  const insets = useSafeAreaInsets();
  // swipe on the top bar: left = next month, right = previous month
  const swipe = useHorizontalSwipe({ capture: true, onLeft: () => setMonth(shiftMonth(month, 1)), onRight: () => setMonth(shiftMonth(month, -1)) });
  return (
    <View {...swipe} style={[s.monthBar, { paddingTop: insets.top + 8 }]}>
      <Text style={s.screenTitle}>{title}</Text>
      <View style={s.monthRow}>
        <Pressable hitSlop={10} onPress={() => setMonth(shiftMonth(month, -1))} style={s.arrow}>
          <Text style={s.arrowText}>‹</Text>
        </Pressable>
        <SlideText style={s.monthText} text={monthLabel(month, true)} order={month} />
        <Pressable hitSlop={10} onPress={() => setMonth(shiftMonth(month, 1))} style={s.arrow}>
          <Text style={s.arrowText}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const Card = ({ children, style }) => <View style={[s.card, style]}>{children}</View>;

export function SectionHeader({ title, color, right }) {
  return (
    <View style={s.sectionHeader}>
      <View style={[s.dot, { backgroundColor: color ?? C.brand }]} />
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}

// Number box that keeps what you're typing, and commits on blur.
export function NumberField({ value, onChange, suffix, prefix, style, width = 96, highlight = true }) {
  const [text, setText] = useState(fmtInput(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(fmtInput(value)); }, [value, focused]);
  return (
    <View style={[s.numWrap, highlight && s.editable, { width }, style]}>
      {prefix ? <Text style={s.affix}>{prefix}</Text> : null}
      <TextInput
        value={text}
        onChangeText={setText}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onChange(num(text)); }}
        onSubmitEditing={() => onChange(num(text))}
        keyboardType="decimal-pad"
        selectTextOnFocus
        style={s.numInput}
      />
      {suffix ? <Text style={s.affix}>{suffix}</Text> : null}
    </View>
  );
}
const fmtInput = (v) => {
  const n = num(v);
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
};

export function Segmented({ options, value, onChange, small }) {
  return (
    <View style={s.seg}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.segItem, small && s.segSmall, active && s.segActive]}>
            <Text style={[s.segText, small && { fontSize: 12 }, active && s.segTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Bar({ value, max, color, over }) {
  const ratio = max > 0 ? Math.min(value / max, 1) : value > 0 ? 1 : 0;
  return (
    <View style={s.barTrack}>
      <View style={[s.barFill, { width: `${ratio * 100}%`, backgroundColor: over ? C.bad : color }]} />
    </View>
  );
}

export function Button({ title, onPress, kind = 'primary', style, small }) {
  const k = kind === 'primary' ? s.btnPrimary : kind === 'danger' ? s.btnDanger : s.btnGhost;
  const t = kind === 'primary' ? { color: '#fff' } : kind === 'danger' ? { color: C.bad } : { color: C.brand };
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.btn, small && s.btnSmall, k, pressed && { opacity: 0.7 }, style]}>
      <Text style={[s.btnText, small && { fontSize: 13 }, t]}>{title}</Text>
    </Pressable>
  );
}

export const s = StyleSheet.create({
  monthBar: { backgroundColor: C.brand, paddingHorizontal: 20, paddingBottom: 14 },
  screenTitle: { color: '#CFE3DA', fontSize: 13, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  monthText: { color: '#fff', fontSize: 22, fontWeight: '700', flex: 1, textAlign: 'center' },
  arrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: '#fff', fontSize: 24, lineHeight: 26, fontWeight: '600' },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 16, marginHorizontal: 16, marginTop: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  numWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, height: 38, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff' },
  editable: { backgroundColor: C.editable, borderColor: C.editableBorder },
  numInput: { flex: 1, fontSize: 15, fontWeight: '600', color: C.ink, textAlign: 'right', paddingVertical: 0, minWidth: 0 },
  affix: { color: C.sub, fontSize: 13, marginHorizontal: 2 },
  seg: { flexDirection: 'row', backgroundColor: '#ECEAE3', borderRadius: 8, padding: 2 },
  segItem: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6 },
  segSmall: { paddingHorizontal: 9, paddingVertical: 5 },
  segActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { fontSize: 14, color: C.sub, fontWeight: '600' },
  segTextActive: { color: C.brand },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: '#EEECE6', overflow: 'hidden', marginTop: 6 },
  barFill: { height: 6, borderRadius: 3 },
  btn: { borderRadius: 10, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center' },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12 },
  btnPrimary: { backgroundColor: C.brand },
  btnGhost: { backgroundColor: C.brandSoft },
  btnDanger: { backgroundColor: '#FBE9E7' },
  btnText: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 12, color: C.sub, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  muted: { color: C.sub, fontSize: 13 },
  big: { fontSize: 26, fontWeight: '800', color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginVertical: 10 },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 8, paddingHorizontal: 10, height: 42, fontSize: 15, color: C.ink, backgroundColor: '#fff' },
});

// One bar split into fixed / variable / free / unallocated, sized against income.
export function AllocationBar({ calc, height = 10 }) {
  const parts = [
    { v: calc.totals.fixed, c: C.fixed },
    { v: calc.totals.variable, c: C.variable },
    { v: calc.totals.free, c: C.free },
    { v: Math.max(calc.unallocated, 0), c: '#D8D4C8' },
  ];
  const total = parts.reduce((t, p) => t + Math.max(p.v, 0), 0);
  return (
    <View style={{ flexDirection: 'row', height, borderRadius: height / 2, overflow: 'hidden', backgroundColor: '#EEECE6' }}>
      {total > 0 ? parts.map((p, i) => (p.v > 0 ? <View key={i} style={{ flex: p.v, backgroundColor: p.c }} /> : null)) : null}
    </View>
  );
}
