// Browser preview only (npm run web). The phone app uses storage.js (SQLite).
const KEY = 'road-to-free-state';

export async function loadState() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveState(state) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}
