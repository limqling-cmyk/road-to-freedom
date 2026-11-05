# Road to freedom

A personal money app for Android and iPhone. Everything is saved on your phone only, in a small SQLite database inside the app. There is no account, no cloud and no internet needed.

## The five tabs (plus Settings)

**Overview** is a one-page yearly summary. Use ‹ › to change the year. It shows income, spent, free allocation and net worth tiles, a month-by-month stacked chart (tap a month to see its figures; faded bars are months not closed yet), and where the year's money went by item with % of income. It also has a shortcut to close the month, and a ⚙ button for Settings.

**Settings** (⚙ on Overview) has the month-end switch "Allow editing everything at month end", plus Backup, Restore and Reset.

**Close month (final allocation)** is where you decide, at month end, where the leftover money goes. Income, fixed and variable always come from your Records and cannot be changed here; to change them, fix the records. You only split what remains across free allocation, by RM or %, starting from your plan's split. If you ever need an ending adjustment, switch on "Allow editing everything at month end" in Settings and those figures become editable too. Saving stores it as that month's final, for example Nov 2026. December then runs on its own plan and gets its own final when you close it. You can adjust a final later or reopen the month.

**History** lists every month with just its final allocation (fixed / variable / free / unallocated). Tap a month to see Estimate, Actual and Final side by side for every item. **Export PDF** lets you tick several months at once (shortcuts: Last 3, Last 6, this year, All) and choose:
- **Summary only**: one page with each month's final allocation side by side, totals, monthly averages and share of income.
- **Full statements**: the summary page, followed by a full statement for each month (estimate, actual, final, records and assets).

**Plan (% Distribution)** is your Excel tab rebuilt. The yellow boxes are the ones you adjust. You can set each item as **RM** or as **%**, and switching between them keeps the same amount of money. The calculation follows the same chain as the sheet:

1. Fixed Cost. A % here is a % of income.
2. Variable Cost. A % here is a % of income after fixed cost (D9 in the Excel).
3. Free Allocation. A % here is a % of what is left after variable cost (D15). Make these add up to 100%.

Each item also shows its share of total income (column B in the Excel). Tap "Keep under" or "Reach at least" to switch between a limit, like the "<" in your sheet, and a goal, like ">". Use "Edit items" to rename, reorder or delete items, and "+ Add" to create new ones.

Each month has its own plan. A new month starts from the previous month's plan, and the first change you make saves it as that month's own plan.

**Records (Actual)** is where you type in what really happened. New records start on today's date; tap the date to open a calendar and pick another day, or use the Today / Yesterday buttons. For income, use **Edit list** to delete sources or the Add box to create new ones (Salary, Bonus…); you can also manage the list in Settings. The **Chart** option next to All / Income / Expenses shows where income came from and which items took the most money, biggest first, with the plan marked on each bar. An income record has a source (Salary, Bonus…) and a "Not paid yet" switch, for money you are still waiting for. An expense record is tagged to one of your plan items, so money moved into Saving, Growth or Travel counts against Free Allocation. To edit or delete a record, tap it.

**Assets** has **Cumulative totals** at the bottom, for this year or all time: total income by source, and the running total for every item (investment, saving, growth, travel, eat…) with % of income. It also covers Cash & bank, Set aside (the emergency fund, which is taken off the cash you can use) and Investments. Net worth = cash & bank + investments. Each time you update a balance, that month's snapshot is kept so past statements show the balances from that time.

## Gestures

- **Swipe down** on any pop-up (new income/expense, asset, export, Close month, Settings) to cancel it, same as tapping Cancel. Tapping the dark area above a pop-up also closes it.
- **Swipe left / right on the green top bar** to change month (Plan, Records) or year (Overview).
- **Swipe left / right on the page** to move between tabs: Overview ⇄ Plan ⇄ Records ⇄ History ⇄ Assets.
- In a **History month detail**, swipe right to go back to the History list.
- Pages move with your finger: tabs slide left/right (also when you tap a tab), a new month or year slides in from the side you swiped toward, History details slide in and out, and pop-ups slide down when you pull them.
- **History** has year buttons to filter the list and a **📅 Find month** grid to jump straight to any month.

## Publish free on GitHub (Android + iPhone, add to home screen)

The app can run as a website that you add to your phone's home screen. It then opens full screen with its own icon, works offline, and keeps all data on the phone. No Google or Apple account fee is needed.

1. Create a **public** repository on github.com named `road-to-freedom`. Free GitHub Pages needs public, which is fine: there are no personal figures in this code.
2. Upload the contents of this `app` folder to it, **without** `node_modules` (GitHub Desktop or "Add file > Upload files"; the `.gitignore` keeps `node_modules`, backups and Excel files out). Make sure the hidden `.github` folder is included.
3. In the repository: **Settings > Pages > Build and deployment > Source: GitHub Actions**.
4. Open the **Actions** tab and wait for "Publish app to GitHub Pages" to turn green (about 2 to 3 minutes). Your app is at `https://<your-github-name>.github.io/road-to-freedom/`. If it did not start by itself, open the workflow and click **Run workflow**.
5. On the phone, open that link:
   - **iPhone (Safari):** Share button > **Add to Home Screen**.
   - **Android (Chrome):** ⋮ menu > **Add to Home screen** / **Install app**.
6. Open Road to freedom from the home screen, go to ⚙ Settings > **Restore from backup**, and pick `my-starting-data.json` (kept on your computer, never uploaded; send it to your phone by email, WhatsApp or Google Drive). Your starting figures appear.

Updates: change the code, upload again, and the site rebuilds by itself. Phones pick up the new version the next time the app is opened with internet.

Good to know for the web version:
- **Data** lives in that phone's browser storage for the app. Deleting the home-screen app or clearing Safari/Chrome website data erases it, so use **Backup data** in Settings regularly.
- **PDF:** Export opens the print screen; choose **Save as PDF** (Android) or the share button **Save to Files** (iPhone).
- Each person who installs it gets their own empty app; nobody can see anyone else's data.

## Run it on your phone (no app store needed)

You need Node.js on your computer (version 20 or newer).

```bash
cd "C:\Project\Road to free\app"
npm install
npx expo start
```

1. On your phone, install **Expo Go** from the Play Store or App Store.
2. Make sure your phone and computer are on the same Wi-Fi network.
3. Scan the QR code that appears in the terminal. On iPhone, use the Camera app. On Android, scan from inside Expo Go.

To get a quick look in your computer's browser, run `npx expo start --web`. The browser version saves to the browser instead of SQLite and is only for previewing.

## Install it as a real app (optional, later)

Expo's build service turns this project into an installable app:

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview   # gives you an .apk to install directly
eas build -p ios                         # needs an Apple Developer account (USD 99/year)
```

## Keep your data safe

Your data lives on this phone only, so if you delete the app or lose the phone, the data goes with it. Every so often, tap **Backup data** on Overview and save the file to Google Drive, iCloud Drive or your email. **Restore** loads a backup file back in, including on a new phone.

## Where things are in the code

| File | What it does |
|---|---|
| `src/budget.js` | The % Distribution formulas, actual-vs-estimate totals and asset totals |
| `src/seed.js` | The empty starting template (public, no personal figures). Your own figures are in `my-starting-data.json` outside this folder |
| `src/screens/*` | The tabs, the Close month editor and History |
| `src/screens/CloseMonth.js` | Month-end final allocation editor |
| `src/statement.js` | PDF layouts: summary report and monthly statements |
| `src/storage.js` | On-phone SQLite storage |
| `src/backup.js` | Backup and restore |
