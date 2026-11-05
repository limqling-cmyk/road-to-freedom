// Yearly overview on one page: totals, a month-by-month chart and where the year's money went.
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { assetSummary, GROUPS, monthAllocation, monthKey, monthLabel, monthsWithData } from '../budget';
import { C, groupColor, rm, s } from '../ui';
import CloseMonth from './CloseMonth';
import { SlideText, TabSwipe, useHorizontalSwipe } from '../gestures';
import SettingsModal from './SettingsScreen';

const LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const pctOf = (v, base) => (base ? `${((v / base) * 100).toFixed(1)}%` : '–');
const k0 = (v) => Math.round(v || 0).toLocaleString('en-MY');

export default function OverviewScreen() {
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  const now = monthKey();
  const [year, setYear] = useState(Number(now.slice(0, 4)));
  const [picked, setPicked] = useState(null); // month key tapped on the chart
  const [closing, setClosing] = useState(null);
  const [settings, setSettings] = useState(false);

  // swipe on the top bar: left = next year, right = previous year
  const yearSwipe = useHorizontalSwipe({ capture: true, onLeft: () => { setYear((y) => y + 1); setPicked(null); }, onRight: () => { setYear((y) => y - 1); setPicked(null); } });

  const withData = new Set(monthsWithData(state));
  const months = LETTERS.map((_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`;
    if (!withData.has(key) || key > now) return { key, empty: true };
    const ma = monthAllocation(state, key);
    const c = ma.calc;
    const any = c.income || c.totals.fixed || c.totals.variable || c.totals.free;
    return any ? { key, ma, c } : { key, empty: true };
  });
  const filled = months.filter((m) => !m.empty);

  const T = filled.reduce(
    (t, m) => ({
      income: t.income + m.c.income,
      fixed: t.fixed + m.c.totals.fixed,
      variable: t.variable + m.c.totals.variable,
      free: t.free + m.c.totals.free,
      unal: t.unal + m.c.unallocated,
    }),
    { income: 0, fixed: 0, variable: 0, free: 0, unal: 0 },
  );

  // year total per item (named by its latest month)
  const items = {};
  for (const m of filled) {
    for (const l of m.ma.alloc.lines) {
      const a = m.c.byId[l.id]?.amount ?? 0;
      items[l.id] = { name: l.name, group: l.group, amount: (items[l.id]?.amount ?? 0) + a };
    }
  }
  const itemList = Object.entries(items).map(([id, v]) => ({ id, ...v })).filter((i) => i.amount > 0);
  const maxItem = Math.max(1, ...itemList.map((i) => i.amount));

  const maxBar = Math.max(1, ...filled.map((m) => Math.max(m.c.income, m.c.totals.fixed + m.c.totals.variable + m.c.totals.free)));
  const sel = picked ? months.find((m) => m.key === picked && !m.empty) : null;

  // month-end reminder: the earliest past month this year that is not closed, else the current month
  const unclosed = filled.find((m) => m.key < now && !m.ma.closed);
  const closeTarget = unclosed ? unclosed.key : year === Number(now.slice(0, 4)) ? now : null;
  const assets = assetSummary(state.assets);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View {...yearSwipe} style={{ backgroundColor: C.brand, paddingTop: insets.top + 6, paddingHorizontal: 16, paddingBottom: 10 }}>
        <View style={s.between}>
          <Text style={{ color: '#CFE3DA', fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>ROAD TO FREEDOM · YEAR</Text>
          <Pressable onPress={() => setSettings(true)} hitSlop={10}><Text style={{ color: '#fff', fontSize: 20 }}>⚙</Text></Pressable>
        </View>
        <View style={[s.row, { marginTop: 2 }]}>
          <Arrow label="‹" onPress={() => { setYear(year - 1); setPicked(null); }} />
          <SlideText style={{ color: '#fff', fontSize: 22, fontWeight: '800', flex: 1, textAlign: 'center' }} text={String(year)} order={year} />
          <Arrow label="›" onPress={() => { setYear(year + 1); setPicked(null); }} />
        </View>
      </View>

      <TabSwipe slideKey={year}>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
        {/* totals */}
        <View style={[s.row, { gap: 8 }]}>
          <Tile label="Income" value={T.income} sub={`${filled.length} month${filled.length === 1 ? '' : 's'}`} />
          <Tile label="Spent" value={T.fixed + T.variable} sub={`${pctOf(T.fixed + T.variable, T.income)} of income`} />
        </View>
        <View style={[s.row, { gap: 8, marginTop: 8 }]}>
          <Tile label="Free allocation" value={T.free} sub={`${pctOf(T.free, T.income)} of income`} color={C.free} />
          <Tile label="Net worth now" value={assets.netWorth} sub={`available ${rm(assets.available, 0)}`} />
        </View>

        {/* month by month */}
        <View style={box}>
          <View style={s.between}>
            <Text style={title}>Month by month</Text>
            <View style={s.row}>
              {[['Fixed', C.fixed], ['Var.', C.variable], ['Free', C.free], ['Left', '#D8D4C8']].map(([l, c]) => (
                <View key={l} style={[s.row, { marginLeft: 8 }]}>
                  <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: c, marginRight: 3 }} />
                  <Text style={{ fontSize: 10, color: C.sub }}>{l}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 92, marginTop: 8 }}>
            {months.map((m, i) => {
              const parts = m.empty ? [] : [
                [m.c.totals.fixed, C.fixed], [m.c.totals.variable, C.variable], [m.c.totals.free, C.free], [Math.max(m.c.unallocated, 0), '#D8D4C8'],
              ];
              const active = picked === m.key;
              return (
                <Pressable key={m.key} onPress={() => setPicked(active ? null : m.key)} style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <View style={{ width: '62%', opacity: m.empty ? 1 : m.ma.closed ? 1 : 0.55, borderRadius: 3, overflow: 'hidden', borderWidth: active ? 1.5 : 0, borderColor: C.ink }}>
                    {m.empty ? <View style={{ height: 2, backgroundColor: C.line }} /> : parts.slice().reverse().map(([v, c], j) =>
                      v > 0 ? <View key={j} style={{ height: (v / maxBar) * 86, backgroundColor: c }} /> : null)}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            {months.map((m, i) => (
              <Text key={m.key} style={{ flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: m.key === now ? '800' : '500', color: m.key === now ? C.brand : C.sub }}>{LETTERS[i]}</Text>
            ))}
          </View>
          <Text style={{ fontSize: 11, color: C.sub, marginTop: 6 }}>
            {sel
              ? `${monthLabel(sel.key)}${sel.ma.closed ? '' : ' (not closed)'} · income ${k0(sel.c.income)} · fixed ${k0(sel.c.totals.fixed)} · var ${k0(sel.c.totals.variable)} · free ${k0(sel.c.totals.free)}`
              : 'Tap a month to see its figures. Faded = not closed yet.'}
          </Text>
        </View>

        {/* where the year's money went */}
        <View style={box}>
          <View style={s.between}>
            <Text style={title}>Where {year}'s money went</Text>
            <Text style={{ fontSize: 10.5, color: C.sub }}>RM · % of income</Text>
          </View>
          {GROUPS.map((g) => {
            const list = itemList.filter((i) => i.group === g.key).sort((a, b) => b.amount - a.amount);
            const total = { fixed: T.fixed, variable: T.variable, free: T.free }[g.key];
            if (!list.length) return null;
            return (
              <View key={g.key} style={{ marginTop: 6 }}>
                <View style={[s.row, { paddingVertical: 2 }]}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: groupColor(g.key), marginRight: 6 }} />
                  <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '800', color: C.ink }}>{g.label}</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: C.ink }}>{k0(total)}</Text>
                  <Text style={pctCol}>{pctOf(total, T.income)}</Text>
                </View>
                {list.map((it) => (
                  <View key={it.id} style={[s.row, { paddingVertical: 1.5, paddingLeft: 14 }]}>
                    <Text style={{ width: 118, fontSize: 12, color: C.ink }} numberOfLines={1}>{it.name}</Text>
                    <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: '#F1EFE9', marginHorizontal: 6 }}>
                      <View style={{ width: `${(it.amount / maxItem) * 100}%`, height: 6, borderRadius: 3, backgroundColor: groupColor(g.key) }} />
                    </View>
                    <Text style={{ width: 54, textAlign: 'right', fontSize: 12, fontWeight: '600', color: C.ink }}>{k0(it.amount)}</Text>
                    <Text style={pctCol}>{pctOf(it.amount, T.income)}</Text>
                  </View>
                ))}
              </View>
            );
          })}
          {T.unal > 0.5 ? (
            <View style={[s.row, { marginTop: 6 }]}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#D8D4C8', marginRight: 6 }} />
              <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: C.sub }}>Not allocated yet</Text>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: C.sub }}>{k0(T.unal)}</Text>
              <Text style={pctCol}>{pctOf(T.unal, T.income)}</Text>
            </View>
          ) : null}
          {!filled.length ? <Text style={[s.muted, { marginTop: 8 }]}>Nothing recorded in {year}.</Text> : null}
        </View>

        {/* month-end shortcut */}
        {closeTarget ? (
          <Pressable onPress={() => setClosing(closeTarget)} style={[box, s.between, { borderColor: unclosed ? C.warn : C.line, paddingVertical: 10 }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: C.ink }}>
                {unclosed ? `${monthLabel(closeTarget)} is not closed yet` : state.finals?.[closeTarget] ? `${monthLabel(closeTarget)} closed ✓` : `${monthLabel(closeTarget)} in progress`}
              </Text>
              <Text style={{ fontSize: 11.5, color: C.sub }}>Month end: split what is left into free allocation</Text>
            </View>
            <Text style={{ color: C.brand, fontWeight: '800', fontSize: 13.5 }}>{state.finals?.[closeTarget] ? 'Adjust ›' : 'Close ›'}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      </TabSwipe>

      <CloseMonth monthKey={closing ?? now} visible={!!closing} onClose={() => setClosing(null)} />
      <SettingsModal visible={settings} onClose={() => setSettings(false)} />
    </View>
  );
}

const box = { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 8, borderWidth: 1, borderColor: C.line };
const title = { fontSize: 14, fontWeight: '800', color: C.ink };
const pctCol = { width: 48, textAlign: 'right', fontSize: 11, color: C.sub };

function Tile({ label, value, sub, color }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 11, borderWidth: 1, borderColor: C.line }}>
      <Text style={{ fontSize: 10.5, color: C.sub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: '800', color: color ?? C.ink, marginTop: 2 }}>{rm(value, 0)}</Text>
      <Text style={{ fontSize: 11, color: C.sub }}>{sub}</Text>
    </View>
  );
}

function Arrow({ label, onPress }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 22, lineHeight: 24, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}
