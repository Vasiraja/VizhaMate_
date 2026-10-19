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

Ledger records are stored in the current browser origin's IndexedDB database named `vizhaMateDb`. They are not synced to a server.
