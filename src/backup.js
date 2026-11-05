// Backup / restore: your data only lives on this phone, so keep a copy somewhere safe
// (Google Drive, iCloud Drive, email to yourself) every so often.
import { Platform } from 'react-native';
import { monthKey } from './budget';

const fileName = () => `Road-to-freedom-backup-${monthKey()}-${new Date().getDate()}.json`;

export async function exportBackup(state) {
  const json = JSON.stringify(state, null, 1);
  if (Platform.OS === 'web') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = fileName();
    a.click();
    return;
  }
  const { File, Paths } = require('expo-file-system');
  const Sharing = require('expo-sharing');
  const f = new File(Paths.cache, fileName());
  if (f.exists) f.delete();
  f.create();
  await f.write(json);
  await Sharing.shareAsync(f.uri, { mimeType: 'application/json', dialogTitle: 'Save your Road to freedom backup' });
}

// Returns the parsed state, or null if cancelled. Throws if the file is not a backup.
export async function pickBackup() {
  const DocumentPicker = require('expo-document-picker');
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', '*/*'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  let text;
  if (Platform.OS === 'web') text = await (asset.file ? asset.file.text() : fetch(asset.uri).then((r) => r.text()));
  else {
    const { File } = require('expo-file-system');
    text = await new File(asset.uri).text();
  }
  return parseBackup(text);
}

// Turns backup text (from a file, or pasted) into app data. Throws if it is not a backup.
export function parseBackup(text) {
  let data;
  try {
    // tolerate stray spaces or chat formatting around the pasted text
    const raw = String(text || '').trim();
    data = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  } catch {
    throw new Error('This is not a Road to freedom backup. Make sure you copied all of the text, from the first { to the last }.');
  }
  if (!data || !data.budgets || !Array.isArray(data.transactions) || !Array.isArray(data.assets)) {
    throw new Error('This is not a Road to freedom backup.');
  }
  data.assetSnapshots = data.assetSnapshots ?? {};
  data.incomeSources = data.incomeSources ?? [];
  data.finals = data.finals ?? {};
  return data;
}
