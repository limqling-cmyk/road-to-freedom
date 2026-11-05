// Income source list (Salary, Bonus…): pick one, and add or delete sources.
// Deleting a source only removes it from this list; past records keep their source name.
import React, { useState } from 'react';
import { Alert, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useStore } from './store';
import { C, s } from './ui';

export default function IncomeSources({ selected, onSelect, alwaysEdit = false }) {
  const { state, addIncomeSource, removeIncomeSource } = useStore();
  const [editing, setEditing] = useState(alwaysEdit);
  const [text, setText] = useState('');
  const list = state.incomeSources ?? [];

  const add = () => {
    const name = text.trim();
    if (!name) return;
    if (list.some((x) => x.toLowerCase() === name.toLowerCase())) { setText(''); onSelect?.(list.find((x) => x.toLowerCase() === name.toLowerCase())); return; }
    addIncomeSource(name);
    onSelect?.(name);
    setText('');
  };

  const remove = (name) => {
    const go = () => { removeIncomeSource(name); if (selected === name) onSelect?.(''); };
    const msg = `Remove "${name}" from your income list? Past records keep it.`;
    if (Platform.OS === 'web') return window.confirm(msg) && go();
    Alert.alert('Remove source', msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: go }]);
  };

  return (
    <View>
      {!alwaysEdit ? (
        <View style={[s.between, { marginBottom: 6 }]}>
          <Text style={s.label}>From</Text>
          <Pressable onPress={() => setEditing(!editing)} hitSlop={8}>
            <Text style={{ color: C.brand, fontWeight: '700', fontSize: 13 }}>{editing ? 'Done' : 'Edit list'}</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {list.map((src) => {
          const active = selected === src;
          return (
            <Pressable
              key={src}
              onPress={() => (editing ? remove(src) : onSelect?.(src))}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginRight: 6, marginBottom: 6, borderWidth: 1, borderColor: editing ? '#F2C4BD' : active ? C.good : C.line, backgroundColor: editing ? '#FDF1EF' : active ? C.good : '#fff' }}
            >
              <Text style={{ color: editing ? C.bad : active ? '#fff' : C.ink, fontWeight: '600', fontSize: 13 }}>{src}</Text>
              {editing ? <Text style={{ color: C.bad, fontWeight: '800', marginLeft: 6 }}>✕</Text> : null}
            </Pressable>
          );
        })}
        {!list.length ? <Text style={s.muted}>No sources yet. Add one below.</Text> : null}
      </View>
      <View style={[s.row, { marginTop: 4 }]}>
        <TextInput value={text} onChangeText={setText} onSubmitEditing={add} placeholder="Add a new source, e.g. Rental" style={[s.input, { flex: 1 }]} />
        <Pressable onPress={add} style={{ marginLeft: 8, height: 42, paddingHorizontal: 16, borderRadius: 8, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>Add</Text>
        </Pressable>
      </View>
      {editing && !alwaysEdit ? <Text style={[s.muted, { fontSize: 11, marginTop: 4 }]}>Tap a source to remove it. Past records keep their source name.</Text> : null}
    </View>
  );
}
