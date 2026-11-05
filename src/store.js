import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadState, saveState } from './storage';
import { seedState } from './seed';
import { budgetFor, monthKey, uid } from './budget';

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [state, setState] = useState(null);
  const [month, setMonth] = useState(monthKey());
  const ready = useRef(false);

  useEffect(() => {
    loadState()
      .then((s) => setState(s ? { finals: {}, assetSnapshots: {}, settings: {}, ...s } : seedState()))
      .catch(() => setState(seedState()));
  }, []);

  useEffect(() => {
    if (!state) return;
    if (!ready.current) {
      ready.current = true;
      saveState(state); // persist seed on first run
      return;
    }
    saveState(state);
  }, [state]);

  const actions = useMemo(() => {
    const update = (fn) => setState((s) => fn(structuredCloneSafe(s)));

    // Editing a month that has no plan yet first copies the plan it was inheriting.
    const ensureBudget = (s, key) => {
      if (!s.budgets[key]) s.budgets[key] = structuredCloneSafe(budgetFor(s.budgets, key).budget);
      return s.budgets[key];
    };

    const snapshotAssets = (s) => {
      s.assetSnapshots[monthKey()] = {
        date: new Date().toISOString(),
        items: s.assets.map(({ name, group, balance, note }) => ({ name, group, balance, note })),
      };
    };

    return {
      setIncome: (key, income) => update((s) => { ensureBudget(s, key).income = income; return s; }),
      updateLine: (key, id, patch) =>
        update((s) => {
          const b = ensureBudget(s, key);
          b.lines = b.lines.map((l) => (l.id === id ? { ...l, ...patch } : l));
          return s;
        }),
      addLine: (key, group) =>
        update((s) => {
          ensureBudget(s, key).lines.push({ id: uid(), group, name: 'New item', mode: 'amount', value: 0, kind: group === 'free' ? 'target' : 'cap' });
          return s;
        }),
      removeLine: (key, id) =>
        update((s) => { const b = ensureBudget(s, key); b.lines = b.lines.filter((l) => l.id !== id); return s; }),
      moveLine: (key, id, dir) =>
        update((s) => {
          const b = ensureBudget(s, key);
          const line = b.lines.find((l) => l.id === id);
          const same = b.lines.filter((l) => l.group === line.group);
          const i = same.indexOf(line);
          const j = i + dir;
          if (j < 0 || j >= same.length) return s;
          const a = b.lines.indexOf(same[i]);
          const c = b.lines.indexOf(same[j]);
          [b.lines[a], b.lines[c]] = [b.lines[c], b.lines[a]];
          return s;
        }),
      copyPlanFromPrevious: (key) =>
        update((s) => {
          delete s.budgets[key];
          s.budgets[key] = structuredCloneSafe(budgetFor(s.budgets, key).budget);
          return s;
        }),

      saveTransaction: (tx) =>
        update((s) => {
          if (tx.id) s.transactions = s.transactions.map((t) => (t.id === tx.id ? tx : t));
          else s.transactions.push({ ...tx, id: uid() });
          if (tx.type === 'income' && tx.source && !s.incomeSources.includes(tx.source)) s.incomeSources.push(tx.source);
          return s;
        }),
      deleteTransaction: (id) => update((s) => { s.transactions = s.transactions.filter((t) => t.id !== id); return s; }),

      saveAsset: (asset) =>
        update((s) => {
          if (asset.id) s.assets = s.assets.map((a) => (a.id === asset.id ? asset : a));
          else s.assets.push({ ...asset, id: uid() });
          snapshotAssets(s);
          return s;
        }),
      deleteAsset: (id) => update((s) => { s.assets = s.assets.filter((a) => a.id !== id); snapshotAssets(s); return s; }),

      saveFinal: (key, final) =>
        update((s) => {
          s.finals = s.finals ?? {};
          s.finals[key] = { income: final.income, lines: final.lines, closedAt: new Date().toISOString() };
          return s;
        }),
      reopenMonth: (key) => update((s) => { if (s.finals) delete s.finals[key]; return s; }),

      addIncomeSource: (name) => update((s) => { if (!s.incomeSources.includes(name)) s.incomeSources.push(name); return s; }),
      removeIncomeSource: (name) => update((s) => { s.incomeSources = s.incomeSources.filter((x) => x !== name); return s; }),
      setSetting: (name, value) => update((s) => { s.settings = { ...(s.settings ?? {}), [name]: value }; return s; }),

      replaceAll: (newState) => setState({ finals: {}, assetSnapshots: {}, settings: {}, ...newState }),
      resetToExcel: () => setState(seedState()),
    };
  }, []);

  const value = useMemo(() => ({ state, month, setMonth, ...actions }), [state, month, actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

function structuredCloneSafe(o) {
  return JSON.parse(JSON.stringify(o));
}
