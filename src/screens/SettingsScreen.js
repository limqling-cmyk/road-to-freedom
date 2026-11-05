import React from 'react';
import { Alert, Animated, Modal, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { GrabBar, useSwipeDown } from '../gestures';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { Button, C, Card, s } from '../ui';
import { exportBackup, pickBackup } from '../backup';
import IncomeSources from '../IncomeSources';

const tell = (t, m) => (Platform.OS === 'web' ? window.alert(`${t}\n\n${m}`) : Alert.alert(t, m));
const ask = (title, msg, onYes, yesLabel) => {
  if (Platform.OS === 'web') return window.confirm(`${title}\n\n${msg}`) && onYes();
  Alert.alert(title, msg, [{ text: 'Cancel', style: 'cancel' }, { text: yesLabel, style: 'destructive', onPress: onYes }]);
};

export default function SettingsModal({ visible, onClose }) {
  const { state, setSetting, replaceAll, resetToExcel } = useStore();
  const insets = useSafeAreaInsets();
  const sheet = useSwipeDown(onClose, visible);
  if (!visible) return null;
  const editAll = !!state.settings?.editAllAtClose;

  const restore = async () => {
    try {
      const data = await pickBackup();
      if (!data) return;
      ask('Restore backup?', 'This replaces everything currently in the app with the backup file.', () => { replaceAll(data); sheet.dismiss(); }, 'Restore');
    } catch (e) {
      tell('Could not restore', String(e?.message ?? e));
    }
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => sheet.dismiss()}>
      <Animated.View style={[{ flex: 1, backgroundColor: C.bg }, sheet.style]}>
        <View {...sheet.handlers} style={{ backgroundColor: C.brand, paddingTop: insets.top + 2, paddingHorizontal: 20, paddingBottom: 14 }}>
          <GrabBar light />
          <View style={s.between}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>Settings</Text>
            <Pressable onPress={() => sheet.dismiss()} hitSlop={10}><Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Done</Text></Pressable>
          </View>
        </View>
        <View {...sheet.bodyHandlers} style={{ flex: 1 }}>
        <ScrollView onScroll={sheet.onScroll} scrollEventThrottle={16} scrollEnabled={sheet.scrollEnabled} bounces={false} overScrollMode="never" contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
          <Text style={[s.label, { marginHorizontal: 20, marginTop: 18 }]}>Month end</Text>
          <Card style={{ marginTop: 6 }}>
            <View style={s.between}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>Allow editing everything at month end</Text>
                <Text style={[s.muted, { marginTop: 4 }]}>
                  Off (normal): when you close a month, income, fixed and variable always equal your Records, and only free allocation can be adjusted.
                  {'\n'}On: you can also change income, fixed and variable figures in the final allocation, as an ending adjustment.
                </Text>
              </View>
              <Switch value={editAll} onValueChange={(v) => setSetting('editAllAtClose', v)} trackColor={{ true: C.brand }} />
            </View>
          </Card>

          <Text style={[s.label, { marginHorizontal: 20, marginTop: 18 }]}>Income sources</Text>
          <Card style={{ marginTop: 6 }}>
            <Text style={[s.muted, { marginBottom: 8 }]}>Tap a source to remove it. Past records keep their source name.</Text>
            <IncomeSources alwaysEdit />
          </Card>

          <Text style={[s.label, { marginHorizontal: 20, marginTop: 18 }]}>Your data</Text>
          <Card style={{ marginTop: 6 }}>
            <Text style={[s.muted, { marginBottom: 10 }]}>Everything is saved only on this phone. Make a backup now and then and keep it in Google Drive, iCloud or email.</Text>
            <Button kind="ghost" title="Backup data" onPress={() => exportBackup(state).catch((e) => tell('Backup failed', String(e?.message ?? e)))} />
            <Button kind="ghost" title="Restore from backup" onPress={restore} style={{ marginTop: 8 }} />
            <Button
              kind="danger"
              title="Reset to empty template"
              style={{ marginTop: 8 }}
              onPress={() => ask('Reset everything?', 'All records, plans, finals and assets will be cleared and the app goes back to the empty starting template. Make a backup first if unsure.', () => { resetToExcel(); sheet.dismiss(); }, 'Reset')}
            />
          </Card>
        </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
}
