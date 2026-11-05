// First-run template. This file is public (it is published with the app), so it holds
// NO personal figures: just the % Distribution structure with empty amounts.
// Your own starting figures live in "my-starting-data.json" on your computer;
// load them on your phone with Settings > Restore from backup.
import { monthKey } from './budget';

// kind: 'cap' = keep under this (the "<" in the Excel), 'target' = reach at least this (">")
export const TEMPLATE_LINES = [
  { id: 'petrol', group: 'fixed', name: 'Petrol', mode: 'amount', value: 0, kind: 'cap' },
  { id: 'install', group: 'fixed', name: 'Installment + family expenses', mode: 'amount', value: 0, kind: 'cap' },
  { id: 'invest', group: 'variable', name: 'Investment', mode: 'percent', value: 15, kind: 'target' },
  { id: 'eat', group: 'variable', name: 'Eat', mode: 'amount', value: 0, kind: 'cap' },
  { id: 'social', group: 'variable', name: 'Social + entertainment', mode: 'percent', value: 15, kind: 'cap' },
  { id: 'saving', group: 'free', name: 'Saving', mode: 'percent', value: 25, kind: 'target' },
  { id: 'growth', group: 'free', name: 'Growth', mode: 'percent', value: 30, kind: 'target' },
  { id: 'travel', group: 'free', name: 'Travel', mode: 'percent', value: 45, kind: 'target' },
];

export const TEMPLATE_INCOME = 0;

export const SEED_ASSETS = [
  { id: 'a-cash', name: 'Cash', group: 'cash', balance: 0, note: '' },
  { id: 'a-bank', name: 'Bank account', group: 'cash', balance: 0, note: '' },
  { id: 'a-ef', name: 'Emergency fund', group: 'reserve', balance: 0, note: 'Set aside, not for spending' },
  { id: 'a-invest', name: 'Investments', group: 'invest', balance: 0, note: '' },
];

export const SEED_SOURCES = ['Salary', 'Side income', 'Bonus'];

export function seedState() {
  return {
    version: 1,
    budgets: {
      [monthKey()]: { income: TEMPLATE_INCOME, lines: TEMPLATE_LINES.map((l) => ({ ...l })) },
    },
    transactions: [],
    assets: SEED_ASSETS.map((a) => ({ ...a })),
    assetSnapshots: {},
    finals: {},
    settings: { editAllAtClose: false },
    incomeSources: [...SEED_SOURCES],
  };
}
