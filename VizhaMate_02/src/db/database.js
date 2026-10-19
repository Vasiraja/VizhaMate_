const DATABASE_NAME = 'vizhamate-local';
const DATABASE_VERSION = 1;

const STORE_NAMES = [
    'functions',
    'persons',
    'app_users',
    'devices',
    'gift_transactions',
    'transaction_audit',
    'import_batches',
    'correction_requests',
    'person_aliases',
];

const STORE_KEYS = {
    functions: 'function_id',
    persons: 'person_id',
    app_users: 'user_id',
    devices: 'device_id',
    gift_transactions: 'transaction_id',
    transaction_audit: 'audit_id',
    import_batches: 'import_id',
    correction_requests: 'request_id',
    person_aliases: 'alias_id',
};

let databasePromise;

function createIndex(store, name, keyPath, options) {
    if (!store.indexNames.contains(name)) store.createIndex(name, keyPath, options);
}

export function openDatabase() {
    if (!databasePromise) {
        databasePromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

            request.onupgradeneeded = () => {
                const database = request.result;
                for (const storeName of STORE_NAMES) {
                    const store = database.objectStoreNames.contains(storeName)
                        ? request.transaction.objectStore(storeName)
                        : database.createObjectStore(storeName, { keyPath: STORE_KEYS[storeName] });

                    if (storeName === 'persons') createIndex(store, 'normalized_name', 'normalized_name');
                    if (storeName === 'gift_transactions') {
                        createIndex(store, 'function_id', 'function_id');
                        createIndex(store, 'person_id', 'person_id');
                        createIndex(store, 'recorder_id', 'recorder_id');
                        createIndex(store, 'status', 'status');
                        createIndex(store, 'function_person', ['function_id', 'person_id']);
                    }
                    if (storeName === 'transaction_audit') createIndex(store, 'transaction_id', 'transaction_id');
                    if (storeName === 'correction_requests') createIndex(store, 'status', 'status');
                }
            };

            request.onsuccess = () => {
                const database = request.result;
                database.onversionchange = () => database.close();
                resolve(database);
            };
            request.onerror = () => reject(request.error || new Error('Could not open local storage.'));
            request.onblocked = () => reject(new Error('Close other VizhaMate tabs to update local storage.'));
        }).catch((error) => {
            databasePromise = undefined;
            throw error;
        });
    }
    return databasePromise;
}

function requestResult(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function getAll(storeName) {
    const database = await openDatabase();
    const transaction = database.transaction(storeName, 'readonly');
    return requestResult(transaction.objectStore(storeName).getAll());
}

export async function getById(storeName, id) {
    const database = await openDatabase();
    const transaction = database.transaction(storeName, 'readonly');
    return requestResult(transaction.objectStore(storeName).get(id));
}

export async function getByIndex(storeName, indexName, value) {
    const database = await openDatabase();
    const transaction = database.transaction(storeName, 'readonly');
    return requestResult(transaction.objectStore(storeName).index(indexName).getAll(value));
}

export async function saveRecord(storeName, record) {
    const database = await openDatabase();
    const transaction = database.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).put(record);
    await transactionDone(transaction);
    window.dispatchEvent(new Event('vizha-data-changed'));
    return record;
}

export function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error || new Error('The database change was cancelled.'));
        transaction.onerror = () => reject(transaction.error || new Error('Could not save the database change.'));
    });
}

export async function getDeviceId() {
    const database = await openDatabase();
    const read = database.transaction('devices', 'readonly');
    const devices = await requestResult(read.objectStore('devices').getAll());
    if (devices.length) return devices[0].device_id;

    const device = {
        device_id: crypto.randomUUID(),
        label: navigator.userAgentData?.platform || navigator.platform || 'This device',
        created_at: new Date().toISOString(),
    };
    const write = database.transaction('devices', 'readwrite');
    write.objectStore('devices').add(device);
    await transactionDone(write);
    return device.device_id;
}

