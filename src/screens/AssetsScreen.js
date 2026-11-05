import React, { useState } from 'react';
import { Alert, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { GrabBar, justSwiped, SheetBackdrop, TabSwipe, useSwipeDown } from '../gestures';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { assetSummary, cumulative, GROUPS, monthKey, monthLabel, num } from '../budget';
import { Button, C, Card, groupColor, rm, s, SectionHeader, Segmented } from '../ui';

export const ASSET_GROUPS = [
  { key: 'cash', label: 'Cash & bank', color: '#3D5A80', hint: 'Money you can use' },
  { key: 'reserve', label: 'Set aside', color: '#B7791F', hint: 'Emergency fund etc. Taken out of cash, not spent' },
  { key: 'invest', label: 'Investments', color: '#2E7D4F', hint: 'Unit trusts, shares, EPF…' },
];

export default function AssetsScreen() {
  const { state } = useStore();
  const [editing, setEditing] = useState(null);
  const insets = useSafeAreaInsets();
  const sum = assetSummary(state.assets);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ backgroundColor: C.brand, paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 18 }}>
        <Text style={{ color: '#CFE3DA', fontSize: 13, fontWeight: '600', letterSpacing: 1 }}>ASSETS · NET WORTH</Text>
        <Text style={{ color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 4 }}>{rm(sum.netWorth)}</Text>
        <Text style={{ color: '#CFE3DA', fontSize: 13, marginTop: 2 }}>Cash & bank + investments</Text>
      </View>
      <TabSwipe>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Card>
          <Row label="Cash & bank" value={sum.cash} />
          <Row label="Less: set aside" value={-sum.reserve} muted />
          <View style={s.divider} />
          <Row label="Available to use" value={sum.available} bold />
          <Row label="Investments" value={sum.invest} />
        </Card>

        {ASSET_GROUPS.map((g) => {
          const items = state.assets.filter((a) => a.group === g.key);
          const total = items.reduce((t, a) => t + num(a.balance), 0);
          return (
            <Card key={g.key}>
              <SectionHeader title={g.label} color={g.color} right={<Text style={{ fontWeight: '700' }}>{rm(total)}</Text>} />
              <Text style={[s.muted, { marginTop: -6, marginBottom: 4 }]}>{g.hint}</Text>
              {items.map((a) => (
                <Pressable key={a.id} onPress={() => !justSwiped() && setEditing({ ...a, balance: String(a.balance) })} style={[s.between, { paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink }}>{a.name}</Text>
                    {a.note ? <Text style={s.muted}>{a.note}</Text> : null}
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>{rm(a.balance)}</Text>
                </Pressable>
              ))}
              <Button small kind="ghost" title="+ Add" style={{ alignSelf: 'flex-start', marginTop: 8 }} onPress={() => setEditing({ name: '', group: g.key, balance: '', note: '' })} />
            </Card>
          );
        })}
        <Cumulative />

        <Text style={[s.muted, { textAlign: 'center', marginTop: 14, marginHorizontal: 24 }]}>
          Tap a balance to update it. Each update is kept as that month's snapshot for your statement.
        </Text>
      </ScrollView>
      </TabSwipe>
      <AssetModal asset={editing} onClose={() => setEditing(null)} bottom={insets.bottom} />
    </View>
  );
}

// Running totals: all income by source, and everything that went into each item.
function Cumulative() {
  const { state } = useStore();
  const [period, setPeriod] = useState('year');
  const year = monthKey().slice(0, 4);
  const cu = cumulative(state, period === 'year' ? `${year}-01` : null);
  const share = (v) => (cu.income ? `${((v / cu.income) * 100).toFixed(1)}%` : '–');
  const Line = ({ name, amount, color, bold, indent }) => (
    <View style={[s.row, { paddingVertical: bold ? 4 : 2.5, paddingLeft: indent ? 16 : 0 }]}>
      {color ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 6 }} /> : null}
      <Text style={{ flex: 1, fontSize: bold ? 13.5 : 13, fontWeight: bold ? '800' : '400', color: C.ink }} numberOfLines={1}>{name}</Text>
      <Text style={{ fontSize: 13, fontWeight: bold ? '800' : '600', color: C.ink }}>{rm(amount, 0)}</Text>
      <Text style={{ width: 52, textAlign: 'right', fontSize: 11.5, color: C.sub }}>{share(amount)}</Text>
    </View>
  );
  return (
    <Card>
      <SectionHeader title="Cumulative totals" color={C.brand} right={
        <Segmented small value={period} onChange={setPeriod} options={[{ label: year, value: 'year' }, { label: 'All time', value: 'all' }]} />
      } />
      <Text style={[s.muted, { fontSize: 11, marginTop: -4, marginBottom: 6 }]}>
        {cu.months ? `${cu.months} month${cu.months === 1 ? '' : 's'} from ${monthLabel(cu.first)} · RM · % of total income` : 'Nothing recorded yet'}
      </Text>

      <Line name="Total income" amount={cu.income} color={C.good} bold />
      {cu.bySource.map((x) => <Line key={x.name} name={x.name} amount={x.amount} indent />)}

      {GROUPS.map((g) => {
        const list = cu.items.filter((i) => i.group === g.key).sort((a, b) => b.amount - a.amount);
        if (!list.length) return null;
        return (
          <View key={g.key} style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.line }}>
            <Line name={g.label} amount={cu.totals[g.key]} color={groupColor(g.key)} bold />
            {list.map((i) => <Line key={i.id} name={i.name} amount={i.amount} indent />)}
          </View>
        );
      })}
      {Math.abs(cu.unal) > 0.5 ? (
        <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.line }}>
          <Line name="Not allocated yet" amount={cu.unal} color="#D8D4C8" bold />
        </View>
      ) : null}
    </Card>
  );
}

