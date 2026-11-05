// Calendar date picker (pure JS, works in Expo Go). Value is 'YYYY-MM-DD'.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { C, s } from './ui';
import { useHorizontalSwipe } from './gestures';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayISO = () => isoOf(new Date());
const parse = (iso) => {
  const [y, m, d] = (iso || '').split('-').map(Number);
  return y ? new Date(y, m - 1, d) : new Date();
};
export const prettyISO = (iso) => {
  const d = parse(iso);
  return `${DOW[d.getDay()]}, ${d.getDate()} ${SHORT[d.getMonth()]} ${d.getFullYear()}`;
};

export default function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const sel = parse(value);
  const [view, setView] = useState({ y: sel.getFullYear(), m: sel.getMonth() });
  const today = todayISO();
  const yesterday = isoOf(new Date(Date.now() - 864e5));

  const pick = (iso) => { onChange(iso); setOpen(false); };
  const shift = (delta) => {
    lastDir.current = delta;
    setView(({ y, m }) => { const d = new Date(y, m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  };

  // swipe the calendar: left = next month, right = previous month (it slides in from that side)
  const lastDir = useRef(0);
  const slide = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!lastDir.current) return;
    slide.setValue(lastDir.current * 80);
    fade.setValue(0.2);
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    lastDir.current = 0;
  }, [view.y, view.m]);
  const swipe = useHorizontalSwipe({ capture: true, threshold: 40, onLeft: () => shift(1), onRight: () => shift(-1) });

  const first = new Date(view.y, view.m, 1).getDay();
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const Quick = ({ label, iso }) => (
    <Pressable onPress={() => { pick(iso); const d = parse(iso); setView({ y: d.getFullYear(), m: d.getMonth() }); }} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, marginLeft: 6, backgroundColor: value === iso ? C.brand : C.brandSoft }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: value === iso ? '#fff' : C.brand }}>{label}</Text>
    </Pressable>
  );

  return (
    <View>
      <View style={s.row}>
        <Pressable
          onPress={() => { setView({ y: sel.getFullYear(), m: sel.getMonth() }); setOpen(!open); }}
          style={[s.input, s.row, { flex: 1, justifyContent: 'space-between' }]}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink }}>📅  {prettyISO(value)}</Text>
          <Text style={{ color: C.sub }}>{open ? '▲' : '▼'}</Text>
        </Pressable>
        <Quick label="Today" iso={today} />
        <Quick label="Yesterday" iso={yesterday} />
      </View>

      {open ? (
        <View {...swipe} style={{ marginTop: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 10, overflow: 'hidden' }}>
          <View style={s.between}>
            <Pressable onPress={() => shift(-1)} hitSlop={10} style={nav}><Text style={navText}>‹</Text></Pressable>
            <Animated.Text style={{ fontSize: 15, fontWeight: '800', color: C.ink, opacity: fade, transform: [{ translateX: slide }] }}>{MONTHS[view.m]} {view.y}</Animated.Text>
            <Pressable onPress={() => shift(1)} hitSlop={10} style={nav}><Text style={navText}>›</Text></Pressable>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: C.sub }}>{d}</Text>
            ))}
          </View>
          <Animated.View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, opacity: fade, transform: [{ translateX: slide }] }}>
            {cells.map((d, i) => {
              if (!d) return <View key={i} style={{ width: `${100 / 7}%`, height: 38 }} />;
              const iso = `${view.y}-${String(view.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const isSel = iso === value;
              const isToday = iso === today;
              return (
                <Pressable key={i} onPress={() => pick(iso)} style={{ width: `${100 / 7}%`, height: 38, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: isSel ? C.brand : 'transparent', borderWidth: isToday && !isSel ? 1.5 : 0, borderColor: C.brand }}>
                    <Text style={{ fontSize: 14, fontWeight: isSel || isToday ? '800' : '500', color: isSel ? '#fff' : C.ink }}>{d}</Text>
                  </View>
                </Pressable>
              );
            })}
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

const nav = { width: 32, height: 32, borderRadius: 16, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' };
const navText = { color: C.brand, fontSize: 20, fontWeight: '700', lineHeight: 22 };
