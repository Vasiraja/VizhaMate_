# VizhaMate

An offline-first gift money record book for family functions. Records are stored in this browser using IndexedDB; there is no server or online sync.

## Run locally

1. Install Node.js.
2. In this folder, run `npm install`.
3. Run `npm run dev` and open the local address Vite prints.

## Using it across offline devices

Create the function on the admin device and use **Import / export → Export function records** to share its function ID and setup with recorders. (Each recorder should import the first function file before entering gifts.) Record gifts independently. At the end, export each device’s function file and import them on the admin device. Repeat imports skip matching transaction IDs. Make a full backup before merging.

## Local data model

The versioned IndexedDB database has stores for functions, persons, local profiles, devices, gift transactions, transaction audit, import batches, correction requests, and person aliases. Amounts are stored as integer paise. Transactions use UUIDs and voiding keeps the original record in history.

## Limitations

Separate browsers do not share data; transfer is by JSON export and import. Browser data can be cleared or lost with the browser profile, so keep backups. Profiles are workflow labels, not authentication. Functions have no automatic cloud sync, and this app cannot enforce role security against someone with access to the browser data.
