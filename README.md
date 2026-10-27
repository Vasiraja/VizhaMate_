# VizhaMate

VizhaMate is a browser-based gift ledger for managing event functions, guest details, gift entries, and recorder summaries.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## Run Locally

```sh
npm install
npm run dev
```

## Checks

```sh
npm test
npm run lint
npm run build
```

Tests use Node's built-in test runner. Lint may report React purity warnings for existing date creation in transaction handlers.

## Project Layout

- `src/App.jsx` owns application state, IndexedDB orchestration, and screen navigation.
- `src/components/` contains the address, management, gift-entry, transaction-table, and history views.
- `src/db/database.js` creates and reads the browser's IndexedDB stores.
- `src/utils/` contains money, validation, gift-entry, and ledger calculations with focused tests.
- `public/data/tamil-nadu-localities.json.gz` provides offline address suggestions. It lists postal localities and is not an exhaustive village registry; custom locality names are supported.

Ledger records are stored in the current browser origin's IndexedDB database named `vizhaMateDb`. The app works offline and does not sync to a server.

## Offline transfer and backup

- Use **Import / Export** to download the selected function as an Excel-compatible CSV file, or **Settings** to download a full local backup.
- Open the CSV in Microsoft Excel to review its rows. Keep the `record_json` column unchanged so the app can restore every field, including nested gift denomination details.
- On another device, use **Import / Export** to select one or more VizhaMate CSV files. The app merges new functions, users, guests, gifts, and audit records into that device's local database. Existing records with the same ID are skipped when identical; conflicting IDs are left unchanged.
- Imported guest records are immediately available to offline guest-name suggestions. No internet connection or online database is required.