function Row({ label, value, bold, muted }) {
  return (
    <View style={[s.between, { paddingVertical: 3 }]}>
      <Text style={{ color: muted ? C.sub : C.ink, fontWeight: bold ? '700' : '400', fontSize: 15 }}>{label}</Text>
      <Text style={{ color: muted ? C.sub : C.ink, fontWeight: bold ? '800' : '600', fontSize: 15 }}>{rm(value)}</Text>
    </View>
  );
}

function AssetModal({ asset, onClose, bottom }) {
  const { saveAsset, deleteAsset } = useStore();
  const [form, setForm] = useState(asset);
  const [last, setLast] = useState(asset);
  if (asset !== last) { setLast(asset); setForm(asset); }
  const sheet = useSwipeDown(onClose, !!asset);
  if (!asset || !form) return null;
  const set = (p) => setForm((f) => ({ ...f, ...p }));

  const save = () => {
    if (!form.name.trim()) return Platform.OS === 'web' ? window.alert('Please add a name.') : Alert.alert('Please add a name.');
    saveAsset({ ...form, name: form.name.trim(), balance: num(form.balance) });
    sheet.dismiss();
  };
  const remove = () => {
    const go = () => { deleteAsset(form.id); sheet.dismiss(); };
    if (Platform.OS === 'web') return window.confirm(`Delete ${form.name}?`) && go();
    Alert.alert('Delete', `Delete ${form.name}?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: go }]);
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => sheet.dismiss()}>
      <SheetBackdrop sheet={sheet} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <Animated.View {...sheet.handlers} style={[{ backgroundColor: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingTop: 0, paddingBottom: bottom + 18 }, sheet.style]}>
          <View>
            <GrabBar />
            <View style={s.between}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink }}>{form.id ? 'Update balance' : 'New item'}</Text>
              <Pressable onPress={() => sheet.dismiss()} hitSlop={10}><Text style={{ color: C.sub, fontSize: 15 }}>Cancel</Text></Pressable>
            </View>
          </View>
          <Text style={[s.label, { marginTop: 14 }]}>Name</Text>
          <TextInput value={form.name} onChangeText={(t) => set({ name: t })} style={[s.input, { marginTop: 6 }]} placeholder="e.g. Maybank" />
          <Text style={[s.label, { marginTop: 14 }]}>Type</Text>
          <View style={{ marginTop: 6 }}>
            <Segmented value={form.group} onChange={(group) => set({ group })} options={ASSET_GROUPS.map((g) => ({ label: g.label, value: g.key }))} small />
          </View>
          <Text style={[s.label, { marginTop: 14 }]}>Balance</Text>
          <View style={[s.numWrap, s.editable, { height: 50, marginTop: 6 }]}>
            <Text style={[s.affix, { fontSize: 16 }]}>RM</Text>
            <TextInput value={form.balance} onChangeText={(t) => set({ balance: t })} keyboardType="decimal-pad" placeholder="0.00" style={[s.numInput, { fontSize: 20, textAlign: 'left' }]} />
          </View>
          <Text style={[s.label, { marginTop: 14 }]}>Note</Text>
          <TextInput value={form.note} onChangeText={(t) => set({ note: t })} style={[s.input, { marginTop: 6 }]} placeholder="optional, e.g. what this account is for" />
          <Button title="Save" onPress={save} style={{ marginTop: 18 }} />
          {form.id ? <Button title="Delete" kind="danger" onPress={remove} style={{ marginTop: 10 }} /> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
