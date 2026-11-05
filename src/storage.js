// On-device storage: a SQLite database file inside the app's private storage on the phone.
// Nothing leaves the phone unless you export a PDF or a backup yourself.
import Storage from 'expo-sqlite/kv-store';

const KEY = 'road-to-free-state';

export async function loadState() {
  const raw = await Storage.getItemAsync(KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveState(state) {
  await Storage.setItemAsync(KEY, JSON.stringify(state));
}