export async function saveGiftTransaction({ transaction, person }) {
    const database = await openDatabase();
    const write = database.transaction(['gift_transactions', 'persons'], 'readwrite');
    if (person) write.objectStore('persons').put(person);
    write.objectStore('gift_transactions').add(transaction);
    await transactionDone(write);
    window.dispatchEvent(new Event('vizha-data-changed'));
}

export async function requestCorrection(request) {
    await saveRecord('correction_requests', request);
}

export async function resolveCorrection({ request, transaction, audit }) {
    const database = await openDatabase();
    const write = database.transaction(['gift_transactions', 'transaction_audit', 'correction_requests'], 'readwrite');
    write.objectStore('gift_transactions').put(transaction);
    write.objectStore('transaction_audit').add(audit);
    write.objectStore('correction_requests').put({ ...request, status: 'approved', reviewed_at: new Date().toISOString() });
    await transactionDone(write);
    window.dispatchEvent(new Event('vizha-data-changed'));
}

export async function rejectCorrection(request, reviewedBy) {
    await saveRecord('correction_requests', {
        ...request,
        status: 'rejected',
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
    });
}

export async function voidTransaction({ transaction, audit }) {
    const database = await openDatabase();
    const write = database.transaction(['gift_transactions', 'transaction_audit'], 'readwrite');
    write.objectStore('gift_transactions').put(transaction);
    write.objectStore('transaction_audit').add(audit);
    await transactionDone(write);
    window.dispatchEvent(new Event('vizha-data-changed'));
}

export async function markDuplicatesReviewed({ transactions, reviewer, reason }) {
    const database = await openDatabase();
    const write = database.transaction(['gift_transactions', 'transaction_audit'], 'readwrite');
    const transactionStore = write.objectStore('gift_transactions');
    const auditStore = write.objectStore('transaction_audit');
    const now = new Date().toISOString();
    for (const item of transactions) {
        transactionStore.put({ ...item, duplicate_review: 'reviewed-separate-gifts', updated_at: now, version: (item.version || 1) + 1 });
        auditStore.add({
            audit_id: crypto.randomUUID(), transaction_id: item.transaction_id, action: 'duplicate-review',
            old_value: { duplicate_review: item.duplicate_review || 'not-reviewed' },
            new_value: { duplicate_review: 'reviewed-separate-gifts' }, changed_by: reviewer, changed_at: now, reason,
        });
    }
    await transactionDone(write);
    window.dispatchEvent(new Event('vizha-data-changed'));
}

export async function importTransfer({ people, users, transactions, audits, requests, batch }) {
    const [existingPeople, existingUsers, existingAudits, existingRequests] = await Promise.all([
        getAll('persons'), getAll('app_users'), getAll('transaction_audit'), getAll('correction_requests'),
    ]);
    const personIds = new Set(existingPeople.map((item) => item.person_id));
    const userIds = new Set(existingUsers.map((item) => item.user_id));
    const auditIds = new Set(existingAudits.map((item) => item.audit_id));
    const requestIds = new Set(existingRequests.map((item) => item.request_id));
    const database = await openDatabase();
    const stores = ['persons', 'app_users', 'gift_transactions', 'transaction_audit', 'correction_requests', 'import_batches'];
    const write = database.transaction(stores, 'readwrite');
    const transactionStore = write.objectStore('gift_transactions');
    const auditStore = write.objectStore('transaction_audit');
    const requestStore = write.objectStore('correction_requests');
    const personStore = write.objectStore('persons');
    const userStore = write.objectStore('app_users');

    for (const person of people) if (!personIds.has(person.person_id)) personStore.add(person);
    for (const user of users) if (!userIds.has(user.user_id)) userStore.add(user);
    for (const item of transactions) transactionStore.add(item);
    for (const item of audits) if (!auditIds.has(item.audit_id)) auditStore.add(item);
    for (const item of requests) if (!requestIds.has(item.request_id)) requestStore.add(item);
    write.objectStore('import_batches').add(batch);
    await transactionDone(write);
    window.dispatchEvent(new Event('vizha-data-changed'));
}