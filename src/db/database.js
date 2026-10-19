const DB_NAME = 'vizhaMateDb'
const DB_VERSION = 1

export async function initDatabase() {
    return new Promise((resolve, reject) => {
        const openRequest = indexedDB.open(DB_NAME, DB_VERSION)

        openRequest.onupgradeneeded = (event) => {
            const database = event.target.result

            const stores = [
                { name: 'functions', keyPath: 'function_id' },
                { name: 'persons', keyPath: 'person_id' },
                { name: 'app_users', keyPath: 'user_id' },
                { name: 'devices', keyPath: 'device_id' },
                { name: 'gift_transactions', keyPath: 'transaction_id' },
                { name: 'transaction_audit', keyPath: 'audit_id' },
                { name: 'import_batches', keyPath: 'batch_id' },
                { name: 'correction_requests', keyPath: 'request_id' },
                { name: 'person_aliases', keyPath: 'alias_id' },
            ]

            stores.forEach(({ name, keyPath }) => {
                if (!database.objectStoreNames.contains(name)) {
                    const objectStore = database.createObjectStore(name, { keyPath })

                    if (name === 'functions') {
                        objectStore.createIndex('byStatus', 'status', { unique: false })
                    }

                    if (name === 'persons') {
                        objectStore.createIndex('byNormalizedName', 'normalized_name', { unique: false })
                    }

                    if (name === 'gift_transactions') {
                        objectStore.createIndex('byFunctionId', 'function_id', { unique: false })
                        objectStore.createIndex('byPersonId', 'person_id', { unique: false })
                        objectStore.createIndex('byRecorderId', 'recorder_id', { unique: false })
                        objectStore.createIndex('byStatus', 'status', { unique: false })
                        objectStore.createIndex('byCreatedAt', 'created_at', { unique: false })
                    }

                    if (name === 'transaction_audit') {
                        objectStore.createIndex('byTransactionId', 'transaction_id', { unique: false })
                    }

                    if (name === 'import_batches') {
                        objectStore.createIndex('byFunctionId', 'function_id', { unique: false })
                    }
                }
            })
        }

        openRequest.onsuccess = () => resolve(openRequest.result)
        openRequest.onerror = () => reject(new Error('Failed to open IndexedDB database.'))
    })
}

export async function listAll(storeName) {
    const database = await initDatabase()

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readonly')
        const objectStore = transaction.objectStore(storeName)
        const request = objectStore.getAll()
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(new Error(`Unable to read ${storeName}.`))
    })
}

export async function saveRecord(storeName, record) {
    const database = await initDatabase()

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite')
        const objectStore = transaction.objectStore(storeName)
        const request = objectStore.put(record)

        request.onsuccess = () => resolve(record)
        request.onerror = () => reject(new Error(`Unable to save ${storeName}.`))
    })
}

export async function deleteRecord(storeName, key) {
    const database = await initDatabase()

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite')
        const objectStore = transaction.objectStore(storeName)
        const request = objectStore.delete(key)

        transaction.oncomplete = () => resolve(true)
        transaction.onerror = () => reject(new Error(`Unable to delete ${storeName}.`))
        transaction.onabort = () => reject(new Error(`Unable to delete ${storeName}.`))
        request.onerror = () => reject(new Error(`Unable to delete ${storeName}.`))
    })
}

export async function getByKey(storeName, id) {
    const database = await initDatabase()

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readonly')
        const objectStore = transaction.objectStore(storeName)
        const request = objectStore.get(id)

        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(new Error(`Unable to fetch ${storeName}.`))
    })
}

export async function executeBulkWrite(work) {
    const database = await initDatabase()

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(
            [
                'functions',
                'persons',
                'app_users',
                'devices',
                'gift_transactions',
                'transaction_audit',
                'import_batches',
                'correction_requests',
                'person_aliases',
            ],
            'readwrite'
        )

        try {
            work(transaction)
        } catch (error) {
            transaction.abort()
            reject(error)
            return
        }

        transaction.oncomplete = () => resolve(true)
        transaction.onerror = () => reject(new Error('Database write failed.'))
        transaction.onabort = () => reject(new Error('The import transaction was aborted.'))
    })
}

export function uuid() {
    return crypto.randomUUID()
}
