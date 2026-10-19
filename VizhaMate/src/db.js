const DB_NAME = 'vizhamate-local'
const STORES = ['functions', 'persons', 'app_users', 'devices', 'gift_transactions', 'transaction_audit', 'import_batches', 'correction_requests', 'person_aliases']

export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      for (const name of STORES) {
        if (db.objectStoreNames.contains(name)) continue
        const store = db.createObjectStore(name, { keyPath: name === 'devices' ? 'device_id' : name === 'app_users' ? 'user_id' : name === 'functions' ? 'function_id' : name === 'persons' ? 'person_id' : name === 'gift_transactions' ? 'transaction_id' : name === 'transaction_audit' ? 'audit_id' : name === 'import_batches' ? 'batch_id' : name === 'correction_requests' ? 'request_id' : 'alias_id' })
        if (name === 'gift_transactions') {
          store.createIndex('function_id', 'function_id'); store.createIndex('person_id', 'person_id'); store.createIndex('recorder_id', 'recorder_id'); store.createIndex('status', 'status')
        }
        if (name === 'persons') store.createIndex('normalized_name', 'normalized_name')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function all(storeName) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName).objectStore(storeName).getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function put(storeName, value) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).put(value)
    tx.oncomplete = () => resolve(value)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function remove(storeName, key) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).delete(key)
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
}

export async function correctTransaction(transaction, audit) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['gift_transactions', 'transaction_audit'], 'readwrite')
    tx.objectStore('gift_transactions').put(transaction)
    tx.objectStore('transaction_audit').add(audit)
    tx.oncomplete = () => resolve(transaction)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function voidTransaction(transaction, audit) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['gift_transactions', 'transaction_audit'], 'readwrite')
    tx.objectStore('gift_transactions').put(transaction)
    tx.objectStore('transaction_audit').add(audit)
    tx.oncomplete = () => resolve(transaction)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function importTransactions(records, batch) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['functions', 'persons', 'app_users', 'gift_transactions', 'transaction_audit', 'correction_requests', 'import_batches'], 'readwrite')
    const transactionStore = tx.objectStore('gift_transactions')
    let added = 0
    const mergeById = (storeName, key, value) => {
      const store = tx.objectStore(storeName)
      const get = store.get(key)
      get.onsuccess = () => {
        if (!get.result) store.add(value)
        else if (JSON.stringify(get.result) !== JSON.stringify(value)) tx.abort()
      }
    }
    for (const person of batch.persons || []) mergeById('persons', person.person_id, person)
    for (const user of batch.users || []) mergeById('app_users', user.user_id, user)
    for (const fn of batch.functions || []) mergeById('functions', fn.function_id, fn)
    for (const item of batch.audit || []) mergeById('transaction_audit', item.audit_id, item)
    for (const item of batch.corrections || []) mergeById('correction_requests', item.request_id, item)
    for (const item of records) {
      const get = transactionStore.get(item.transaction_id)
      get.onsuccess = () => {
        if (!get.result) { transactionStore.add(item); added += 1 }
        else if (JSON.stringify(get.result) !== JSON.stringify(item)) tx.abort()
      }
    }
    const { persons, users, functions, audit, corrections, ...batchRecord } = batch
    tx.objectStore('import_batches').put({ ...batchRecord, imported_at: new Date().toISOString(), imported_count: records.length })
    tx.oncomplete = () => resolve(added)
    tx.onerror = () => reject(tx.error || new Error('Import failed'))
    tx.onabort = () => reject(new Error('Import contains a conflicting transaction ID. No records were imported.'))
  })
}
